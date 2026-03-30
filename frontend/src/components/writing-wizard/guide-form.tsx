"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { type WritingGuideData } from "@/core/writing-wizard/types";
import { cn } from "@/lib/utils";

import { AutoTextarea } from "./auto-textarea";
import { KeywordInput } from "./keyword-input";

interface GuideFormProps {
  data: WritingGuideData;
  onChange: (data: WritingGuideData) => void;
  onComplete: () => void;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-border border-b pb-2 pt-6 first:pt-0">
      <h3 className="text-foreground text-base font-semibold">{children}</h3>
    </div>
  );
}

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="text-foreground mb-1.5 block text-sm font-medium">
      {children}
      {required && <span className="text-destructive ml-1">*</span>}
    </label>
  );
}

function GenerateButton({
  onClick,
  loading,
  label = "生成",
}: {
  onClick: () => void;
  loading: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cn(
        "bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      {loading ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Sparkles className="size-3.5" />
      )}
      {label}
    </button>
  );
}

export function GuideForm({ data, onChange, onComplete }: GuideFormProps) {
  const router = useRouter();
  const [generatingFields, setGeneratingFields] = useState<
    Record<string, boolean>
  >({});

  const updateField = useCallback(
    <K extends keyof WritingGuideData>(
      field: K,
      value: WritingGuideData[K],
    ) => {
      onChange({ ...data, [field]: value });
    },
    [data, onChange],
  );

  const updateDrugInfo = useCallback(
    (field: keyof WritingGuideData["drugInfo"], value: string) => {
      onChange({
        ...data,
        drugInfo: { ...data.drugInfo, [field]: value },
      });
    },
    [data, onChange],
  );

  const updateEndpoints = useCallback(
    (field: keyof WritingGuideData["endpoints"], value: string) => {
      onChange({
        ...data,
        endpoints: { ...data.endpoints, [field]: value },
      });
    },
    [data, onChange],
  );

  // AI 生成 stub — 后续接入后端
  const handleGenerate = useCallback(
    (fieldName: string) => {
      if (data.keywords.length === 0 && fieldName !== "treatmentPlan") {
        toast.error("请先输入研究关键词");
        return;
      }
      setGeneratingFields((prev) => ({ ...prev, [fieldName]: true }));
      toast.info("AI 生成功能将在后端逻辑完成后启用");
      setTimeout(() => {
        setGeneratingFields((prev) => ({ ...prev, [fieldName]: false }));
      }, 1500);
    },
    [data.keywords],
  );

  const handleComplete = useCallback(() => {
    if (data.keywords.length === 0) {
      toast.error("请至少输入一个研究关键词");
      return;
    }
    if (!data.researchTitle.trim()) {
      toast.error("请填写研究题目");
      return;
    }
    onComplete();
    router.push("/workspace/writing-wizard/outline");
  }, [data, onComplete, router]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-6 pb-24">
      {/* ===== 1) 研究关键词 ===== */}
      <SectionTitle>基本信息</SectionTitle>

      <div>
        <FieldLabel required>研究关键词</FieldLabel>
        <KeywordInput
          value={data.keywords}
          onChange={(keywords) => updateField("keywords", keywords)}
        />
        <p className="text-muted-foreground mt-1 text-xs">
          输入后按回车添加，可从下拉列表中选择
        </p>
      </div>

      {/* ===== 2) 研究题目 ===== */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <FieldLabel required>研究题目</FieldLabel>
          <GenerateButton
            onClick={() => handleGenerate("researchTitle")}
            loading={!!generatingFields.researchTitle}
          />
        </div>
        <AutoTextarea
          value={data.researchTitle}
          onChange={(v) => updateField("researchTitle", v)}
          placeholder="输入研究题目，或点击生成按钮根据关键词自动生成..."
          minRows={2}
        />
      </div>

      {/* ===== 3) 方案编号 ===== */}
      <div>
        <FieldLabel>方案编号</FieldLabel>
        <input
          type="text"
          value={data.protocolNumber}
          onChange={(e) => updateField("protocolNumber", e.target.value)}
          placeholder="如：HTSH-NK-001"
          className="border-input bg-background placeholder:text-muted-foreground focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
        />
      </div>

      {/* ===== 4) 版本号 ===== */}
      <div>
        <FieldLabel>版本号</FieldLabel>
        <input
          type="text"
          value={data.versionNumber}
          onChange={(e) => updateField("versionNumber", e.target.value)}
          placeholder="如：1.0.0"
          className="border-input bg-background placeholder:text-muted-foreground focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
        />
      </div>

      {/* ===== 5) 研究形式 ===== */}
      <div>
        <FieldLabel>研究形式</FieldLabel>
        <input
          type="text"
          value={data.studyForm}
          onChange={(e) => updateField("studyForm", e.target.value)}
          className="border-input bg-background placeholder:text-muted-foreground focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
        />
      </div>

      {/* ===== 6) 试验目的 ===== */}
      <SectionTitle>试验设计</SectionTitle>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <FieldLabel>试验目的</FieldLabel>
          <GenerateButton
            onClick={() => handleGenerate("trialObjective")}
            loading={!!generatingFields.trialObjective}
          />
        </div>
        <AutoTextarea
          value={data.trialObjective}
          onChange={(v) => updateField("trialObjective", v)}
          placeholder="如：评价自体NK细胞治疗MRD阳性急性髓系白血病的安全性及初步有效性评价"
          minRows={2}
        />
      </div>

      {/* ===== 7) 研究药物 ===== */}
      <div className="space-y-3">
        <FieldLabel>研究药物</FieldLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">
              试验用药
            </label>
            <input
              type="text"
              value={data.drugInfo.trialDrug}
              onChange={(e) => updateDrugInfo("trialDrug", e.target.value)}
              placeholder="如：自体NK细胞"
              className="border-input bg-background placeholder:text-muted-foreground focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">
              试验用药包装
            </label>
            <input
              type="text"
              value={data.drugInfo.drugPackaging}
              onChange={(e) => updateDrugInfo("drugPackaging", e.target.value)}
              placeholder="如：输液袋"
              className="border-input bg-background placeholder:text-muted-foreground focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">
              生产企业
            </label>
            <input
              type="text"
              value={data.drugInfo.manufacturer}
              onChange={(e) => updateDrugInfo("manufacturer", e.target.value)}
              className="border-input bg-background placeholder:text-muted-foreground focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* ===== 8) 受试者 ===== */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <FieldLabel>受试者</FieldLabel>
          <GenerateButton
            onClick={() => handleGenerate("subjects")}
            loading={!!generatingFields.subjects}
          />
        </div>
        <AutoTextarea
          value={data.subjects}
          onChange={(v) => updateField("subjects", v)}
          placeholder="如：本研究针对膝骨关节炎患者"
          minRows={2}
        />
      </div>

      {/* ===== 9) 总体设计 ===== */}
      <div>
        <FieldLabel>总体设计</FieldLabel>
        <AutoTextarea
          value={data.overallDesign}
          onChange={(v) => updateField("overallDesign", v)}
          minRows={2}
        />
      </div>

      {/* ===== 10) 治疗方案 ===== */}
      <SectionTitle>治疗方案</SectionTitle>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <FieldLabel>治疗方案</FieldLabel>
          <GenerateButton
            onClick={() => handleGenerate("treatmentPlan")}
            loading={!!generatingFields.treatmentPlan}
            label="自动生成"
          />
        </div>
        <AutoTextarea
          value={data.treatmentPlan}
          onChange={(v) => updateField("treatmentPlan", v)}
          placeholder="可手工输入，或点击自动生成按钮从 clinicaltrials.gov 等来源获取..."
          disabled={!!generatingFields.treatmentPlan}
          minRows={6}
        />
      </div>

      {/* ===== 11) 诊断标准 ===== */}
      <SectionTitle>受试者标准</SectionTitle>

      <div>
        <FieldLabel>诊断标准</FieldLabel>
        <AutoTextarea
          value={data.diagnosticCriteria}
          onChange={(v) => updateField("diagnosticCriteria", v)}
          minRows={2}
        />
      </div>

      {/* ===== 12) 受试者例数 ===== */}
      <div>
        <FieldLabel>受试者例数</FieldLabel>
        <AutoTextarea
          value={data.sampleSize}
          onChange={(v) => updateField("sampleSize", v)}
          minRows={2}
        />
      </div>

      {/* ===== 13) 试验设计 ===== */}
      <div>
        <FieldLabel>试验设计</FieldLabel>
        <AutoTextarea
          value={data.trialDesign}
          onChange={(v) => updateField("trialDesign", v)}
          minRows={2}
        />
      </div>

      {/* ===== 14) 纳入标准 ===== */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <FieldLabel>纳入标准</FieldLabel>
          <GenerateButton
            onClick={() => handleGenerate("inclusionCriteria")}
            loading={!!generatingFields.inclusionCriteria}
            label="自动生成"
          />
        </div>
        <AutoTextarea
          value={data.inclusionCriteria}
          onChange={(v) => updateField("inclusionCriteria", v)}
          placeholder="可手工输入，或点击自动生成按钮从临床试验数据库获取..."
          disabled={!!generatingFields.inclusionCriteria}
          minRows={4}
        />
      </div>

      {/* ===== 15) 排除标准 ===== */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <FieldLabel>排除标准</FieldLabel>
          <GenerateButton
            onClick={() => handleGenerate("exclusionCriteria")}
            loading={!!generatingFields.exclusionCriteria}
            label="自动生成"
          />
        </div>
        <AutoTextarea
          value={data.exclusionCriteria}
          onChange={(v) => updateField("exclusionCriteria", v)}
          placeholder="可手工输入，或点击自动生成按钮从临床试验数据库获取..."
          disabled={!!generatingFields.exclusionCriteria}
          minRows={4}
        />
      </div>

      {/* ===== 16) 退出标准 ===== */}
      <SectionTitle>退出与中止</SectionTitle>

      <div>
        <FieldLabel>退出标准</FieldLabel>
        <AutoTextarea
          value={data.withdrawalCriteria}
          onChange={(v) => updateField("withdrawalCriteria", v)}
          minRows={6}
        />
      </div>

      {/* ===== 17) 中止标准 ===== */}
      <div>
        <FieldLabel>中止标准</FieldLabel>
        <AutoTextarea
          value={data.terminationCriteria}
          onChange={(v) => updateField("terminationCriteria", v)}
          minRows={4}
        />
      </div>

      {/* ===== 18) 中止/退出的处理程序 ===== */}
      <div>
        <FieldLabel>中止/退出的处理程序</FieldLabel>
        <AutoTextarea
          value={data.withdrawalProcedure}
          onChange={(v) => updateField("withdrawalProcedure", v)}
          minRows={3}
        />
      </div>

      {/* ===== 19) 研究终点 ===== */}
      <SectionTitle>研究终点</SectionTitle>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <FieldLabel>研究终点</FieldLabel>
          <GenerateButton
            onClick={() => handleGenerate("endpoints")}
            loading={!!generatingFields.endpoints}
            label="自动生成"
          />
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">
              研究目的
            </label>
            <AutoTextarea
              value={data.endpoints.researchObjective}
              onChange={(v) => updateEndpoints("researchObjective", v)}
              placeholder="如：本研究为开放标签、单臂、回顾性+前瞻性临床研究..."
              minRows={3}
            />
          </div>
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">
              测试标准
            </label>
            <AutoTextarea
              value={data.endpoints.outcomeMeasures}
              onChange={(v) => updateEndpoints("outcomeMeasures", v)}
              placeholder="主要终点和次要终点..."
              disabled={!!generatingFields.endpoints}
              minRows={3}
            />
          </div>
        </div>
      </div>

      {/* ===== 20) 统计分析 ===== */}
      <SectionTitle>统计分析</SectionTitle>

      <div>
        <FieldLabel>统计分析</FieldLabel>
        <AutoTextarea
          value={data.statisticalAnalysis}
          onChange={(v) => updateField("statisticalAnalysis", v)}
          minRows={4}
        />
      </div>

      {/* ===== 完成按钮 ===== */}
      <div className="border-border sticky bottom-0 flex justify-end border-t bg-gradient-to-t from-background to-background/80 pt-4 pb-6 backdrop-blur-sm">
        <button
          type="button"
          onClick={handleComplete}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-8 py-2.5 text-sm font-medium shadow-sm transition-colors"
        >
          完成，进入下一步
        </button>
      </div>
    </div>
  );
}
