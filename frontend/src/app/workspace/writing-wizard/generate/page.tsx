"use client";

import { GenerateChat } from "@/components/writing-wizard/generate-chat";
import { StepIndicator } from "@/components/writing-wizard/step-indicator";

export default function WritingWizardGeneratePage() {
  return (
    <div className="bg-background flex h-screen flex-col">
      {/* Header */}
      <header className="border-border flex flex-shrink-0 flex-col items-center border-b px-4">
        <StepIndicator currentStep={3} />
        <h1 className="text-foreground pb-3 text-lg font-semibold">
          生成研究方案
        </h1>
      </header>

      {/* Chat area */}
      <GenerateChat />
    </div>
  );
}
