"""Pydantic v2 请求 / 响应模型"""
from __future__ import annotations

from datetime import datetime, date
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


# ========== ProjectExperience ==========

class ProjectExperienceBase(BaseModel):
    title: str = Field(..., max_length=200)
    role: str = Field(..., max_length=100)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    description: str                                      # STAR 原文
    tech_stack: Optional[str] = ""                        # 逗号分隔
    highlights: Optional[str] = ""                        # 量化成果


class ProjectExperienceCreate(ProjectExperienceBase):
    pass


class ProjectExperienceUpdate(BaseModel):
    title: Optional[str] = None
    role: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    description: Optional[str] = None
    tech_stack: Optional[str] = None
    highlights: Optional[str] = None


class ProjectExperienceOut(ProjectExperienceBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ========== JD ==========

class JDBase(BaseModel):
    company: Optional[str] = ""
    position: Optional[str] = ""
    source_text: str
    raw_type: str = "text"
    raw_file_path: Optional[str] = None


class JDCreate(JDBase):
    pass


class JDOut(JDBase):
    id: int
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ========== GeneratedResult ==========

class GeneratedResultOut(BaseModel):
    id: int
    kind: str
    jd_id: int
    experience_id: Optional[int]
    input_snapshot: str
    output_text: str
    model_used: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


# ========== AI 请求 / 响应 ==========

class GreetingRequest(BaseModel):
    """打招呼语生成"""
    jd_id: Optional[int] = None           # 已上传的 JD
    jd_text: Optional[str] = None         # 直接粘贴的文本（优先级更高）
    styles: list[str] = Field(default_factory=lambda: ["简洁", "热情", "专业"])


class GreetingVersion(BaseModel):
    style: str
    content: str


class GreetingResponse(BaseModel):
    results: list[GreetingVersion]
    model_used: str
    raw_used_jd: str                       # 实际被消费的 JD 文本（方便前端展示）

    model_config = ConfigDict(protected_namespaces=())


class RewriteRequest(BaseModel):
    """项目经历改写"""
    jd_id: Optional[int] = None
    jd_text: Optional[str] = None
    experience_ids: list[int]              # 要改写的项目经历 ID 列表


class RewriteResult(BaseModel):
    experience_id: int
    original_title: str
    original: str                          # 原文摘要
    rewritten: str                         # 改写后的 STAR
    match_score: float = 0.0               # 0–1 匹配度


class RewriteResponse(BaseModel):
    results: list[RewriteResult]
    model_used: str
    raw_used_jd: str

    model_config = ConfigDict(protected_namespaces=())


# ========== 健康检查 ==========

class HealthResponse(BaseModel):
    status: str
    version: str = "0.1.0"
