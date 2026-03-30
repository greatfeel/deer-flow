"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
}

const STEPS = [
  { step: 1 as const, label: "填写方案编写指导" },
  { step: 2 as const, label: "编制方案目录" },
  { step: 3 as const, label: "生成研究方案" },
];

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {STEPS.map(({ step, label }, index) => (
        <div key={step} className="flex items-center gap-2">
          {/* 步骤圆圈 */}
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex size-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                step < currentStep &&
                  "bg-primary text-primary-foreground",
                step === currentStep &&
                  "bg-primary text-primary-foreground ring-primary/30 ring-4",
                step > currentStep &&
                  "bg-muted text-muted-foreground",
              )}
            >
              {step < currentStep ? (
                <Check className="size-4" />
              ) : (
                step
              )}
            </div>
            <span
              className={cn(
                "text-sm whitespace-nowrap",
                step === currentStep
                  ? "text-foreground font-medium"
                  : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </div>

          {/* 连接线 */}
          {index < STEPS.length - 1 && (
            <div
              className={cn(
                "h-px w-12",
                step < currentStep ? "bg-primary" : "bg-border",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
