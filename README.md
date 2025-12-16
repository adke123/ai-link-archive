# 🧠 AI Link Archive (나만의 지식 아카이브)

> **"정보의 홍수 속에서, 나에게 필요한 지식만 요약하고 저장하는 AI 기반 아카이빙 서비스"**

웹상의 뉴스, 블로그, 기술 문서를 URL 하나로 3줄 요약하고, RAG(검색 증강 생성) 기술을 통해 저장된 지식과 대화할 수 있는 풀스택 웹 애플리케이션입니다.

---

## 🚀 배포 주소 (Live Demo)
- **Frontend (Vercel):** https://ai-link-archive.vercel.app
- **Backend (Render):** https://ai-link-archive.onrender.com

---

## 🛠 기술 스택 (Tech Stack)

### **Frontend**
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** React Hooks
- **Architecture:** Atomic Component Design (관심사 분리 적용)

### **Backend**
- **Framework:** Python FastAPI
- **AI/LLM:** Google Gemini 1.5 Flash
- **Document Processing:** LangChain, PyPDF, BeautifulSoup
- **Architecture:** RESTful API

### **Infrastructure & Database**
- **DB & Auth:** Supabase (PostgreSQL)
- **Deployment:** Vercel (FE), Render (BE)
- **CI/CD:** GitHub Actions (Automated Deployment)

---

## ✨ 핵심 기능 (Key Features)

1.  **🔗 URL 자동 분석 & 요약**
    - 뉴스나 블로그 링크를 입력하면 AI가 본문을 크롤링하여 **3줄 요약, 카테고리 분류, 태그 생성**을 자동으로 수행합니다.
    
2.  **📄 문서(PDF/Word) 분석**
    - 파일 업로드 기능을 통해 논문이나 보고서의 내용을 AI가 분석하고 아카이빙합니다.

3.  **💬 RAG 기반 AI 채팅 (Chat with Archive)**
    - 저장된 특정 링크의 내용을 바탕으로 AI와 질의응답이 가능합니다. (예: "이 기사에서 언급된 해결책이 뭐야?")

4.  **🌏 커뮤니티 & 지식 공유**
    - [모두의 탐색] 탭을 통해 다른 사용자가 저장한 유용한 아티클을 검색하고, 내 아카이브로 가져오기(Scrap) 할 수 있습니다.

---

## 🔧 기술적 도전 & 해결 과정 (Troubleshooting)

### 1. 프론트엔드 아키텍처 개선 (Refactoring)
- **문제:** 초기 MVP 개발 시 `page.tsx` 파일 하나에 비즈니스 로직, UI 렌더링, 상태 관리가 섞여 있어 코드가 400줄 이상 비대해짐. 유지보수가 어렵고 가독성이 떨어지는 문제 발생.
- **해결:** **관심사의 분리(Separation of Concerns)** 원칙을 적용하여 리팩토링 수행.
    - `types/index.ts`: 공통 인터페이스(Type) 분리하여 타입 안전성 확보.
    - `components/`: `LinkCard`, `InputForm`, `Header` 등으로 UI 컴포넌트를 기능 단위로 모듈화.
    - **결과:** 코드 가독성 50% 향상 및 재사용성 확보 (나의 아카이브/모두의 탐색 탭에서 컴포넌트 재사용).

### 2. 대량 데이터 렌더링 최적화
- **문제:** [모두의 탐색] 탭에서 중복된 URL이 다수 노출되어 사용자 경험 저하.
- **해결:** 프론트엔드 단에서 `Map` 자료구조를 활용하여 URL 기준 **중복 제거(Deduplication)** 로직 구현.

### 3. 배포 환경 간 통신 문제 (CORS & Environment)
- **문제:** 로컬 개발 환경(localhost)과 배포 환경(Vercel/Render)의 도메인이 달라 쿠키 및 API 통신 오류 발생.
- **해결:** - FastAPI 미들웨어에서 `CORSMiddleware` 설정 최적화.
    - Next.js 환경 변수(`.env`)를 통해 API 엔드포인트를 동적으로 관리하도록 구성.

---

## 📂 프로젝트 구조 (Directory Structure)

```bash
frontend/
├── app/              # Next.js App Router (Pages)
├── components/       # Reusable UI Components (LinkCard, Header, etc.)
├── lib/              # Utility Libraries (Supabase Client)
├── types/            # TypeScript Interfaces
└── public/           # Static Assets

backend/
├── app/
│   ├── main.py       # FastAPI Entry Point
│   └── ...           # API Routers & Services
└── requirements.txt  # Python Dependencies
