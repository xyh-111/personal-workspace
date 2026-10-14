"""LangGraph：JD + 项目经历 → 改写后项目经历（STAR + 匹配评分 + hallucination guardrail）"""
from __future__ import annotations

import json
from typing import TypedDict, Any

from langgraph.graph import StateGraph, START, END

from ..services.llm_client import chat_json, chat


# ---- State ----
class RewriteState(TypedDict, total=False):
    raw_jd: str
    cleaned_jd: str
    experience_ids: list[int]
    experiences: list[dict]           # [{id, title, role, description, tech_stack, highlights}]
    jd_requirements: list[str]         # JD 拆成 requirement bullets
    matched: list[dict]                # [{experience_id, title, match_score, matched_keywords}]
    rewritten: list[dict]              # [{experience_id, original, rewritten, match_score}]
    checked: list[dict]               # 过了 fabric 检查后的最终版
    error: str


# ---- Prompts ----
REQUIREMENTS_SYSTEM = "你是招聘 JD 分析助手。严格输出 JSON。"
REQUIREMENTS_USER = """请把以下 JD 文本拆成具体的、可对照简历的要求条目（bullet），每条只说一件事。输出 JSON：

{{
  "requirements": [
    "3 年以上 React 开发经验",
    "熟悉 Webpack / Vite 构建工具",
    "有大型前端项目性能优化经验"
  ]
}}

JD：
---
{jd}
---"""

MATCH_SYSTEM = "你是简历匹配分析助手。严格输出 JSON。"
MATCH_USER = """请为下面这条项目经历，对照职位要求列表，评估匹配度。

项目经历：
标题：{title}
角色：{role}
技术栈：{tech_stack}
原文：{description}
亮点：{highlights}

职位要求：
{requirements_text}

输出 JSON：
{{
  "match_score": 0.0,          // 0.0 – 1.0
  "matched_keywords": ["列出 JD 里出现且项目里也出现的关键词"],
  "missing_keywords": ["JD 要但项目没有的关键词"]
}}"""

REWRITE_SYSTEM = """你是资深简历改写教练。改写时遵守：
1. 严禁编造不存在的项目、技术、数据、团队规模、上线时间
2. 把原有成果量化（"大幅提升"→"性能提升 40%"，如果原文没数据就保留原表述）
3. 强调和 JD 匹配的关键词（把 matched_keywords 自然融入）
4. 保持 STAR 结构（情境-任务-行动-结果）
5. 300–500 字，不要多余
6. 直接输出改写后的正文，不要标题或解释"""

REWRITE_USER = """请改写以下项目经历。

[原始经历]
标题：{title}
角色：{role}
技术栈：{tech_stack}
原文：{description}
亮点：{highlights}

[需要自然融入的 JD 关键词（{matched}）]
{matched}

[需要避免提及的关键词（{missing}）]
{missing}"""

FABRIC_CHECK_SYSTEM = """你是严格的简历安全检查官。
职责：判断改写后的经历里是否出现了原经历根本没有的关键技术 / 数据 / 项目。
严禁编造是最高优先级。严格输出 JSON。"""

FABRIC_CHECK_USER = """请比较原始经历和改写后的经历，检查改写是否出现了原文没有的内容。

[原始经历]
{original}

[改写后的经历]
{rewritten}

输出 JSON：
{{
  "ok": true,                     // 改写合格，无编造
  "hallucinated": ["原文没有但改写里出现的技术/词"],   // 只有 ok=false 时填
  "feedback": ""                  // 只有 ok=false 时简述
}}"""

FABRIC_REWRITE_USER = """安全检查未通过，改写里出现了原文没有的内容。请重写一次，严格禁止编造，同时自然融入 JD 关键词。原始经历和改写稿如下：

[原始经历]
{original}

[上一次改写（有编造）]
{rewritten}

[安全检查反馈]
{feedback}

请重新输出合格版本正文。"""


# ---- Nodes ----
def parse_jd_node(state: RewriteState) -> RewriteState:
    raw = state.get("raw_jd", "").strip()
    if not raw:
        return {"error": "JD 文本为空"}
    cleaned = "\n".join(ln.strip() for ln in raw.splitlines() if ln.strip())
    try:
        req = chat_json(
            REQUIREMENTS_SYSTEM,
            REQUIREMENTS_USER.format(jd=cleaned),
            temperature=0.1,
        )
        requirements = req.get("requirements", []) if isinstance(req, dict) else []
        if not isinstance(requirements, list):
            requirements = []
    except Exception:
        requirements = [cleaned]  # 兜底：整段当一条
    return {"cleaned_jd": cleaned, "jd_requirements": requirements}


