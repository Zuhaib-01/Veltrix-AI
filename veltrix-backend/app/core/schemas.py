from pydantic import BaseModel, Field
from typing import List, Optional


class AnalyzeTextRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=50000)
    urls: Optional[List[str]] = []
    sender: Optional[str] = None
    subject: Optional[str] = None
    language: Optional[str] = "auto"


class AnalyzeUrlRequest(BaseModel):
    url: str = Field(..., min_length=1)


class BlockUrlRequest(BaseModel):
    url: str


class BlockSenderRequest(BaseModel):
    sender: str


class UnblockSenderRequest(BaseModel):
    sender: str


class CheckBlockRequest(BaseModel):
    url: Optional[str] = None
    sender: Optional[str] = None


class ThreatDetail(BaseModel):
    category: str
    description: str
    severity: str


class AnalysisResponse(BaseModel):
    label: str
    score: int
    confidence: float
    reasons: List[str]
    threats: List[ThreatDetail]
    url_risks: Optional[List[dict]] = []
    sender_blocked: bool = False
    url_blocked: bool = False
    language_detected: Optional[str] = None


class BlockResponse(BaseModel):
    success: bool
    message: str


class CheckBlockResponse(BaseModel):
    url_blocked: bool
    sender_blocked: bool


class AnalyzeBatchItem(BaseModel):
    text: str = Field(..., min_length=1, max_length=50000)
    urls: Optional[List[str]] = []
    sender: Optional[str] = None
    subject: Optional[str] = None


class AnalyzeBatchRequest(BaseModel):
    items: List[AnalyzeBatchItem] = Field(..., max_length=20)


class AnalyzeBatchResponse(BaseModel):
    results: List[AnalysisResponse]


class AlertItem(BaseModel):
    id: str
    label: str
    score: int
    source: str
    subject: Optional[str] = None
    sender: Optional[str] = None
    timestamp: str
    reasons: List[str]
