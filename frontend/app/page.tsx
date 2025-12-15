"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { supabase } from "../lib/supabase";
import { User } from "@supabase/supabase-js";
import { Toaster, toast } from 'react-hot-toast';

// 👇 배포된 주소 (그대로 유지)
const API_URL = "https://ai-link-archive.onrender.com";
const SITE_URL = "https://ai-link-archive.vercel.app";

interface LinkItem {
  id: number;
  user_id: string; // 누가 쓴 글인지 구별하기 위해 추가
  url: string;
  title: string;
  summary: string;
  memo: string;
  category: string;
  tags: string;
}

interface ChatMsg {
  sender: string;
  message: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [viewMode, setViewMode] = useState<'my' | 'explore'>('my');

  const [inputUrl, setInputUrl] = useState("");
  const [loading, setLoading] = useState(false);
  
  // 🔍 검색을 위한 상태 추가
  const [searchTerm, setSearchTerm] = useState(""); 

  const [chatLinkId, setChatLinkId] = useState<number | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState({ title: "", memo: "", category: "" });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
      if (session?.user) toast.success("로그인되었습니다!");
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (user) fetchLinks(); }, [user, viewMode]);
  
  useEffect(() => { 
    // 다크모드 시스템 설정 자동 감지 및 적용
    if (darkMode) document.documentElement.classList.add("dark"); 
    else document.documentElement.classList.remove("dark"); 
  }, [darkMode]);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({ 
      provider: 'google', 
      options: { redirectTo: SITE_URL } 
    });
  };

  const handleLogout = async () => { await supabase.auth.signOut(); toast.success("로그아웃되었습니다."); };

  const fetchLinks = async () => {
    try {
      let res;
      if (viewMode === 'my' && user) {
        res = await axios.get(`${API_URL}/links?user_id=${user.id}`);
        setLinks(res.data.links || []);
      } else {
        res = await axios.get(`${API_URL}/explore`);
        setLinks(res.data || []);
      }
    } catch (e) {
      console.error("데이터 불러오기 실패:", e);
      setLinks([]);
    }
  };

  const handleSubmit = async () => {
    if (!inputUrl || !user) return;
    setLoading(true);
    const loadingToast = toast.loading("AI가 분석 중입니다...");

    try { 
      await axios.post(`${API_URL}/links`, { url: inputUrl, user_id: user.id }); 
      setInputUrl(""); 
      if (viewMode === 'my') fetchLinks(); // 내 아카이브일 때만 새로고침
      toast.success("저장 성공!", { id: loadingToast });
    } 
    catch { 
      toast.error("저장 실패", { id: loadingToast });
    } finally { setLoading(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !user) return;
    const formData = new FormData();
    formData.append("file", e.target.files[0]);
    formData.append("user_id", user.id);
    
    setLoading(true);
    const loadingToast = toast.loading("파일 분석 중...");

    try { 
      await axios.post(`${API_URL}/upload`, formData); 
      if (viewMode === 'my') fetchLinks();
      toast.success("업로드 성공!", { id: loadingToast });
    } catch {
      toast.error("업로드 실패", { id: loadingToast });
    }
    finally { setLoading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  // 📥 [퍼가기] 기능: 남의 글을 내 것으로 복사
  const handleScrap = async (link: LinkItem) => {
    if (!user) return toast.error("로그인이 필요합니다.");
    if (confirm("이 링크를 '나의 아카이브'로 가져오시겠습니까?")) {
      const loadingToast = toast.loading("가져오는 중...");
      try {
        // 기존 분석 데이터를 그대로 내 ID로 저장
        await axios.post(`${API_URL}/links`, { 
          url: link.url, 
          user_id: user.id,
          // (백엔드가 이미 분석된 URL이면 빨리 처리하도록 되어 있다고 가정)
        });
        toast.success("내 아카이브에 저장되었습니다!", { id: loadingToast });
      } catch {
        toast.error("가져오기 실패", { id: loadingToast });
      }
    }
  };

  // ... (수정, 채팅, 삭제 함수는 기존과 동일)
  const startEdit = (link: LinkItem) => {
    setEditingId(link.id);
    setEditData({ title: link.title, memo: link.memo, category: link.category });
  };
  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await axios.put(`${API_URL}/links/${editingId}`, editData);
      setEditingId(null);
      fetchLinks();
      toast.success("수정되었습니다.");
    } catch { toast.error("수정 실패"); }
  };
  const openChat = async (id: number) => {
    if (chatLinkId === id) { setChatLinkId(null); return; }
    setChatLinkId(id); setChatHistory([]);
    try { 
      const res = await axios.get(`${API_URL}/links/${id}/chat`); 
      setChatHistory(res.data); 
    } catch {}
  };
  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuestion) return;
    const tempMsg = { sender: 'user', message: chatQuestion };
    setChatHistory(prev => [...prev, tempMsg]); setChatQuestion(""); setChatLoading(true);
    try {
      const res = await axios.post(`${API_URL}/links/${chatLinkId}/chat`, { question: tempMsg.message });
      setChatHistory(prev => [...prev, { sender: 'ai', message: res.data.answer }]);
    } catch { setChatHistory(prev => [...prev, { sender: 'ai', message: "오류 발생" }]); } 
    finally { setChatLoading(false); }
  };
  const handleDelete = async (id: number) => { 
    if (confirm("정말 삭제하시겠습니까?")) { 
      await axios.delete(`${API_URL}/links/${id}`); 
      toast.success("삭제되었습니다."); 
      fetchLinks(); 
    } 
  };

  // 🔎 검색 필터링 로직
  const filteredLinks = links.filter(link => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      link.title?.toLowerCase().includes(term) ||
      link.summary?.toLowerCase().includes(term) ||
      link.tags?.toLowerCase().includes(term)
    );
  });

  if (!user) return ( <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-slate-900 transition-colors"><button onClick={handleLogin} className="bg-black text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:scale-105 transition">Google 계정으로 시작하기</button></div> );

  return (
    <div className={`min-h-screen p-4 md:p-6 transition-colors duration-300 ${darkMode ? 'bg-slate-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <Toaster position="top-center" reverseOrder={false} />

      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
           <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">AI Link Archive</h1>
           <div className="flex gap-2">
             <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded bg-gray-200 dark:bg-slate-700 hover:opacity-80 transition">{darkMode ? "☀️" : "🌙"}</button>
             <button onClick={handleLogout} className="text-sm underline hover:text-red-500 ml-2">로그아웃</button>
           </div>
        </div>

        {/* 탭 메뉴 */}
        <div className="flex gap-6 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button onClick={() => setViewMode('my')} className={`pb-2 font-bold text-lg transition ${viewMode === 'my' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>🏠 나의 아카이브</button>
          <button onClick={() => setViewMode('explore')} className={`pb-2 font-bold text-lg transition ${viewMode === 'explore' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>🌏 모두의 탐색</button>
        </div>

        {/* 🏠 나의 아카이브 모드: 입력창 표시 */}
        {viewMode === 'my' && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg mb-6 border dark:border-slate-700">
            <div className="flex flex-col md:flex-row gap-2 mb-3">
              <input placeholder="URL 입력 (AI 자동 분석)..." className="flex-1 p-3 rounded border dark:bg-slate-900 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none transition text-gray-900 dark:text-gray-100" value={inputUrl} onChange={(e) => setInputUrl(e.target.value)} />
              <button onClick={handleSubmit} disabled={loading} className="bg-indigo-600 text-white px-6 py-3 rounded font-bold disabled:opacity-50 hover:bg-indigo-700 transition">{loading ? "분석 중..." : "추가"}</button>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
               <span>파일(PDF/Word):</span>
               <input type="file" accept=".pdf,.docx" ref={fileInputRef} onChange={handleFileUpload} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-slate-700 dark:file:text-gray-300"/>
            </div>
          </div>
        )}

        {/* 🌏 모두의 탐색 모드: 검색창 표시 */}
        {viewMode === 'explore' && (
          <div className="mb-6">
            <input 
              placeholder="🔍 관심 있는 키워드 검색 (예: 뉴스, IT, 헬스케어)..." 
              className="w-full p-4 rounded-xl shadow border border-indigo-100 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-gray-100 transition"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}

        {/* 리스트 출력 */}
        <div className="space-y-4">
          {filteredLinks.length === 0 && <p className="text-center text-gray-400 py-10">데이터가 없습니다.</p>}
          
          {filteredLinks.map((link) => (
            <div key={link.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow border dark:border-slate-700 hover:shadow-md transition">
              
              {editingId === link.id ? (
                // 수정 모드
                <div className="space-y-3">
                  <input className="w-full p-2 border rounded dark:bg-slate-700 text-gray-900 dark:text-gray-100" value={editData.title} onChange={(e) => setEditData({...editData, title: e.target.value})} placeholder="제목" />
                  <textarea className="w-full p-2 border rounded h-20 dark:bg-slate-700 text-gray-900 dark:text-gray-100" value={editData.memo} onChange={(e) => setEditData({...editData, memo: e.target.value})} placeholder="메모 입력..." />
                  <div className="flex justify-end gap-2">
                    <button onClick={saveEdit} className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600">저장</button>
                    <button onClick={() => setEditingId(null)} className="bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500">취소</button>
                  </div>
                </div>
              ) : (
                // 일반 보기 모드
                <>
                  <div className="flex justify-between mb-3 items-start gap-4">
                     <div className="flex-1 min-w-0">
                        <span className="inline-block text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/50 px-2 py-1 rounded mb-2 mr-2">{link.category}</span>
                        {/* 👇 여기가 수정된 부분 (글씨 색상 강제 지정) */}
                        <a href={link.url} target="_blank" className="font-bold text-xl hover:text-indigo-500 transition break-words text-gray-900 dark:text-gray-100 block">
                          {link.title || "제목 없음"}
                        </a>
                     </div>
                     
                     <div className="flex gap-2 shrink-0">
                       {viewMode === 'my' ? (
                         // 내 글일 때: 수정/삭제 버튼
                         <>
                           <button onClick={() => startEdit(link)} className="p-2 text-gray-400 hover:text-indigo-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition">✏️</button>
                           <button onClick={() => handleDelete(link.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition">🗑️</button>
                         </>
                       ) : (
                         // 남의 글일 때: 퍼가기 버튼 (스크랩)
                         <button onClick={() => handleScrap(link)} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-bold hover:bg-indigo-200 dark:hover:bg-indigo-800 transition">
                           📥 가져오기
                         </button>
                       )}
                     </div>
                  </div>
                  
                  <div className="p-4 bg-gray-50 dark:bg-slate-700/30 rounded-lg mb-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                    <span className="font-bold text-indigo-500 mr-2">AI 요약</span>{link.summary}
                  </div>

                  {link.memo && (
                    <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/10 text-gray-700 dark:text-gray-300 rounded-lg text-sm border border-yellow-100 dark:border-yellow-900/30 flex items-start gap-2">
                      <span className="mt-0.5">📝</span>
                      <span>{link.memo}</span>
                    </div>
                  )}

                  {link.tags && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {link.tags.split(',').map((tag, i) => tag.trim() && <span key={i} className="text-xs bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-600">#{tag.trim()}</span>)}
                    </div>
                  )}

                  <button onClick={() => openChat(link.id)} className="w-full py-2.5 bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-gray-300 rounded-lg font-bold hover:bg-indigo-100 dark:hover:bg-slate-600 transition flex justify-center items-center gap-2">
                    {chatLinkId === link.id ? "접기" : "💬 AI에게 질문하기"}
                  </button>

                  {/* 채팅창 (기존과 동일) */}
                  {chatLinkId === link.id && (
                    <div className="mt-4 p-4 bg-indigo-50 dark:bg-slate-900 rounded-lg border dark:border-slate-600 animate-fade-in">
                      <div className="max-h-60 overflow-y-auto mb-4 space-y-2 p-2 scrollbar-thin">
                        {chatHistory.length === 0 && <p className="text-center text-gray-400 text-sm">기록이 없습니다.</p>}
                        {chatHistory.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 shadow rounded-bl-none'}`}>
                               {msg.message}
                            </div>
                          </div>
                        ))}
                      </div>
                      <form onSubmit={handleChat} className="flex gap-2">
                        <input className="flex-1 p-3 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100" value={chatQuestion} onChange={(e) => setChatQuestion(e.target.value)} placeholder="질문 입력..." />
                        <button disabled={chatLoading} className="bg-indigo-600 text-white px-4 rounded-lg text-sm hover:bg-indigo-700 transition font-bold">전송</button>
                      </form>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}