import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.api.routes import router
from app.core.config import settings

app = FastAPI(
    title="Veltrix AI - Phishing Detection API",
    version="1.0.0",
    description="AI-powered phishing detection and threat intelligence API",
)

origins = settings.allowed_origins_list
if settings.ENV == "development":
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
async def root():
    return {"service": "Veltrix AI API", "version": "1.0.0", "status": "running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.ENV == "development",
    )
