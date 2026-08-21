from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware  
from pydantic import BaseModel,Field
from dotenv import load_dotenv
from typing import Optional
from google import genai
import os
load_dotenv()

client = genai.Client(api_key = os.getenv('GEMINI_API_KEY'))
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins = ['*'],
    allow_methods = ['*'],
    allow_headers = ['*']
)


class ChatRequest(BaseModel):
    message: str = Field(..., description = "Ask Something! ")


@app.get('/')
def home():
    return {"message":"Gemini Chatbot API is running: "}

@app.post('/chat')
def chat(request: ChatRequest):
    response = client.models.generate_content(
        model  = "gemini-2.5-flash",
        contents = request.message
    )
    return {"response":response.text}