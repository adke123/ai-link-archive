// frontend/components/Header.tsx
"use client";

interface HeaderProps {
  onLogout: () => void;
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

export default function Header({ onLogout, darkMode, setDarkMode }: HeaderProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">
        AI Link Archive
      </h1>
      <div className="flex gap-2 items-center">
        <button 
          onClick={() => setDarkMode(!darkMode)} 
          className="p-2 rounded bg-gray-200 dark:bg-slate-700 hover:opacity-80 transition"
        >
          {darkMode ? "☀️" : "🌙"}
        </button>
        <button 
          onClick={onLogout} 
          className="text-sm underline hover:text-red-500 ml-2"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}