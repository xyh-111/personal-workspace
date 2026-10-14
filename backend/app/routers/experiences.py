"""项目经历 CRUD — /api/experiences"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from ..db import get_session
from ..models import ProjectExperience
from ..schemas import (
    ProjectExperienceCreate, ProjectExperienceOut, ProjectExperienceUpdate,
)

router = APIRouter()


@router.get("", response_model=list[ProjectExperienceOut])
def list_experiences() -> list[ProjectExperience]:
    with get_session() as db:
        stmt = select(ProjectExperience).order_by(ProjectExperience.updated_at.desc())
        return list(db.scalars(stmt))


@router.get("/{exp_id}", response_model=ProjectExperienceOut)
def get_experience(exp_id: int) -> ProjectExperience:
    with get_session() as db:
        exp = db.get(ProjectExperience, exp_id)
        if not exp:
            raise HTTPException(404, "未找到该项目经历")
        return exp


@router.post("", response_model=ProjectExperienceOut)
def create_experience(payload: ProjectExperienceCreate) -> ProjectExperience:
    with get_session() as db:
        exp = ProjectExperience(**payload.model_dump())
        db.add(exp)
        db.commit()
        db.refresh(exp)
        return exp


@router.put("/{exp_id}", response_model=ProjectExperienceOut)
def update_experience(exp_id: int, payload: ProjectExperienceUpdate) -> ProjectExperience:
    with get_session() as db:
        exp = db.get(ProjectExperience, exp_id)
        if not exp:
            raise HTTPException(404, "未找到该项目经历")
        for k, v in payload.model_dump(exclude_unset=True).items():
            setattr(exp, k, v)
        db.commit()
        db.refresh(exp)
        return exp


@router.delete("/{exp_id}")
def delete_experience(exp_id: int) -> dict:
    with get_session() as db:
        exp = db.get(ProjectExperience, exp_id)
        if not exp:
            raise HTTPException(404, "未找到该项目经历")
        db.delete(exp)
    return {"ok": True, "id": exp_id}
