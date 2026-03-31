"""Writing Wizard API — AI-powered clinical research protocol field generation.

Generates content for fields 2-10 of the Writing Guide form.
Field 1 (keywords) is user-provided; no backend generation needed.
"""

import logging
from collections.abc import Callable

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from deerflow.models import create_chat_model

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["writing-wizard"])


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------


class DrugInfo(BaseModel):
    trialDrug: str = ""
    drugPackaging: str = ""
    manufacturer: str = ""


class GenerateFieldRequest(BaseModel):
    """Request to generate content for a specific guide form field."""

    field: str = Field(..., description="Field name to generate: researchTitle, trialObjective, subjects, overallDesign, treatmentPlan, etc.")
    keywords: list[str] = Field(default_factory=list, description="Research keywords (required for most fields)")
    researchTitle: str = ""
    studyForm: str = ""
    trialObjective: str = ""
    drugInfo: DrugInfo = Field(default_factory=DrugInfo)
    subjects: str = ""
    overallDesign: str = ""
    model_name: str | None = Field(default=None, description="Optional model override")


class GenerateFieldResponse(BaseModel):
    content: str = Field(..., description="Generated content for the requested field")


# ---------------------------------------------------------------------------
# Prompt builders — one per generatable field
# ---------------------------------------------------------------------------


def _build_research_title_prompt(req: GenerateFieldRequest) -> str:
    kw = "、".join(req.keywords)
    return (
        "你是一位资深的临床研究方案撰写专家。\n"
        f"请根据以下研究关键词，生成一个规范的临床研究方案题目。\n\n"
        f"研究关键词：{kw}\n\n"
        "要求：\n"
        "1. 题目应包含研究药物/干预措施、适应症、研究类型等关键要素\n"
        "2. 使用中文，符合中国临床试验方案命名规范\n"
        "3. 只返回题目文本，不要包含编号、引号或额外解释\n"
        "4. 题目长度控制在 30-80 个汉字之间\n"
    )


def _build_trial_objective_prompt(req: GenerateFieldRequest) -> str:
    kw = "、".join(req.keywords)
    return (
        "你是一位资深的临床研究方案撰写专家。\n"
        f"请根据以下信息，撰写临床研究的试验目的。\n\n"
        f"研究关键词：{kw}\n"
        f"研究题目：{req.researchTitle}\n"
        f"研究形式：{req.studyForm}\n\n"
        "要求：\n"
        "1. 明确说明主要目的（安全性/有效性/药代动力学等）\n"
        "2. 如有次要目的也应列出\n"
        "3. 使用中文，语言简洁、专业\n"
        "4. 只返回试验目的的文本内容，不要包含标题或额外解释\n"
    )


def _build_subjects_prompt(req: GenerateFieldRequest) -> str:
    kw = "、".join(req.keywords)
    return (
        "你是一位资深的临床研究方案撰写专家。\n"
        f"请根据以下信息，描述本研究的受试者人群。\n\n"
        f"研究关键词：{kw}\n"
        f"研究题目：{req.researchTitle}\n"
        f"试验目的：{req.trialObjective}\n"
        f"试验用药：{req.drugInfo.trialDrug}\n\n"
        "要求：\n"
        "1. 明确受试者的疾病类型、分期、年龄范围等基本特征\n"
        "2. 使用中文，语言简洁、专业\n"
        "3. 只返回受试者描述文本，1-3 句话即可\n"
    )


def _build_overall_design_prompt(req: GenerateFieldRequest) -> str:
    kw = "、".join(req.keywords)
    return (
        "你是一位资深的临床研究方案撰写专家。\n"
        f"请根据以下信息，撰写本研究的总体设计描述。\n\n"
        f"研究关键词：{kw}\n"
        f"研究题目：{req.researchTitle}\n"
        f"研究形式：{req.studyForm}\n"
        f"试验目的：{req.trialObjective}\n"
        f"受试者：{req.subjects}\n\n"
        "要求：\n"
        "1. 说明试验类型（如单臂/双臂、开放/盲法、剂量递增等）\n"
        "2. 使用中文，语言简洁、专业\n"
        "3. 只返回总体设计描述文本，1-3 句话即可\n"
    )


