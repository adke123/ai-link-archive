from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import requests
from bs4 import BeautifulSoup
import os
import google.generativeai as genai
import json
import io
from pypdf import PdfReader
from docx import Document
from . import models, database

# --- 데이터 검증 모델 ---
class LinkCreate(BaseModel):
    url: str
    user_id: str

class LinkUpdate(BaseModel):
    title: Optional[str] = None
    memo: Optional[str] = None
    category: Optional[str] = None

class ChatRequest(BaseModel):
    question: str

class ChatResponse(BaseModel):
    sender: str
    message: str

# DB 테이블 생성
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = database.SessionLocal()
    try: yield db
    finally: db.close()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
model = None
chat_model = None

if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    model = genai.GenerativeModel('gemini-2.5-flash', generation_config={"response_mime_type": "application/json"})
    chat_model = genai.GenerativeModel('gemini-2.5-flash')

# --- 헬퍼 함수: AI 분석 ---
def analyze_text(text):
    # 기본값 설정
    ai_data = {"summary": "요약 실패", "category": "기타", "tags": []}
    
    # 텍스트가 너무 짧으면 AI 분석 건너뛰기 (이상한 결과 방지)
    if not model or not text or len(text) < 100: 
        return {"summary": "본문 내용을 불러오지 못했습니다. (보안이 강한 사이트일 수 있음)", "category": "기타", "tags": []}

    try:
        prompt = f"""
        다음 텍스트를 분석해서 JSON 형식으로 답해줘. 태그는 반드시 3개를 채워줘.
        1. summary: 한국어로 3줄 이내 핵심 요약
        2. category: [IT/개발, 뉴스, 공부, 취미, 기타] 중 택1
        3. tags: 본문의 핵심 키워드 3개 (예: ["AI", "React", "Web"])
        
        텍스트: {text[:30000]}
        """
        resp = model.generate_content(prompt)
        return json.loads(resp.text)
    except: return ai_data

# --- API 엔드포인트 ---

@app.get("/")
def read_root(): return {"message": "AI Link Archive Ready!"}

# [기능 1] URL 링크 저장 (크롤링 강화)
@app.post("/links")
def create_link(link: LinkCreate, db: Session = Depends(get_db)):
    extracted_title = "제목 없음"
    body_text = ""
    
    try:
        # 봇 차단 방지용 헤더 강화
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(link.url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            response.encoding = response.apparent_encoding
            soup = BeautifulSoup(response.text, "html.parser")
            
            # 제목 추출
            if soup.title and soup.title.string: 
                extracted_title = soup.title.string.strip()
            else:
                meta_title = soup.find("meta", property="og:title")
                if meta_title: extracted_title = meta_title["content"]

            # 본문 추출 (p, div, article 태그 위주)
            paragraphs = soup.find_all(['p', 'article', 'div'], string=True)
            # 의미 있는 긴 문장만 가져오기
            body_text = " ".join([p.get_text().strip() for p in paragraphs if len(p.get_text()) > 30])
            
    except Exception as e:
        print(f"Crawling Error: {e}")

    # 너무 긴 본문 자르기
    body_text = body_text[:100000]

    ai_data = analyze_text(body_text)
    
    tags_list = ai_data.get("tags", [])
    if isinstance(tags_list, str): tags_list = [tags_list]
    tags_str = ", ".join(tags_list)

    new_link = models.Link(
        user_id=link.user_id, url=link.url, title=extracted_title, 
        summary=ai_data.get("summary"), content=body_text, memo="", 
        category=ai_data.get("category", "기타"), tags=tags_str
    )
    db.add(new_link)
    db.commit()
    db.refresh(new_link)
    return new_link

# [기능 2] 파일 업로드
@app.post("/upload")
async def upload_file(
    user_id: str = Form(...), 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    content = ""
    filename = file.filename
    
    try:
        file_bytes = await file.read()
        if filename.endswith(".pdf"):
            reader = PdfReader(io.BytesIO(file_bytes))
            content = " ".join([page.extract_text() for page in reader.pages])
        elif filename.endswith(".docx"):
            doc = Document(io.BytesIO(file_bytes))
            content = " ".join([para.text for para in doc.paragraphs])
        else:
            return {"error": "지원하지 않는 파일 형식입니다."}
    except Exception as e:
        return {"error": f"파일 읽기 실패: {str(e)}"}

    content = content[:100000]
    ai_data = analyze_text(content)
    tags_list = ai_data.get("tags", [])
    if isinstance(tags_list, str): tags_list = [tags_list]
    tags_str = ", ".join(tags_list)

    new_link = models.Link(
        user_id=user_id, url=f"FILE: {filename}", title=filename, 
        summary=ai_data.get("summary"), content=content, memo="", 
        category=ai_data.get("category", "공부"), tags=tags_str
    )
    db.add(new_link)
    db.commit()
    db.refresh(new_link)
    return new_link

# [기능 3] 조회
@app.get("/links")
def get_links(user_id: str, skip: int = 0, limit: int = 10, search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Link).filter(models.Link.user_id == user_id)
    if search: query = query.filter((models.Link.title.contains(search)) | (models.Link.tags.contains(search)))
    total = query.count()
    links = query.order_by(models.Link.id.desc()).offset(skip).limit(limit).all()
    return {"total": total, "links": links}

# [기능 3.5] 커뮤니티 탐색
@app.get("/explore")
def explore_links(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    links = db.query(models.Link).order_by(models.Link.id.desc()).offset(skip).limit(limit).all()
    return links

@app.delete("/links/{link_id}")
def delete_link(link_id: int, db: Session = Depends(get_db)):
    link = db.query(models.Link).filter(models.Link.id == link_id).first()
    if not link: raise HTTPException(status_code=404)
    db.delete(link); db.commit(); return {"message": "Deleted"}

@app.put("/links/{link_id}")
def update_link(link_id: int, data: LinkUpdate, db: Session = Depends(get_db)):
    link = db.query(models.Link).filter(models.Link.id == link_id).first()
    if not link: raise HTTPException(status_code=404)
    if data.title: link.title = data.title
    if data.memo is not None: link.memo = data.memo
    if data.category: link.category = data.category
    db.commit(); return link

@app.get("/links/{link_id}/chat", response_model=List[ChatResponse])
def get_chat_history(link_id: int, db: Session = Depends(get_db)):
    return db.query(models.ChatMessage).filter(models.ChatMessage.link_id == link_id).order_by(models.ChatMessage.created_at).all()

@app.post("/links/{link_id}/chat")
def chat_with_link(link_id: int, chat: ChatRequest, db: Session = Depends(get_db)):
    link = db.query(models.Link).filter(models.Link.id == link_id).first()
    if not link or not link.content: return {"answer": "본문 내용이 없습니다."}
    
    user_msg = models.ChatMessage(link_id=link_id, sender="user", message=chat.question)
    db.add(user_msg)
    
    try:
        prompt = f"문서 내용: {link.content[:100000]} \n 질문: {chat.question} \n 위 문서 내용을 바탕으로 답변해줘."
        response = chat_model.generate_content(prompt)
        ai_answer = response.text
    except Exception as e:
        ai_answer = f"오류 발생: {str(e)}"

    ai_msg = models.ChatMessage(link_id=link_id, sender="ai", message=ai_answer)
    db.add(ai_msg)
    db.commit()
    
    return {"answer": ai_answer}