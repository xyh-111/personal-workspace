"""JD 解析 — 文本直接用，图片走 OCR（pytesseract 可选依赖）"""
from __future__ import annotations

import io
import logging

log = logging.getLogger(__name__)


def parse_text(raw: str) -> str:
    """清洗 JD 纯文本：去多余空行 / 首尾空白"""
    lines = [ln.strip() for ln in raw.splitlines()]
    lines = [ln for ln in lines if ln]
    return "\n".join(lines).strip()


def parse_image(image_bytes: bytes, filename: str = "image.png") -> str:
    """
    图片 → OCR 文本。
    - 优先用 pytesseract（本地）
    - 没有 pytesseract → 返回错误信息给前端，提示"请直接粘贴文本"
    """
    try:
        from PIL import Image  # type: ignore
        import pytesseract  # type: ignore
    except ImportError as e:
        log.warning("OCR 依赖缺失：%s — 请 `pip install pillow pytesseract` 并在系统装 Tesseract", e)
        raise RuntimeError(
            "OCR 依赖未安装。可选方案：\n"
            "  1. pip install pillow pytesseract\n"
            "  2. 在系统安装 Tesseract（Windows: https://github.com/UB-Mannheim/tesseract/wiki）\n"
            "  3. 或直接粘贴 JD 文本效果更好"
        ) from e

    img = Image.open(io.BytesIO(image_bytes))
    # 中文 + 英文
    try:
        text = pytesseract.image_to_string(img, lang="chi_sim+eng")
    except pytesseract.TesseractNotFoundError as e:
        raise RuntimeError(
            "Tesseract 未安装或 PATH 未配置。Windows 安装："
            "https://github.com/UB-Mannheim/tesseract/wiki"
        ) from e
    except Exception:
        # 英文回退
        text = pytesseract.image_to_string(img)

    return parse_text(text)


def guess_company_position(text: str) -> tuple[str, str]:
    """从 JD 文本启发式猜公司 / 岗位（简单规则，不对也无所谓）"""
    company = ""
    position = ""
    for ln in text.splitlines():
        ln = ln.strip()
        if not ln:
            continue
        lower = ln.lower()
        if any(k in ln for k in ["公司", "Company", "Organisation"]):
            company = ln[:80]
        if any(k in ln for k in ["岗位", "职位", "Position", "Job"]):
            position = ln[:80]
        if company and position:
            break
    return company, position
