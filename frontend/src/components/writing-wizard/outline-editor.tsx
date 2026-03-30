"use client";

import { useCallback, useRef, useState } from "react";

import {
  type AiEditorAPI,
  AiEditorWrapper,
} from "@/components/editor/ai-editor-wrapper";
import {
  getOrCreateSession,
  saveSession,
} from "@/core/writing-wizard/store";

const OUTLINE_DRAFT_KEY = "writing-wizard-outline-draft";

// 临床研究方案标准目录模板
const DEFAULT_OUTLINE_TEMPLATE = `# 临床研究方案

## 1 研究摘要
### 1.1 方案摘要表

## 2 研究背景
### 2.1 疾病概述
### 2.2 治疗现状
### 2.3 研究药物简介
### 2.4 非临床研究
### 2.5 临床研究
### 2.6 研究获益/风险分析

## 3 研究目的
### 3.1 主要目的
### 3.2 次要目的

## 4 研究设计
### 4.1 总体设计
### 4.2 研究人群
### 4.3 受试者例数
### 4.4 试验流程

## 5 受试者的选择
### 5.1 纳入标准
### 5.2 排除标准
### 5.3 退出标准
### 5.4 中止标准
### 5.5 中止/退出的处理程序

## 6 治疗方案
### 6.1 试验用药物
### 6.2 给药方案
### 6.3 剂量调整
### 6.4 合并用药

## 7 有效性评价
### 7.1 有效性指标
### 7.2 有效性评价方法
### 7.3 有效性评价时间

## 8 安全性评价
### 8.1 安全性指标
### 8.2 不良事件
### 8.3 严重不良事件
### 8.4 不良事件的记录和报告

## 9 统计分析
### 9.1 分析数据集
### 9.2 统计分析方法
### 9.3 缺失数据处理

## 10 数据管理和质量控制
### 10.1 数据管理
### 10.2 质量控制

## 11 伦理学
### 11.1 伦理委员会
### 11.2 知情同意
### 11.3 受试者隐私保护

## 12 参考文献

## 附录
### 附录1 知情同意书
### 附录2 研究者简历
### 附录3 实验室检查正常值范围
`;

export function OutlineEditor() {
  const editorRef = useRef<AiEditorAPI | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);

  const handleReady = useCallback((api: AiEditorAPI) => {
    editorRef.current = api;

    // 仅在首次打开且无草稿时填入模板
    if (!initialized.current) {
      initialized.current = true;
      const session = getOrCreateSession();
      if (session.outlineMarkdown) {
        api.setMarkdownContent(session.outlineMarkdown);
      } else {
        const draft = localStorage.getItem(OUTLINE_DRAFT_KEY);
        if (!draft || draft.trim().length < 10) {
          api.setMarkdownContent(DEFAULT_OUTLINE_TEMPLATE);
        }
      }
    }
  }, []);

  const handleChange = useCallback((html: string) => {
    setSaveStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(OUTLINE_DRAFT_KEY, html);
      setSaveStatus("saved");
    }, 1000);

    const text = html.replace(/<[^>]+>/g, "").trim();
    setWordCount(text.length);
  }, []);

  const handleComplete = useCallback(() => {
    const session = getOrCreateSession();
    if (editorRef.current) {
      session.outlineMarkdown = editorRef.current.getMarkdown();
    }
    session.currentStep = 3;
    saveSession(session);
    // 使用 window.location 避免 Next.js 软导航与 AiEditor 冲突
    window.location.href = "/workspace/writing-wizard/generate";
  }, []);

  const handleBack = useCallback(() => {
    if (editorRef.current) {
      const session = getOrCreateSession();
      session.outlineMarkdown = editorRef.current.getMarkdown();
      saveSession(session);
    }
    window.location.href = "/workspace/writing-wizard/new";
  }, []);

  return (
    <div className="flex min-h-0 flex-1">
      {/* 与 ai-editor-panel.tsx 相同的布局模式 */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AiEditorWrapper
          draftKey={OUTLINE_DRAFT_KEY}
          onChange={handleChange}
          onReady={handleReady}
        />
        {/* 状态栏 */}
        <div className="border-border bg-background flex flex-shrink-0 items-center gap-2 border-t px-4 py-1.5 text-xs text-muted-foreground">
          <span>
            {saveStatus === "saving" ? "正在保存..." : "已自动保存"}
          </span>
          <span>·</span>
          <span>{wordCount} 字</span>
        </div>
        {/* 导航按钮栏 */}
        <div className="border-border bg-background flex flex-shrink-0 items-center justify-end gap-3 border-t px-4 py-2">
          <button
            type="button"
            onClick={handleBack}
            className="border-input bg-background text-foreground hover:bg-accent rounded-md border px-4 py-1.5 text-sm transition-colors"
          >
            上一步
          </button>
          <button
            type="button"
            onClick={handleComplete}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-6 py-1.5 text-sm font-medium transition-colors"
          >
            完成，进入下一步
          </button>
        </div>
      </div>
    </div>
  );
}
