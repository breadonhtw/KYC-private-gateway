from fastapi import APIRouter
from pydantic import BaseModel
from core.search import internal_search

router = APIRouter()

class SearchReq(BaseModel):
    subjectToken: str

@router.post("")
def search(req: SearchReq):
    return {"snippets": internal_search(req.subjectToken, {})}