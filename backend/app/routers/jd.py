"""JD 上传 — 文本或图片，自动解析入库"""
from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from sqlalchemy import select

from ..config import settings
from ..db import get_session
from ..models import JD
from ..schemas import JDOut
from ..services import jd_parser

router = APIRouter()


UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10MB


@router.post("", response_model=JDOut)
async def upload_jd(
    text: str | None = Form(None, description="直接粘贴的 JD 文本（优先于图片）"),
    company: str | None = Form(None),
    position: str | None = Form(None),
    image: UploadFile | None = File(None, description="JD 截图（可选）"),
) -> JD:
    source_text = ""
    raw_type = "text"
    raw_file_path: str | None = None

    if text and text.strip():
        source_text = jd_parser.parse_text(text)
    elif image:
        # 图片上传
        raw = await image.read()
        if len(raw) > MAX_IMAGE_BYTES:
            raise HTTPException(400, "图片不能超过 10MB")
        ext = Path(image.filename or "image.png").suffix.lower() or ".png"
        saved = UPLOAD_DIR / f"{uuid.uuid4().hex}{ext}"
        saved.write_bytes(raw)
        raw_file_path = str(saved)
        raw_type = "image"
        try:
            source_text = jd_parser.parse_image(raw, image.filename or "image.png")
        except RuntimeError as e:
            # OCR 失败但图片已存，让前端自己决定下一步
            raise HTTPException(400, str(e))
    else:
        raise HTTPException(400, "请提供 text 或 image 至少一个")

    # 启发式补 company / position
    if not company or not position:
        g, p = jd_parser.guess_company_position(source_text)
        company = company or g
        position = position or p

    with get_session() as db:
        jd = JD(
            company=company or "",
            position=position or "",
            source_text=source_text,
            raw_type=raw_type,
            raw_file_path=raw_file_path,
        )
        db.add(jd)
        db.commit()
        db.refresh(jd)
        return jd


@router.get("", response_model=list[JDOut])
def list_jds() -> list[JD]:
    with get_session() as db:
        stmt = select(JD).order_by(JD.uploaded_at.desc())
        return list(db.scalars(stmt))


@router.get("/{jd_id}", response_model=JDOut)
def get_jd(jd_id: int) -> JD:
    with get_session() as db:
        jd = db.get(JD, jd_id)
        if not jd:
            raise HTTPException(404, "未找到该 JD")
        return jd


@router.delete("/{jd_id}")
def delete_jd(jd_id: int) -> dict:
    with get_session() as db:
        jd = db.get(JD, jd_id)
        if not jd:
            raise HTTPException(404, "未找到该 JD")
        # 同步删磁盘文件
        if jd.raw_file_path:
            try:
                Path(jd.raw_file_path).unlink(missing_ok=True)
            except Exception:
                pass
        db.delete(jd)
    return {"ok": True, "id": jd_id}
