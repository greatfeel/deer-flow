"use client";

import { useCallback, useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

interface AutoTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minRows?: number;
  maxRows?: number;
  className?: string;
}

export function AutoTextarea({
  value,
  onChange,
  placeholder,
  disabled = false,
  minRows = 1,
  maxRows = 12,
  className,
}: AutoTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
    const minHeight = lineHeight * minRows + 12; // 12px for padding
    const maxHeight = lineHeight * maxRows + 12;
    const scrollHeight = textarea.scrollHeight;

    textarea.style.height = `${Math.min(Math.max(scrollHeight, minHeight), maxHeight)}px`;
  }, [minRows, maxRows]);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={minRows}
      className={cn(
        "border-input bg-background placeholder:text-muted-foreground w-full resize-none rounded-md border px-3 py-2 text-sm",
        "focus:ring-ring focus:ring-2 focus:ring-offset-1 focus:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    />
  );
}
