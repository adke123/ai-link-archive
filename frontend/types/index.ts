// frontend/types/index.ts

export interface LinkItem {
  id: number;
  user_id: string;
  url: string;
  title: string;
  summary: string;
  memo: string;
  category: string;
  tags: string;
}

export interface ChatMsg {
  sender: string;
  message: string;
}