from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import engine, Base, SessionLocal
from .seed_data import seed_database
from .routers import analytics, agents, executions

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="AgentGuard — AI Agent Reliability, Testing & Evaluation Platform API",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for local dev & Vite frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analytics.router)
app.include_router(agents.router)
app.include_router(executions.router)

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "AgentGuard API",
        "version": settings.VERSION,
        "engine_status": "Evaluation Engine Ready"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}

