"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

// 预设关键词列表（后续可从后端获取）
const PRESET_KEYWORDS = [
  "NK细胞",
  "CAR-T",
  "免疫治疗",
  "靶向治疗",
  "白血病",
  "淋巴瘤",
  "肺癌",
  "乳腺癌",
  "肝癌",
  "结直肠癌",
  "胃癌",
  "骨关节炎",
  "类风湿关节炎",
  "糖尿病",
  "PD-1",
  "PD-L1",
  "干细胞",
  "细胞治疗",
  "基因治疗",
  "单抗",
  "双抗",
  "ADC",
  "mRNA",
  "临床试验",
  "I期",
  "II期",
  "III期",
  "剂量递增",
  "安全性",
  "有效性",
  "三阴性乳腺癌",
  "非小细胞肺癌",
  "急性髓系白血病",
  "MRD阳性",
  "门静脉癌栓",
];

interface KeywordInputProps {
  value: string[];
  onChange: (keywords: string[]) => void;
  placeholder?: string;
}

export function KeywordInput({
  value,
  onChange,
  placeholder = "输入关键词后按回车添加...",
}: KeywordInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions = inputValue.trim()
    ? PRESET_KEYWORDS.filter(
        (kw) =>
          kw.toLowerCase().includes(inputValue.toLowerCase()) &&
          !value.includes(kw),
      )
    : PRESET_KEYWORDS.filter((kw) => !value.includes(kw));

  const addKeyword = useCallback(
    (keyword: string) => {
      const trimmed = keyword.trim();
      if (!trimmed || value.includes(trimmed)) return;
      onChange([...value, trimmed]);
      setInputValue("");
      setSelectedIndex(-1);
    },
    [value, onChange],
  );

  const removeKeyword = useCallback(
    (keyword: string) => {
      onChange(value.filter((k) => k !== keyword));
    },
    [value, onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredSuggestions.length) {
          addKeyword(filteredSuggestions[selectedIndex]!);
        } else if (inputValue.trim()) {
          addKeyword(inputValue);
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
      } else if (
        e.key === "Backspace" &&
        !inputValue &&
        value.length > 0
      ) {
        removeKeyword(value[value.length - 1]!);
      }
    },
    [
      selectedIndex,
      filteredSuggestions,
      inputValue,
      value,
      addKeyword,
      removeKeyword,
    ],
  );

  // 点击外部关闭下拉
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "border-input bg-background flex min-h-[38px] flex-wrap items-center gap-1.5 rounded-md border px-3 py-1.5",
          "focus-within:ring-ring focus-within:ring-2 focus-within:ring-offset-1",
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((keyword) => (
          <span
            key={keyword}
            className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm whitespace-nowrap"
          >
            {keyword}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeKeyword(keyword);
              }}
              className="hover:bg-primary/20 rounded-sm p-0.5 transition-colors"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setSelectedIndex(-1);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* 下拉建议列表 */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="bg-popover border-border absolute z-50 mt-1 max-h-[200px] w-full overflow-y-auto rounded-md border shadow-md">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              className={cn(
                "w-full px-3 py-1.5 text-left text-sm transition-colors",
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50",
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                addKeyword(suggestion);
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
