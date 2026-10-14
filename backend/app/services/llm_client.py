"""统一 LLM 客户端 — 用 langchain-openai ChatOpenAI，兼容所有 OpenAI Chat Completions 协议的 provider

支持的 provider（与前端 src/utils/ai.ts 对齐）：
  deepseek | openai | dashscope | doubao | zhipu | custom
"""
from __future__ import annotations

import json
import logging
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI

from ..config import settings

log = logging.getLogger(__name__)


def _new_llm(temperature: float = 0.3) -> ChatOpenAI:
    if not settings.llm_api_key:
        raise RuntimeError(
            "LLM_API_KEY 未配置。请在 backend/.env 里填好，"
            "或在 backend/ 目录执行：cp .env.example .env 然后编辑"
        )
    return ChatOpenAI(
        api_key=settings.llm_api_key,
        base_url=settings.llm_base_url,
        model=settings.llm_model,
        temperature=temperature,
        request_timeout=settings.llm_timeout,
        max_retries=1,
    )


def chat(system_prompt: str, user_prompt: str, temperature: float = 0.3) -> str:
    """最常用的一次调用 — 返回纯文本"""
    llm = _new_llm(temperature=temperature)
    chain = llm | StrOutputParser()
    return chain.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt),
    ])


def chat_json(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.3,
    *,
    fallback_on_fail: bool = True,
) -> Any:
    """要求 LLM 输出 JSON，返回解析后的 Python 对象"""
    raw = chat(system_prompt + "\n\n请严格输出 JSON，不要任何解释文字或 Markdown 包裹。",
               user_prompt,
               temperature=temperature)
    try:
        return json.loads(raw.strip())
    except Exception:
        if not fallback_on_fail:
            raise
        # 容错：尝试剥掉 ```json 包裹和首尾杂字
        text = raw.strip()
        if text.startswith("```"):
            start = text.index("\n") + 1
            end = text.rindex("```")
            text = text[start:end].strip()
        brace_start = text.find("{")
        brace_end = text.rfind("}")
        if brace_start != -1 and brace_end != -1 and brace_end > brace_start:
            text = text[brace_start:brace_end + 1]
            return json.loads(text)
        raise


def get_model_info() -> dict:
    return {
        "provider": settings.llm_provider,
        "model": settings.llm_model,
        "base_url": settings.llm_base_url,
    }
