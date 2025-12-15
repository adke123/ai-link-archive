// frontend/components/SearchBar.tsx
"use client";

interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
}

export default function SearchBar({ searchTerm, setSearchTerm }: SearchBarProps) {
  return (
    <div className="mb-6">
      <input 
        placeholder="🔍 키워드 검색 (뉴스, IT, 파일명 등)..." 
        className="w-full p-4 rounded-xl shadow border border-indigo-100 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-gray-100 transition"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <p className="text-xs text-gray-400 mt-2 text-right">
        * 중복된 링크는 하나로 합쳐서 보여집니다.
      </p>
    </div>
  );
}