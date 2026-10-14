"""AI 端点 — greeting + rewrite（底层是 LangGraph）"""
from __future__ import annotations

import json
import logging

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from ..config import settings
from ..db import get_session
from ..models import JD, ProjectExperience, GeneratedResult
from ..schemas import (
    GreetingRequest, GreetingResponse, GreetingVersion,
    RewriteRequest, RewriteResponse, RewriteResult,
)
from ..graphs.greeting_graph import run_greeting
from ..graphs.rewrite_graph import run_rewrite

router = APIRouter()
log = logging.getLogger(__name__)


def _resolve_jd(jd_id: int | None, jd_text: str | None) -> str:
    """优先用 jd_text，否则按 jd_id 从 DB 取"""
    if jd_text and jd_text.strip():
        return jd_text.strip()
    if jd_id is not None:
        with get_session() as db:
            jd = db.get(JD, jd_id)
            if jd and jd.source_text.strip():
                return jd.source_text.strip()
        raise HTTPException(404, f"JD {jd_id} 为空或不存在")
    raise HTTPException(400, "请提供 jd_id 或 jd_text")


def _load_experiences(ids: list[int]) -> list[dict]:
    if not ids:
        raise HTTPException(400, "experience_ids 不能为空")
    with get_session() as db:
        stmt = select(ProjectExperience).where(ProjectExperience.id.in_(ids))
        rows = list(db.scalars(stmt))
        if len(rows) != len(ids):
            found = {r.id for r in rows}
            missing = [i for i in ids if i not in found]
            raise HTTPException(404, f"以下经历不存在: {missing}")
        return [
            {
                "id": r.id,
                "title": r.title,
                "role": r.role,
                "description": r.description,
                "tech_stack": r.tech_stack or "",
                "highlights": r.highlights or "",
            }
            for r in rows
        ]


@router.post("/greeting", response_model=GreetingResponse)
def generate_greeting(payload: GreetingRequest) -> GreetingResponse:
    raw_jd = _resolve_jd(payload.jd_id, payload.jd_text)
    try:
        result = run_greeting(raw_jd, payload.styles)
    except Exception as e:
        log.exception("greeting graph failed")
        raise HTTPException(502, f"AI 生成失败：{e}") from e

    if result.get("error"):
        raise HTTPException(400, result["error"])

    versions = result.get("versions") or []
    if not versions:
        raise HTTPException(502, "AI 未返回任何内容")

    # 写历史（可选：挂到 jd_id 下，但 greeting 不一定要关联单条经历）
    with get_session() as db:
        jd_obj = None
        if payload.jd_id is not None:
            jd_obj = db.get(JD, payload.jd_id)
        if jd_obj is None:
            # 自动存一份 JD（便于后续追溯）
            jd_obj = JD(company="", position="", source_text=raw_jd, raw_type="text")
            db.add(jd_obj)
            db.flush()

        db.add(GeneratedResult(
            kind="greeting",
            jd_id=jd_obj.id,
            experience_id=None,
            input_snapshot=json.dumps({"raw_jd": raw_jd, "styles": payload.styles}, ensure_ascii=False),
            output_text="\n\n---\n\n".join(
                f"[{v.get('style','')}]\n{v.get('content','')}" for v in versions
            ),
            model_used=settings.llm_model,
        ))

    return GreetingResponse(
        results=[GreetingVersion(style=v.get("style", ""), content=v.get("content", "")) for v in versions],
        model_used=settings.llm_model,
        raw_used_jd=result.get("cleaned_jd") or raw_jd,
    )


@router.post("/rewrite", response_model=RewriteResponse)
def rewrite_experiences(payload: RewriteRequest) -> RewriteResponse:
    raw_jd = _resolve_jd(payload.jd_id, payload.jd_text)
    experiences = _load_experiences(payload.experience_ids)

    try:
        result = run_rewrite(raw_jd, experiences)
    except Exception as e:
        log.exception("rewrite graph failed")
        raise HTTPException(502, f"AI 改写失败：{e}") from e

    if result.get("error"):
        raise HTTPException(400, result["error"])

    checked = result.get("checked") or result.get("rewritten") or []
    if not checked:
        raise HTTPException(502, "AI 未返回任何改写结果")

    # 写历史
    with get_session() as db:
        jd_obj = None
        if payload.jd_id is not None:
            jd_obj = db.get(JD, payload.jd_id)
        if jd_obj is None:
            jd_obj = JD(company="", position="", source_text=raw_jd, raw_type="text")
            db.add(jd_obj)
            db.flush()

        for r in checked:
            db.add(GeneratedResult(
                kind="rewrite",
                jd_id=jd_obj.id,
                experience_id=r.get("experience_id"),
                input_snapshot=json.dumps({
                    "jd": raw_jd,
                    "original": r.get("original", ""),
                    "warning": r.get("warning"),
                }, ensure_ascii=False),
                output_text=r.get("rewritten", ""),
                model_used=settings.llm_model,
            ))

    return RewriteResponse(
        results=[
            RewriteResult(
                experience_id=r.get("experience_id", 0),
                original_title=r.get("original_title", ""),
                original=r.get("original", ""),
                rewritten=r.get("rewritten", ""),
                match_score=r.get("match_score", 0.0),
            )
            for r in checked
        ],
        model_used=settings.llm_model,
        raw_used_jd=result.get("cleaned_jd") or raw_jd,
    )
