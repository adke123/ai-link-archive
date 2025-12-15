// frontend/components/LinkCard.tsx
"use client";

import { useState } from "react";
import { LinkItem, ChatMsg } from "../types";

interface LinkCardProps {
  link: LinkItem;
  viewMode: 'my' | 'explore';
  isEditing: boolean;
  onEditStart: (link: LinkItem) => void;
  onEditCancel: () => void;
  onEditSave: () => void;
  editData: { title: string; memo: string; category: string };
  setEditData: (data: any) => void;
  onDelete: (id: number) => void;
  onScrap: (link: LinkItem) => void;
  
  // 채팅 관련 Props
  chatLinkId: number | null;
  onChatOpen: (id: number) => void;
  chatHistory: ChatMsg[];
  onChatSubmit: (e: React.FormEvent, question: string) => void;
  chatLoading: boolean;
}

export default function LinkCard({
  link, viewMode, isEditing, onEditStart, onEditCancel, onEditSave,
  editData, setEditData, onDelete, onScrap,
  chatLinkId, onChatOpen, chatHistory, onChatSubmit, chatLoading
}: LinkCardProps) {
  
  const [question, setQuestion] = useState("");

  const handleChatSubmitLocal = (e: React.FormEvent) => {
    e.preventDefault();
    onChatSubmit(e, question);
    setQuestion(""); // 입력창 비우기
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow border dark:border-slate-700 hover:shadow-md transition">
      
      {isEditing ? (
        // ✏️ 수정 모드 UI
        <div className="space-y-3">
          <input 
            className="w-full p-2 border rounded dark:bg-slate-700 text-gray-900 dark:text-gray-100" 
            value={editData.title} 
            onChange={(e) => setEditData({...editData, title: e.target.value})} 
            placeholder="제목" 
          />
          <textarea 
            className="w-full p-2 border rounded h-20 dark:bg-slate-700 text-gray-900 dark:text-gray-100" 
            value={editData.memo} 
            onChange={(e) => setEditData({...editData, memo: e.target.value})} 
            placeholder="메모 입력..." 
          />
          <div className="flex justify-end gap-2">
            <button onClick={onEditSave} className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600">저장</button>
            <button onClick={onEditCancel} className="bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500">취소</button>
          </div>
        </div>
      ) : (
        // 👀 일반 보기 모드 UI
        <>
          <div className="flex justify-between mb-3 items-start gap-4">
             <div className="flex-1 min-w-0">
                <span className="inline-block text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/50 px-2 py-1 rounded mb-2 mr-2">{link.category}</span>
                <a href={link.url} target="_blank" className="font-bold text-xl hover:text-indigo-500 transition break-words text-gray-900 dark:text-gray-100 block">
                  {link.title || "제목 없음"}
                </a>
             </div>
             
             <div className="flex gap-2 shrink-0">
               {viewMode === 'my' ? (
                 <>
                   <button onClick={() => onEditStart(link)} className="p-2 text-gray-400 hover:text-indigo-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition">✏️</button>
                   <button onClick={() => onDelete(link.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition">🗑️</button>
                 </>
               ) : (
                 <button onClick={() => onScrap(link)} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-bold hover:bg-indigo-200 dark:hover:bg-indigo-800 transition">
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

          {/* 채팅 버튼 */}
          <button onClick={() => onChatOpen(link.id)} className="w-full py-2.5 bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-gray-300 rounded-lg font-bold hover:bg-indigo-100 dark:hover:bg-slate-600 transition flex justify-center items-center gap-2">
            {chatLinkId === link.id ? "접기" : "💬 AI에게 질문하기"}
          </button>

          {/* 채팅창 영역 */}
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
              <form onSubmit={handleChatSubmitLocal} className="flex gap-2">
                <input 
                  className="flex-1 p-3 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100" 
                  value={question} 
                  onChange={(e) => setQuestion(e.target.value)} 
                  placeholder="질문 입력..." 
                />
                <button disabled={chatLoading} className="bg-indigo-600 text-white px-4 rounded-lg text-sm hover:bg-indigo-700 transition font-bold">전송</button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}