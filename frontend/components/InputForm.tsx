"use client";

import { RefObject } from "react";

interface InputFormProps {
  inputUrl: string;
  setInputUrl: (val: string) => void;
  onSubmit: () => void;
  loading: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  // 👇 [수정 포인트] | null 을 추가했습니다!
  fileInputRef: RefObject<HTMLInputElement | null>; 
}

export default function InputForm({ 
  inputUrl, setInputUrl, onSubmit, loading, onFileUpload, fileInputRef 
}: InputFormProps) {
  // ... (나머지 코드는 그대로)
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg mb-6 border dark:border-slate-700">
      <div className="flex flex-col md:flex-row gap-2 mb-3">
        <input 
          placeholder="URL 입력 (AI 자동 분석)..." 
          className="flex-1 p-3 rounded border dark:bg-slate-900 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none transition text-gray-900 dark:text-gray-100" 
          value={inputUrl} 
          onChange={(e) => setInputUrl(e.target.value)} 
        />
        <button 
          onClick={onSubmit} 
          disabled={loading} 
          className="bg-indigo-600 text-white px-6 py-3 rounded font-bold disabled:opacity-50 hover:bg-indigo-700 transition"
        >
          {loading ? "분석 중..." : "추가"}
        </button>
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-500">
         <span>파일(PDF/Word):</span>
         <input 
           type="file" 
           accept=".pdf,.docx" 
           ref={fileInputRef} 
           onChange={onFileUpload} 
           className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-slate-700 dark:file:text-gray-300"
         />
      </div>
    </div>
  );
}