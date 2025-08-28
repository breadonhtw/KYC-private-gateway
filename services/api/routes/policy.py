from fastapi import APIRouter
from pydantic import BaseModel
from core.policy_engine import check_policy

router = APIRouter()

class PolicyReq(BaseModel):
    tokenisedText: str
    entityTypes: list[str] = []
    caseContext: dict = {}

@router.post("/check")
def check(req: PolicyReq):
    return check_policy(req.tokenisedText, req.entityTypes, req.caseContext)
