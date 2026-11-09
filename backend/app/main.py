from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.database import init_db
from backend.app.routers import (
    transactions,
    analytics,
    anomalies,
    recommendations,
    goals,
    chat,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="Rupee Radar API",
    description="AI-powered Personal Finance Management Engine for Indian Users (₹)",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "app": "Rupee Radar API",
        "currency": "₹ (INR)",
        "docs_url": "/docs"
    }

# Register API Routers
app.include_router(transactions.router)
app.include_router(analytics.router)
app.include_router(anomalies.router)
app.include_router(recommendations.router)
app.include_router(goals.router)
app.include_router(chat.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
