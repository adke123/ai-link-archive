"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { supabase } from "../lib/supabase";
import { User } from "@supabase/supabase-js";
import { Toaster, toast } from 'react-hot-toast';

// 👇 여기에 배포된 주소들을 적어줍니다 (가장 중요!)
const API_URL = "https://ai-link-archive.onrender.com"; // Render 백엔드 주소
const SITE_URL = "https://ai-link-archive.vercel.app";  // Vercel 프론트 주소

interface LinkItem {
  id: number;
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
    if (darkMode) document.documentElement.classList.add("dark"); 
    else document.documentElement.classList.remove("dark"); 
  }, [darkMode]);

  // 👇 로그인 함수 수정 (리다이렉트 주소 명시)
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
        // 👇 API_URL 사용
        res = await axios.get(`${API_URL}/links?user_id=${user.id}`);
        // 안전장치 추가: 데이터가 없으면 빈 배열 []
        setLinks(res.data.links || []);
      } else {
        // 👇 API_URL 사용
        res = await axios.get(`${API_URL}/explore`);
        setLinks(res.data || []);
      }
    } catch (e) {
      console.error("데이터 불러오기 실패:", e);
      setLinks([]); // 에러나면 빈 화면 보여주기 (앱 죽는 것 방지)
    }
  };

  const handleSubmit = async () => {
    if (!inputUrl || !user) return;
    setLoading(true);
    const loadingToast = toast.loading("AI가 분석 중입니다...");

    try { 
      // 👇 API_URL 사용
      await axios.post(`${API_URL}/links`, { url: inputUrl, user_id: user.id }); 
      setInputUrl(""); 
      fetchLinks(); 
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
      // 👇 API_URL 사용
      await axios.post(`${API_URL}/upload`, formData); 
      fetchLinks(); 
      toast.success("업로드 성공!", { id: loadingToast });
    } catch {
      toast.error("업로드 실패", { id: loadingToast });
    }
    finally { setLoading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const startEdit = (link: LinkItem) => {
    setEditingId(link.id);
    setEditData({ title: link.title, memo: link.memo, category: link.category });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      // 👇 API_URL 사용
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
      // 👇 API_URL 사용
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
      // 👇 API_URL 사용
      const res = await axios.post(`${API_URL}/links/${chatLinkId}/chat`, { question: tempMsg.message });
      setChatHistory(prev => [...prev, { sender: 'ai', message: res.data.answer }]);
    } catch { setChatHistory(prev => [...prev, { sender: 'ai', message: "오류 발생" }]); } 
    finally { setChatLoading(false); }
  };

  const handleDelete = async (id: number) => { 
    if (confirm("정말 삭제하시겠습니까?")) { 
      // 👇 API_URL 사용
      await axios.delete(`${API_URL}/links/${id}`); 
      toast.success("삭제되었습니다."); 
      fetchLinks(); 
    } 
  };

  if (!user) return ( <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-slate-900 transition-colors"><button onClick={handleLogin} className="bg-black text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:scale-105 transition">Google 계정으로 시작하기</button></div> );

  return (
    <div className={`min-h-screen p-6 transition-colors duration-300 ${darkMode ? 'bg-slate-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <Toaster position="top-center" reverseOrder={false} />

      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
           <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">AI Link Archive</h1>
           <div className="flex gap-2"><button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-slate-700">{darkMode ? "☀️" : "🌙"}</button><button onClick={handleLogout} className="text-sm underline hover:text-red-500">로그아웃</button></div>
        </div>

        <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button onClick={() => setViewMode('my')} className={`pb-2 font-bold text-lg ${viewMode === 'my' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>🏠 나의 아카이브</button>
          <button onClick={() => setViewMode('explore')} className={`pb-2 font-bold text-lg ${viewMode === 'explore' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>🌏 모두의 탐색</button>
        </div>

        {viewMode === 'my' && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg mb-6 border dark:border-slate-700">
            <div className="flex gap-2 mb-3">
              <input placeholder="URL 입력 (AI 자동 분석)..." className="flex-1 p-3 rounded border dark:bg-slate-900 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none" value={inputUrl} onChange={(e) => setInputUrl(e.target.value)} />
              <button onClick={handleSubmit} disabled={loading} className="bg-indigo-600 text-white px-6 rounded font-bold disabled:opacity-50 hover:bg-indigo-700 transition">{loading ? "..." : "추가"}</button>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
               <span>또는 파일(PDF/Word):</span>
               <input type="file" accept=".pdf,.docx" ref={fileInputRef} onChange={handleFileUpload} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-slate-700 dark:file:text-gray-300"/>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* 👇 안전장치: links가 없으면 빈 배열 처리 */}
          {(links || []).map((link) => (
            <div key={link.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow border dark:border-slate-700 hover:shadow-md transition">
              
              {editingId === link.id ? (
                <div className="space-y-3">
                  <input className="w-full p-2 border rounded dark:bg-slate-700" value={editData.title} onChange={(e) => setEditData({...editData, title: e.target.value})} placeholder="제목" />
                  <textarea className="w-full p-2 border rounded h-20 dark:bg-slate-700" value={editData.memo} onChange={(e) => setEditData({...editData, memo: e.target.value})} placeholder="메모 입력..." />
                  <div className="flex justify-end gap-2">
                    <button onClick={saveEdit} className="bg-green-500 text-white px-3 py-1 rounded">저장</button>
                    <button onClick={() => setEditingId(null)} className="bg-gray-400 text-white px-3 py-1 rounded">취소</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between mb-3 items-start">
                     <div className="flex-1">
                        <span className="text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded mr-2">{link.category}</span>
                        <a href={link.url} target="_blank" className="font-bold text-xl hover:text-indigo-500 transition break-all">{link.title || "제목 없음"}</a>
                     </div>
                     {viewMode === 'my' && (
                       <div className="flex gap-2 ml-2">
                         <button onClick={() => startEdit(link)} className="text-gray-400 hover:text-indigo-500">✏️</button>
                         <button onClick={() => handleDelete(link.id)} className="text-gray-400 hover:text-red-500">🗑️</button>
                       </div>
                     )}
                  </div>
                  
                  <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded mb-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                    <span className="font-bold text-indigo-500 mr-2">AI 요약</span>{link.summary}
                  </div>

                  {link.memo && (
                    <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 text-gray-700 dark:text-gray-300 rounded-lg text-sm border border-yellow-100 dark:border-yellow-800 flex items-start gap-2">
                      <span className="mt-0.5">📝</span>
                      <span>{link.memo}</span>
                    </div>
                  )}

                  {link.tags && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {link.tags.split(',').map((tag, i) => tag.trim() && <span key={i} className="text-xs bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300">#{tag.trim()}</span>)}
                    </div>
                  )}

                  <button onClick={() => openChat(link.id)} className="w-full py-2 bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-gray-300 rounded font-bold hover:bg-indigo-100 dark:hover:bg-slate-600 transition">
                    {chatLinkId === link.id ? "채팅 닫기" : "💬 내용 질문하기"}
                  </button>

                  {chatLinkId === link.id && (
                    <div className="mt-4 p-4 bg-indigo-50 dark:bg-slate-900 rounded border dark:border-slate-600 animate-fade-in">
                      <div className="max-h-60 overflow-y-auto mb-4 space-y-2 p-2 scrollbar-thin">
                        {chatHistory.length === 0 && <p className="text-center text-gray-400 text-sm">기록이 없습니다.</p>}
                        {chatHistory.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-700 shadow rounded-bl-none'}`}>
                               {msg.message}
                            </div>
                          </div>
                        ))}
                      </div>
                      <form onSubmit={handleChat} className="flex gap-2">
                        <input className="flex-1 p-3 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={chatQuestion} onChange={(e) => setChatQuestion(e.target.value)} placeholder="질문 입력..." />
                        <button disabled={chatLoading} className="bg-indigo-600 text-white px-4 rounded-lg text-sm hover:bg-indigo-700 transition">전송</button>
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