def _build_treatment_plan_prompt(req: GenerateFieldRequest) -> str:
    kw = "、".join(req.keywords)
    return (
        "你是一位资深的临床研究方案撰写专家。\n"
        f"请根据以下信息，生成本研究的治疗方案，聚焦于试验分组（armGroups）和干预措施（interventions）。\n\n"
        f"研究关键词：{kw}\n"
        f"研究题目：{req.researchTitle}\n"
        f"试验目的：{req.trialObjective}\n"
        f"试验用药：{req.drugInfo.trialDrug}\n"
        f"用药包装：{req.drugInfo.drugPackaging}\n"
        f"生产企业：{req.drugInfo.manufacturer}\n"
        f"受试者：{req.subjects}\n"
        f"总体设计：{req.overallDesign}\n\n"
        "重点内容（必须包含）：\n"
        "- 试验分组（armGroups）：列出每个试验组（如对照组、干预组、不同剂量组），说明每组的类型（如 EXPERIMENTAL、ACTIVE_COMPARATOR）、描述、对应的干预措施名称\n"
        "- 干预措施（interventions）：列出每项干预（药物/手术/其他），说明类型、名称、给药描述、适用组别\n"
        "- 如涉及剂量递增，详细说明各剂量组设置、递增原则、操作流程、MTD 定义\n\n"
        "输出格式必须严格如下：\n\n"
        "【数据来源】\n"
        "逐条列出你参考的来源，每条一行，格式如：\n"
        "- ClinicalTrials.gov：NCTxxxxxxxx 研究\n"
        "- PubMed：PMID xxxxxxxx，作者 et al., 年份\n"
        "- CSCO 指南（xxxx版）：相关推荐方案\n"
        "- 中国临床试验注册中心（ChiCTR）：ChiCTR-xxxxxxx\n\n"
        "【试验分组】\n"
        "逐组描述，每组包含：组名、组类型、组描述、包含的干预措施\n\n"
        "【干预措施】\n"
        "逐项描述，每项包含：干预类型、名称、给药方式/描述、适用组别\n\n"
        "【剂量递增方案】（如适用）\n"
        "递增原则、各剂量组设置、操作流程、MTD 定义等\n\n"
        "要求：\n"
        "1. 使用中文，语言专业、条理清晰\n"
        "2. 数据来源必须真实可查，不得捏造\n"
    )


# Field → prompt builder mapping
FIELD_PROMPT_BUILDERS: dict[str, Callable[[GenerateFieldRequest], str]] = {
    "researchTitle": _build_research_title_prompt,
    "trialObjective": _build_trial_objective_prompt,
    "subjects": _build_subjects_prompt,
    "overallDesign": _build_overall_design_prompt,
    "treatmentPlan": _build_treatment_plan_prompt,
}


def _extract_response_text(content: object) -> str:
    """Extract plain text from LLM response content (may be str or list of blocks)."""
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict) and block.get("type") in {"text", "output_text"}:
                text = block.get("text")
                if isinstance(text, str):
                    parts.append(text)
        return "\n".join(parts).strip()
    if content is None:
        return ""
    return str(content).strip()


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------


@router.post(
    "/writing-wizard/generate",
    response_model=GenerateFieldResponse,
    summary="Generate Writing Guide Field",
    description="Generate content for a specific field of the clinical research protocol writing guide.",
)
async def generate_field(request: GenerateFieldRequest) -> GenerateFieldResponse:
    field = request.field

    if field not in FIELD_PROMPT_BUILDERS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported field: {field}. Supported fields: {', '.join(FIELD_PROMPT_BUILDERS.keys())}",
        )

    if not request.keywords:
        raise HTTPException(status_code=400, detail="Keywords are required for generation")

    prompt_builder = FIELD_PROMPT_BUILDERS[field]
    prompt = prompt_builder(request)

    try:
        model = create_chat_model(name=request.model_name, thinking_enabled=False)
        response = model.invoke(prompt)
        content = _extract_response_text(response.content)
        return GenerateFieldResponse(content=content)
    except Exception as exc:
        logger.exception("Failed to generate field %s: %s", field, exc)
        raise HTTPException(status_code=500, detail=f"Failed to generate content: {exc}") from exc
