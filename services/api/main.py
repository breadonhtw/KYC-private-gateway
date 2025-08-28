from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.pii import router as pii_router
from routes.policy import router as policy_router
from routes.search import router as search_router
from routes.summary import router as summary_router

app = FastAPI(title="KPG API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

@app.get("/")
def health():
    return {"ok": True, "service": "kpg-api"}

app.include_router(pii_router, prefix="/pii", tags=["pii"])
app.include_router(policy_router, prefix="/policy", tags=["policy"])
app.include_router(search_router, prefix="/search", tags=["search"])
app.include_router(summary_router, prefix="/summarise", tags=["summarise"])