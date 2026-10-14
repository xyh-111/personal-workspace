"""SQLAlchemy ORM 模型 — 三张表"""
from __future__ import annotations

from datetime import datetime, date

from sqlalchemy import String, Text, Date, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class ProjectExperience(Base):
    """项目经历库 — 用户在简历里积累的项目"""
    __tablename__ = "project_experiences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(100), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=True)
    end_date: Mapped[date] = mapped_column(Date, nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)        # STAR 格式原文
    tech_stack: Mapped[str] = mapped_column(String(500), default="")     # 逗号分隔
    highlights: Mapped[str] = mapped_column(Text, default="")            # 亮点 / 量化成果
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class JD(Base):
    """职位描述 — 用户上传过的 JD 历史"""
    __tablename__ = "jds"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company: Mapped[str] = mapped_column(String(200), default="")
    position: Mapped[str] = mapped_column(String(200), default="")
    source_text: Mapped[str] = mapped_column(Text, nullable=False)        # 最终可用的纯文本
    raw_type: Mapped[str] = mapped_column(String(20), default="text")     # text | image
    raw_file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # 反向关联生成记录
    results: Mapped[list["GeneratedResult"]] = relationship(back_populates="jd", cascade="all, delete-orphan")


class GeneratedResult(Base):
    """AI 生成历史 — 可溯源"""
    __tablename__ = "generated_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)        # greeting | rewrite
    jd_id: Mapped[int] = mapped_column(ForeignKey("jds.id"), nullable=False)
    experience_id: Mapped[int | None] = mapped_column(ForeignKey("project_experiences.id"), nullable=True)
    input_snapshot: Mapped[str] = mapped_column(Text, default="")         # 当时输入的 JSON 快照
    output_text: Mapped[str] = mapped_column(Text, nullable=False)
    model_used: Mapped[str] = mapped_column(String(100), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    jd: Mapped[JD] = relationship(back_populates="results")
    experience: Mapped[ProjectExperience | None] = relationship()
