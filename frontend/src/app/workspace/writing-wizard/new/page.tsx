"use client";

import { useCallback, useEffect, useState } from "react";

import { GuideForm } from "@/components/writing-wizard/guide-form";
import { StepIndicator } from "@/components/writing-wizard/step-indicator";
import {
  getOrCreateSession,
  saveSession,
} from "@/core/writing-wizard/store";
import { type WritingGuideData } from "@/core/writing-wizard/types";

export default function WritingWizardNewPage() {
  const [data, setData] = useState<WritingGuideData | null>(null);

  useEffect(() => {
    const session = getOrCreateSession();
    setData(session.guideData);
  }, []);

  const handleChange = useCallback((newData: WritingGuideData) => {
    setData(newData);
    const session = getOrCreateSession();
    session.guideData = newData;
    session.currentStep = 1;
    saveSession(session);
  }, []);

  const handleComplete = useCallback(() => {
    const session = getOrCreateSession();
    session.currentStep = 2;
    saveSession(session);
  }, []);

  if (!data) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground text-sm">加载中...</div>
      </div>
    );
  }

  return (
    <div className="bg-background flex h-screen flex-col">
      {/* Header */}
      <header className="border-border flex flex-shrink-0 flex-col items-center border-b px-4">
        <StepIndicator currentStep={1} />
        <h1 className="text-foreground pb-3 text-lg font-semibold">
          填写方案编写指导
        </h1>
      </header>

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto pt-4">
        <GuideForm
          data={data}
          onChange={handleChange}
          onComplete={handleComplete}
        />
      </div>
    </div>
  );
}
