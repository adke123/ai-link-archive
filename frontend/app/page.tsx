// frontend/app/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { supabase } from "../lib/supabase";
import { User } from "@supabase/supabase-js";
import { Toaster, toast } from 'react-hot-toast';

// 🧩 4개의 컴포넌트와 타입을 모두 가져옵니다
import { LinkItem, ChatMsg } from "../types";
import Header from "../components/Header";
import InputForm from "../components/InputForm";
import SearchBar from "../components/SearchBar";
import LinkCard from "../components/LinkCard";

const API_URL = "https://ai-link-archive.onrender.com";
const SITE_URL = "https://ai-link-archive.vercel.app";

export default function Home() {
  // --- State 관리 (데이터 로직) ---
  const [user, setUser] = useState<User | null>(null);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [viewMode, setViewMode] = useState<'my' | 'explore'>('my');

  const [inputUrl, setInputUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(""); 

  const [chatLinkId, setChatLinkId] = useState<number | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  
  const [darkMode, setDarkMode] = useState(false);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState({ title: "", memo: "", category: "" });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- useEffect (초기화) ---
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

  // --- 핸들러 함수들 (비즈니스 로직) ---
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: SITE_URL } });
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
        const allLinks: LinkItem[] = res.data || [];
        const uniqueLinks = Array.from(new Map(allLinks.map(item => [item.url, item])).values());
        setLinks(uniqueLinks);
      }
    } catch (e) { console.error(e); setLinks([]); }
  };

  const handleSubmit = async () => {
    if (!inputUrl || !user) return;
    setLoading(true);
    const loadingToast = toast.loading("AI가 분석 중입니다...");
    try { 
      await axios.post(`${API_URL}/links`, { url: inputUrl, user_id: user.id }); 
      setInputUrl(""); 
      if (viewMode === 'my') fetchLinks();
      toast.success("저장 성공!", { id: loadingToast });
    } catch { toast.error("저장 실패", { id: loadingToast }); } 
    finally { setLoading(false); }
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
    } catch { toast.error("업로드 실패", { id: loadingToast }); }
    finally { setLoading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleScrap = async (link: LinkItem) => {
    if (!user) return toast.error("로그인이 필요합니다.");
    if (confirm("이 콘텐츠를 '나의 아카이브'로 가져오시겠습니까?")) {
      const loadingToast = toast.loading("가져오는 중...");
      try {
        await axios.post(`${API_URL}/links`, { url: link.url, user_id: user.id });
        toast.success("저장되었습니다!", { id: loadingToast });
      } catch { toast.error("가져오기 실패", { id: loadingToast }); }
    }
  };

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

  const handleDelete = async (id: number) => { 
    if (confirm("정말 삭제하시겠습니까?")) { 
      await axios.delete(`${API_URL}/links/${id}`); 
      toast.success("삭제되었습니다."); 
      fetchLinks(); 
    } 
  };
  
  const openChat = async (id: number) => {
    if (chatLinkId === id) { setChatLinkId(null); return; }
    setChatLinkId(id); setChatHistory([]);
    try { 
      const res = await axios.get(`${API_URL}/links/${id}/chat`); 
      setChatHistory(res.data); 
    } catch {}
  };

  const handleChatSubmit = async (e: React.FormEvent, question: string) => {
    if (!question) return;
    const tempMsg = { sender: 'user', message: question };
    setChatHistory(prev => [...prev, tempMsg]); 
    setChatLoading(true);
    try {
      const res = await axios.post(`${API_URL}/links/${chatLinkId}/chat`, { question: tempMsg.message });
      setChatHistory(prev => [...prev, { sender: 'ai', message: res.data.answer }]);
    } catch { 
      setChatHistory(prev => [...prev, { sender: 'ai', message: "오류 발생" }]); 
    } finally { setChatLoading(false); }
  };

  // 검색 필터링
  const filteredLinks = links.filter(link => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      link.title?.toLowerCase().includes(term) ||
      link.summary?.toLowerCase().includes(term) ||
      link.tags?.toLowerCase().includes(term)
    );
  });

  // --- 렌더링 (화면 그리기) ---
  if (!user) return ( <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-slate-900 transition-colors"><button onClick={handleLogin} className="bg-black text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:scale-105 transition">Google 계정으로 시작하기</button></div> );

  return (
    <div className={`min-h-screen p-4 md:p-6 transition-colors duration-300 ${darkMode ? 'bg-slate-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <Toaster position="top-center" reverseOrder={false} />

      <div className="max-w-4xl mx-auto">
        {/* 1. 헤더 컴포넌트 */}
        <Header 
          onLogout={handleLogout} 
          darkMode={darkMode} 
          setDarkMode={setDarkMode} 
        />

        {/* 탭 메뉴 (너무 간단해서 분리 안 함) */}
        <div className="flex gap-6 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button onClick={() => setViewMode('my')} className={`pb-2 font-bold text-lg transition ${viewMode === 'my' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>🏠 나의 아카이브</button>
          <button onClick={() => setViewMode('explore')} className={`pb-2 font-bold text-lg transition ${viewMode === 'explore' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>🌏 모두의 탐색</button>
        </div>

        {/* 2. 입력 폼 컴포넌트 (나의 아카이브일 때만 표시) */}
        {viewMode === 'my' && (
          <InputForm
            inputUrl={inputUrl}
            setInputUrl={setInputUrl}
            onSubmit={handleSubmit}
            loading={loading}
            onFileUpload={handleFileUpload}
            fileInputRef={fileInputRef}
          />
        )}

        {/* 3. 검색창 컴포넌트 (모두의 탐색일 때만 표시) */}
        {viewMode === 'explore' && (
          <SearchBar 
            searchTerm={searchTerm} 
            setSearchTerm={setSearchTerm} 
          />
        )}

        {/* 4. 링크 리스트 (LinkCard 반복 렌더링) */}
        <div className="space-y-4">
          {filteredLinks.length === 0 && <p className="text-center text-gray-400 py-10">데이터가 없습니다.</p>}
          
          {filteredLinks.map((link) => (
            <LinkCard
              key={link.id}
              link={link}
              viewMode={viewMode}
              isEditing={editingId === link.id}
              onEditStart={startEdit}
              onEditCancel={() => setEditingId(null)}
              onEditSave={saveEdit}
              editData={editData}
              setEditData={setEditData}
              onDelete={handleDelete}
              onScrap={handleScrap}
              chatLinkId={chatLinkId}
              onChatOpen={openChat}
              chatHistory={chatLinkId === link.id ? chatHistory : []}
              onChatSubmit={handleChatSubmit}
              chatLoading={chatLoading}
            />
          ))}
        </div>
      </div>
    </div>
  );
}