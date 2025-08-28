from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.llm import summarise

router = APIRouter()

class SummariseReq(BaseModel):
    subjectToken: str
    snippets: list[dict]

@router.post("")
def do_summary(req: SummariseReq):
    if not req.snippets:
        raise HTTPException(400, "snippets required")
    return summarise(req.subjectToken, req.snippets)