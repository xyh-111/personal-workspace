"""LangGraph：JD → 三版打招呼语（简洁 / 热情 / 专业）"""
from __future__ import annotations

from typing import TypedDict, Any

from langgraph.graph import StateGraph, START, END

from ..services.llm_client import chat_json


# ---- State ----
class GreetingState(TypedDict, total=False):
    raw_jd: str                    # 原始输入 JD 文本
    cleaned_jd: str                # 清洗后
    focus: dict                    # 抽取出的 { company, position, keywords, hard_skills }
    styles: list[str]              # 要生成的风格列表
    versions: list[dict]           # [{ style, content }]
    error: str


# ---- Prompts ----
EXTRACT_SYSTEM = "你是招聘 JD 解析助手。严格输出 JSON。"
EXTRACT_USER = """请从以下 JD 文本里提取关键信息，输出 JSON：
{
  "company":   "公司名，找不到留空",
  "position":  "岗位名，找不到留空",
  "keywords":  ["3-6 个关键工作内容词"],
  "hard_skills": ["列出 JD 明确要求的技术栈 / 工具 / 平台"],
  "soft_skills": ["列出 JD 提到的软技能关键词"]
}

JD 文本：
---
{jd}
---"""

GENERATE_SYSTEM = """你是资深求职教练，帮求职者写给 HR 的打招呼语。
要求：
- 口语化、自然、不套路化
- 150–300 字
- 只输出打招呼语本身，不要解释或标题"""

GENERATE_USER = """请基于以下岗位信息，写打招呼语，风格：{style}

岗位关键词：{focus_summary}

JD 原文（供参考）：
{jd}"""


# ---- Nodes ----
def parse_jd_node(state: GreetingState) -> GreetingState:
    raw = state.get("raw_jd", "").strip()
    if not raw:
        return {"error": "JD 文本为空"}
    # 简单清洗：去多余空行
    cleaned = "\n".join(ln.strip() for ln in raw.splitlines() if ln.strip())
    return {"cleaned_jd": cleaned}


def extract_focus_node(state: GreetingState) -> GreetingState:
    cleaned = state.get("cleaned_jd", "")
    if state.get("error"):
        return state
    focus = chat_json(
        EXTRACT_SYSTEM,
        EXTRACT_USER.format(jd=cleaned),
        temperature=0.1,
    )
    return {"focus": focus}


def generate_node(state: GreetingState) -> GreetingState:
    if state.get("error"):
        return state
    cleaned = state.get("cleaned_jd", "")
    focus = state.get("focus") or {}
    styles = state.get("styles") or ["简洁", "热情", "专业"]

    summary_parts = []
    for k in ["company", "position", "keywords", "hard_skills", "soft_skills"]:
        v = focus.get(k)
        if v:
            summary_parts.append(f"{k}: {v}")
    focus_summary = "\n".join(summary_parts) if summary_parts else "（未能解析关键信息，可自行粘贴原始 JD 到上方输入框）"

    versions: list[dict] = []
    for style in styles:
        content = chat_json(
            GENERATE_SYSTEM,
            GENERATE_USER.format(style=style, focus_summary=focus_summary, jd=cleaned),
            temperature=0.7,
        )
        # chat_json 可能返回 dict（如果 LLM 包了对象），也可能直接返回字符串
        if isinstance(content, dict):
            content = content.get("content") or content.get("text") or str(content)
        versions.append({"style": style, "content": str(content).strip()})

    return {"versions": versions}


# ---- Graph ----
def build_greeting_graph():
    g = StateGraph(GreetingState)
    g.add_node("parse_jd", parse_jd_node)
    g.add_node("extract_focus", extract_focus_node)
    g.add_node("generate", generate_node)
    g.add_edge(START, "parse_jd")
    g.add_edge("parse_jd", "extract_focus")
    g.add_edge("extract_focus", "generate")
    g.add_edge("generate", END)
    return g.compile()


greeting_graph = build_greeting_graph()


def run_greeting(raw_jd: str, styles: list[str] | None = None) -> dict:
    """同步跑一遍 graph，返回完整 state dict"""
    initial: dict = {"raw_jd": raw_jd}
    if styles:
        initial["styles"] = styles
    result = greeting_graph.invoke(initial)
    return result
