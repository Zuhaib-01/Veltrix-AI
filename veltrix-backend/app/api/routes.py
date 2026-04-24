import uuid
from fastapi import APIRouter, HTTPException
from app.core.schemas import (
    AnalyzeTextRequest, AnalyzeUrlRequest,
    BlockUrlRequest, BlockSenderRequest, UnblockSenderRequest,
    CheckBlockRequest, AnalysisResponse,
    BlockResponse, CheckBlockResponse,
    AnalyzeBatchRequest, AnalyzeBatchResponse,
)
from app.core import store
from app.ml.inference import predict, predict_batch, _analyze_url_risk

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "ok", "service": "Veltrix AI", "version": "1.0.0"}


@router.post("/analyze-text", response_model=AnalysisResponse)
async def analyze_text(req: AnalyzeTextRequest):
    try:
        result = predict(
            text=req.text,
            urls=req.urls or [],
            sender=req.sender,
            subject=req.subject,
        )

        sender_blocked = store.is_sender_blocked(req.sender) if req.sender else False
        url_blocked = any(store.is_url_blocked(u) for u in (req.urls or []))

        if sender_blocked:
            result["label"] = "phishing"
            result["score"] = 100
            result["reasons"] = ["Sender is on your blocklist"] + result.get("reasons", [])

        if result["label"] in ("phishing", "suspicious"):
            store.add_alert({
                "id": str(uuid.uuid4()),
                "label": result["label"],
                "score": result["score"],
                "source": "text_scan",
                "subject": req.subject,
                "sender": req.sender,
                "reasons": result["reasons"][:3],
            })

        return AnalysisResponse(
            label=result["label"],
            score=result["score"],
            confidence=result["confidence"],
            reasons=result["reasons"],
            threats=result["threats"],
            url_risks=result["url_risks"],
            sender_blocked=sender_blocked,
            url_blocked=url_blocked,
            language_detected=result.get("language_detected"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-batch", response_model=AnalyzeBatchResponse)
async def analyze_batch(req: AnalyzeBatchRequest):
    try:
        items = [
            {
                "text": item.text,
                "urls": item.urls or [],
                "sender": item.sender,
                "subject": item.subject,
            }
            for item in req.items
        ]
        results = predict_batch(items)

        response_results = []
        for i, result in enumerate(results):
            item = req.items[i]
            sender_blocked = store.is_sender_blocked(item.sender) if item.sender else False
            url_blocked = any(store.is_url_blocked(u) for u in (item.urls or []))

            if sender_blocked:
                result["label"] = "phishing"
                result["score"] = 100
                result["reasons"] = ["Sender is on your blocklist"] + result.get("reasons", [])

            if result["label"] in ("phishing", "suspicious"):
                store.add_alert({
                    "id": str(uuid.uuid4()),
                    "label": result["label"],
                    "score": result["score"],
                    "source": "batch_scan",
                    "subject": item.subject,
                    "sender": item.sender,
                    "reasons": result["reasons"][:3],
                })

            response_results.append(AnalysisResponse(
                label=result["label"],
                score=result["score"],
                confidence=result["confidence"],
                reasons=result["reasons"],
                threats=result["threats"],
                url_risks=result["url_risks"],
                sender_blocked=sender_blocked,
                url_blocked=url_blocked,
                language_detected=result.get("language_detected"),
            ))

        return AnalyzeBatchResponse(results=response_results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-url", response_model=AnalysisResponse)
async def analyze_url(req: AnalyzeUrlRequest):
    try:
        url_risk, url_reasons = _analyze_url_risk(req.url)
        risk_score = int(url_risk * 100)

        if risk_score >= 65:
            label = "phishing"
        elif risk_score >= 30:
            label = "suspicious"
        else:
            label = "safe"

        threats = []
        if url_reasons:
            for r in url_reasons:
                threats.append({
                    "category": "URL Risk",
                    "description": r,
                    "severity": "high" if url_risk > 0.6 else "medium",
                })

        url_blocked = store.is_url_blocked(req.url)

        if label in ("phishing", "suspicious"):
            store.add_alert({
                "id": str(uuid.uuid4()),
                "label": label,
                "score": risk_score,
                "source": "url_scan",
                "subject": None,
                "sender": None,
                "reasons": url_reasons[:3],
            })

        return AnalysisResponse(
            label=label,
            score=risk_score,
            confidence=round(url_risk, 4),
            reasons=url_reasons if url_reasons else ["No suspicious URL patterns detected"],
            threats=threats,
            url_risks=[{"url": req.url, "risk": url_risk, "reasons": url_reasons}],
            url_blocked=url_blocked,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/block-url", response_model=BlockResponse)
async def block_url(req: BlockUrlRequest):
    store.add_blocked_url(req.url)
    return BlockResponse(success=True, message=f"URL blocked: {req.url}")


@router.post("/block-sender", response_model=BlockResponse)
async def block_sender(req: BlockSenderRequest):
    store.add_blocked_sender(req.sender)
    return BlockResponse(success=True, message=f"Sender blocked: {req.sender}")


@router.post("/unblock-sender", response_model=BlockResponse)
async def unblock_sender(req: UnblockSenderRequest):
    store.remove_blocked_sender(req.sender)
    return BlockResponse(success=True, message=f"Sender unblocked: {req.sender}")


@router.get("/check-block", response_model=CheckBlockResponse)
async def check_block(url: str = None, sender: str = None):
    return CheckBlockResponse(
        url_blocked=store.is_url_blocked(url) if url else False,
        sender_blocked=store.is_sender_blocked(sender) if sender else False,
    )


@router.get("/alerts")
async def get_alerts(limit: int = 50):
    return {"alerts": store.get_alerts(limit), "total": len(store.get_alerts(1000))}


@router.get("/blocked")
async def get_blocked():
    return {
        "blocked_urls": store.get_blocked_urls(),
        "blocked_senders": store.get_blocked_senders(),
    }