def match_node(state: RewriteState) -> RewriteState:
    if state.get("error"):
        return state
    experiences = state.get("experiences") or []
    requirements = state.get("jd_requirements") or []
    req_text = "\n".join(f"- {r}" for r in requirements)

    matched: list[dict] = []
    for exp in experiences:
        try:
            m = chat_json(
                MATCH_SYSTEM,
                MATCH_USER.format(
                    title=exp.get("title", ""),
                    role=exp.get("role", ""),
                    tech_stack=exp.get("tech_stack", "") or "(无)",
                    description=exp.get("description", ""),
                    highlights=exp.get("highlights", "") or "(无)",
                    requirements_text=req_text or "(无)",
                ),
                temperature=0.0,
            )
            score = float(m.get("match_score", 0.0)) if isinstance(m, dict) else 0.0
            kw = m.get("matched_keywords", []) if isinstance(m, dict) else []
            if not isinstance(kw, list): kw = []
            matched.append({
                "experience_id": exp["id"],
                "title": exp.get("title", ""),
                "match_score": round(min(max(score, 0.0), 1.0), 3),
                "matched_keywords": kw,
                "exp": exp,
            })
        except Exception:
            matched.append({
                "experience_id": exp["id"],
                "title": exp.get("title", ""),
                "match_score": 0.0,
                "matched_keywords": [],
                "exp": exp,
            })
    return {"matched": matched}


def rewrite_node(state: RewriteState) -> RewriteState:
    if state.get("error"):
        return state
    matched = state.get("matched") or []

    rewritten: list[dict] = []
    for m in matched:
        exp = m.get("exp") or {}
        keywords = m.get("matched_keywords") or []
        missing = []  # 简化：这里不从 requirements 里算 missing，让安全检查兜底
        try:
            content = chat(
                REWRITE_SYSTEM,
                REWRITE_USER.format(
                    title=exp.get("title", ""),
                    role=exp.get("role", ""),
                    tech_stack=exp.get("tech_stack", "") or "(无)",
                    description=exp.get("description", ""),
                    highlights=exp.get("highlights", "") or "(无)",
                    matched="、".join(keywords) if keywords else "(无明显匹配关键词)",
                    missing="、".join(missing) if missing else "(无需要避免的关键词)",
                ),
                temperature=0.3,
            ).strip()
        except Exception as e:
            content = f"[改写失败，请稍后重试: {e}]"
        rewritten.append({
            "experience_id": m["experience_id"],
            "original_title": exp.get("title", ""),
            "original": exp.get("description", ""),
            "rewritten": content,
            "match_score": m.get("match_score", 0.0),
        })
    return {"rewritten": rewritten}


def check_node(state: RewriteState) -> RewriteState:
    """Hallucination guardrail：不合格重写一次，还不合格就标记 warning"""
    if state.get("error"):
        return state
    rewritten = state.get("rewritten") or []
    checked: list[dict] = []
    for r in rewritten:
        exp = (state.get("matched") or [{}])  # 简化：原始经历在 matched[i].exp 里
        # 找对应的原始经历
        original_exp = None
        for m in (state.get("matched") or []):
            if m.get("experience_id") == r["experience_id"]:
                original_exp = m.get("exp")
                break

        if not original_exp:
            checked.append({**r, "warning": None})
            continue

        original_block = (
            f"标题：{original_exp.get('title','')}\n"
            f"角色：{original_exp.get('role','')}\n"
            f"技术栈：{original_exp.get('tech_stack','')}\n"
            f"原文：{original_exp.get('description','')}\n"
            f"亮点：{original_exp.get('highlights','')}"
        )
        try:
            check = chat_json(
                FABRIC_CHECK_SYSTEM,
                FABRIC_CHECK_USER.format(
                    original=original_block,
                    rewritten=r["rewritten"],
                ),
                temperature=0.0,
            )
            ok = bool(check.get("ok", True)) if isinstance(check, dict) else True
            if ok:
                checked.append({**r, "warning": None})
            else:
                # 重写一次
                try:
                    fixed = chat(
                        REWRITE_SYSTEM + "\n\n" + FABRIC_CHECK_USER.format(
                            original=original_block,
                            rewritten=r["rewritten"],
                            feedback=(check.get("feedback") or "") if isinstance(check, dict) else "",
                        ),
                        FABRIC_REWRITE_USER.format(
                            original=original_block,
                            rewritten=r["rewritten"],
                            feedback=(check.get("feedback") or "改写出现了原文没有的内容") if isinstance(check, dict) else "",
                        ),
                        temperature=0.2,
                    ).strip()
                    checked.append({**r, "rewritten": fixed, "warning": None})
                except Exception:
                    checked.append({**r, "warning": "改写出现了原文没有的内容，请人工核对"})
        except Exception:
            checked.append({**r, "warning": None})
    return {"checked": checked}


# ---- Graph ----
def build_rewrite_graph():
    g = StateGraph(RewriteState)
    g.add_node("parse_jd", parse_jd_node)
    g.add_node("match", match_node)
    g.add_node("rewrite", rewrite_node)
    g.add_node("check_fabrication", check_node)
    g.add_edge(START, "parse_jd")
    g.add_edge("parse_jd", "match")
    g.add_edge("match", "rewrite")
    g.add_edge("rewrite", "check_fabrication")
    g.add_edge("check_fabrication", END)
    return g.compile()


rewrite_graph = build_rewrite_graph()


def run_rewrite(raw_jd: str, experiences: list[dict]) -> dict:
    initial: dict = {"raw_jd": raw_jd, "experiences": experiences}
    return rewrite_graph.invoke(initial)
