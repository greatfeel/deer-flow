"use client";

import { Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { getOrCreateSession } from "@/core/writing-wizard/store";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

function buildPresetContext(): string {
  const session = getOrCreateSession();
  const d = session.guideData;

  const lines: string[] = [
    "请根据以下方案编写指导信息和方案目录，生成完整的临床研究方案。",
    "",
    `【研究题目】${d.researchTitle}`,
    `【研究关键词】${d.keywords.join("、")}`,
    `【方案编号】${d.protocolNumber}`,
    `【版本号】${d.versionNumber}`,
    `【研究形式】${d.studyForm}`,
    `【试验目的】${d.trialObjective}`,
    `【试验用药】${d.drugInfo.trialDrug}`,
    `【用药包装】${d.drugInfo.drugPackaging}`,
    `【生产企业】${d.drugInfo.manufacturer}`,
    `【受试者】${d.subjects}`,
    `【总体设计】${d.overallDesign}`,
    `【治疗方案】${d.treatmentPlan}`,
    `【诊断标准】${d.diagnosticCriteria}`,
    `【受试者例数】${d.sampleSize}`,
    `【试验设计】${d.trialDesign}`,
    `【纳入标准】${d.inclusionCriteria}`,
    `【排除标准】${d.exclusionCriteria}`,
    `【退出标准】${d.withdrawalCriteria}`,
    `【中止标准】${d.terminationCriteria}`,
    `【中止/退出处理】${d.withdrawalProcedure}`,
    `【研究目的】${d.endpoints.researchObjective}`,
    `【测试标准】${d.endpoints.outcomeMeasures}`,
    `【统计分析】${d.statisticalAnalysis}`,
  ];

  if (session.outlineMarkdown) {
    lines.push("", "【方案目录】", session.outlineMarkdown);
  }

  lines.push(
    "",
    "要求：",
    "1. 生成的方案文字使用中文",
    "2. 文献引用必须是 PubMed、Google Scholar、中国知网等收录的真实文章",
    "3. 报告中需要有对于文献的索引编号",
    "4. 按照方案目录结构逐章生成完整内容",
  );

  return lines.join("\n");
}

export function GenerateChat() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [presetContext, setPresetContext] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setPresetContext(buildPresetContext());
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (text?: string) => {
      const content = text ?? input.trim();
      if (!content || isLoading) return;

      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "user",
        content,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);

      // TODO: 接入后端 Agent 聊天 API
      // 目前为 stub，显示提示信息
      setTimeout(() => {
        const aiMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          role: "assistant",
          content:
            "方案生成功能将在后端逻辑完成后启用。届时将根据您提供的指导信息和方案目录，通过 Agent 生成完整的临床研究方案。",
        };
        setMessages((prev) => [...prev, aiMsg]);
        setIsLoading(false);
      }, 1500);
    },
    [input, isLoading],
  );

  const handleStartGenerate = useCallback(() => {
    void sendMessage(presetContext);
  }, [sendMessage, presetContext]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void sendMessage();
      }
    },
    [sendMessage],
  );

  const handleBack = useCallback(() => {
    router.push("/workspace/writing-wizard/outline");
  }, [router]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {/* 预置上下文预览 */}
          {messages.length === 0 && presetContext && (
            <div className="space-y-4">
              <div className="bg-muted/50 border-border rounded-lg border p-4">
                <h3 className="text-foreground mb-2 text-sm font-medium">
                  已收集的方案编写指导信息
                </h3>
                <pre className="text-muted-foreground max-h-[300px] overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed">
                  {presetContext}
                </pre>
              </div>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleStartGenerate}
                  className={cn(
                    "bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium shadow-sm transition-colors",
                  )}
                >
                  <Send className="size-4" />
                  开始生成研究方案
                </button>
              </div>
            </div>
          )}

          {/* 消息列表 */}
          {messages.map((msg) => (
            <div key={msg.id} className="mb-4">
              {msg.role === "user" ? (
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-foreground max-w-[85%] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm">
                    <pre className="max-h-[200px] overflow-y-auto whitespace-pre-wrap">
                      {msg.content.length > 200
                        ? msg.content.slice(0, 200) + "..."
                        : msg.content}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="flex justify-start">
                  <div className="bg-muted max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted inline-flex items-center gap-2 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm">
                <Loader2 className="size-4 animate-spin" />
                正在生成方案...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-border bg-background flex-shrink-0 border-t px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="border-input bg-background text-foreground hover:bg-accent rounded-md border px-4 py-2 text-sm transition-colors"
          >
            上一步
          </button>
          <div className="border-input focus-within:ring-ring flex flex-1 items-end gap-2 rounded-lg border px-3 py-2 focus-within:ring-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入补充要求... (Enter 发送)"
              className="placeholder:text-muted-foreground max-h-28 min-h-5 flex-1 resize-none bg-transparent text-sm outline-none"
              rows={1}
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={!input.trim() || isLoading}
              className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted flex size-8 flex-shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed"
            >
              <Send className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
