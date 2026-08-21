from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware  
from pydantic import BaseModel,Field
from dotenv import load_dotenv
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


SYSTEM_INSTRUCTION ="""
You are a professional AI assistant.

Answer the user's question:
- Clearly
- Accurately
- Concisely
- In a professional and helpful manner

Use bullet points or numbered lists when useful.
For programming questions, provide clean and practical answers.
Do not unnecessarily repeat the question.
Do not invent information. If you are unsure, say so.
"""
@app.get('/')
def home():
    return {"message":"Gemini Chatbot API is running: "}

@app.post('/chat')
def chat(request: ChatRequest):
    message = request.message.strip()
    if not message:
        raise HTTPException(status_code = 400, detail ="Message cannot be empty")
    try:
        response = client.models.generate_content(
            model  = "gemini-2.5-flash",
            contents = request.message,
            config = {
            "system_instruction": SYSTEM_INSTRUCTION,
             "temperature": 0.4,
             "max_output_tokens":1000
            }
        )
        return {"response":response.text.strip()}
    except Exception as e:
        print(f"Gemini Error: {e}")

        raise HTTPException(status_code = 500, detail = "Unable to generate response. ")