"""FastAPI 入口 — 挂载路由 + CORS + 启动时建表"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import init_db
from .routers import experiences, jd as jd_router, ai as ai_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动
    init_db()
    print(f"[career-backend] DB ready: {settings.db_url}")
    print(f"[career-backend] LLM: {settings.llm_provider} / {settings.llm_model} / {settings.llm_base_url}")
    yield
    # 关闭（SQLite 不需要显式断开）


app = FastAPI(
    title="Personal Workspace · Career Backend",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 路由
app.include_router(experiences.router, prefix="/api/experiences", tags=["experiences"])
app.include_router(jd_router.router, prefix="/api/jd", tags=["jd"])
app.include_router(ai_router.router, prefix="/api/ai", tags=["ai"])


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "version": "0.1.0"}
