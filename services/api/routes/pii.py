from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.ner import detect_entities
from core.token_service import tokenise

router = APIRouter()

class AnalyseReq(BaseModel):
    text: str

class TokeniseReq(BaseModel):
    text: str
    entities: list[dict]

@router.post("/analyse")
def analyse(req: AnalyseReq):
    return {"entities": detect_entities(req.text)}

@router.post("/tokenise")
def tokenise_route(req: TokeniseReq):
    for e in req.entities:
        if not (0 <= e["start"] < e["end"] <= len(req.text)):
            raise HTTPException(400, f"Invalid span for {e.get('type')}")
    return {"tokenisedText": tokenise(req.text, req.entities), "tokenMapRef": "demo-map-id"}