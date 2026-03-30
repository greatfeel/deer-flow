"use client";

import { OutlineEditor } from "@/components/writing-wizard/outline-editor";
import { StepIndicator } from "@/components/writing-wizard/step-indicator";

export default function WritingWizardOutlinePage() {
  return (
    <div className="bg-background flex h-screen flex-col">
      {/* Header */}
      <header className="border-border flex flex-shrink-0 flex-col items-center border-b px-4">
        <StepIndicator currentStep={2} />
        <h1 className="text-foreground pb-3 text-lg font-semibold">
          编制方案目录
        </h1>
      </header>

      {/* Editor area */}
      <OutlineEditor />
    </div>
  );
}
