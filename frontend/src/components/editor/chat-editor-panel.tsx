"use client";

import { useEditor } from "@tiptap/react";
import { ArrowLeft, Download, Send, Upload } from "lucide-react";
import { useRef, useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportDocx, importDocx } from "@/lib/editor/docx-io";
import { exportMarkdown, importMarkdown } from "@/lib/editor/markdown-io";
import { editorExtensions } from "@/lib/editor/tiptap-extensions";

import { EditorToolbar } from "./editor-toolbar";
import { RichTextEditor } from "./rich-text-editor";

const DRAFT_KEY = "chat-editor-draft";
const TITLE_KEY = "chat-editor-title";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function ChatEditorPanel() {
  const [title, setTitle] = useState("无标题文档");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "review">("chat");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: editorExtensions,
    content: "",
    onUpdate: ({ editor }) => {
      setSaveStatus("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(editor.getJSON()));
        setSaveStatus("saved");
      }, 1000);
    },
  });

  // Restore draft on mount
  useEffect(() => {
    if (!editor) return;
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        editor.commands.setContent(JSON.parse(draft));
      } catch {
        // ignore malformed draft
      }
    }
    const savedTitle = localStorage.getItem(TITLE_KEY);
    if (savedTitle) setTitle(savedTitle);
  }, [editor]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
    localStorage.setItem(TITLE_KEY, e.target.value);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // POST to backend — adjust the URL and body to match your API
      const res = await fetch("/api/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = (await res.json()) as { content?: string; message?: string };
      const aiContent = data.content ?? data.message ?? "(无响应)";
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiContent,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "请求失败，请检查后端连接。",
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  }

  function insertIntoEditor(content: string) {
    if (!editor) return;
    editor.commands.insertContent(content);
  }

  const wordCount = editor?.storage.characterCount?.words() ?? 0;

  return (
    <div className="bg-background flex h-screen flex-col">
      {/* Header */}
      <header className="border-border bg-background flex h-12 flex-shrink-0 items-center gap-3 border-b px-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="text-muted-foreground hover:bg-accent flex size-7 items-center justify-center rounded transition-colors"
          title="返回"
        >
          <ArrowLeft className="size-4" />
        </button>

        <input
          value={title}
          onChange={handleTitleChange}
          className="flex-1 bg-transparent text-sm outline-none"
          placeholder="无标题文档"
        />

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Upload className="size-3.5" />
                导入
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => editor && importMarkdown(editor)}
              >
                导入 Markdown (.md)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor && importDocx(editor)}>
                导入 Word (.docx)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Download className="size-3.5" />
                导出
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => editor && exportMarkdown(editor, title)}
              >
                导出 Markdown (.md)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor && exportDocx(editor, title)}
              >
                导出 Word (.docx)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Body: editor + chat panel */}
      <div className="flex min-h-0 flex-1">
        {/* Left: Editor */}
        <div className="border-border flex min-w-0 flex-1 flex-col border-r">
          <EditorToolbar editor={editor} />
          <RichTextEditor editor={editor} />
          <div className="border-border bg-background flex flex-shrink-0 items-center gap-2 border-t px-4 py-1.5 text-xs text-muted-foreground">
            <span>{saveStatus === "saving" ? "正在保存..." : "已自动保存"}</span>
            <span>•</span>
            <span>{wordCount} 字</span>
          </div>
        </div>

        {/* Right: Chat panel (360px) */}
        <div className="bg-background flex w-[360px] flex-shrink-0 flex-col">
          {/* Tabs */}
          <div className="border-border flex h-10 flex-shrink-0 items-center border-b px-3">
            <button
              type="button"
              onClick={() => setActiveTab("chat")}
              className={`flex h-full items-center border-b-2 px-3 text-sm transition-colors ${
                activeTab === "chat"
                  ? "border-foreground text-foreground font-medium"
                  : "border-transparent text-muted-foreground"
              }`}
            >
              AI 对话
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("review")}
              className={`flex h-full items-center border-b-2 px-3 text-sm transition-colors ${
                activeTab === "review"
                  ? "border-foreground text-foreground font-medium"
                  : "border-transparent text-muted-foreground"
              }`}
            >
              审阅
            </button>
          </div>

          {/* Chat messages */}
          {activeTab === "chat" && (
            <>
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
                {messages.length === 0 && (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    向 AI 发送消息，内容可插入编辑器
                  </p>
                )}
                {messages.map((msg) => (
                  <div key={msg.id}>
                    {msg.role === "user" ? (
                      <div className="flex justify-end">
                        <div className="bg-primary text-primary-foreground max-w-[85%] rounded-2xl rounded-br-sm px-3.5 py-2 text-sm">
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-sm">
                        <div className="bg-accent border-border overflow-hidden rounded-lg border">
                          <div className="border-border flex items-center justify-between border-b px-3 py-1.5">
                            <span className="text-muted-foreground text-xs">
                              AI 回复
                            </span>
                            <button
                              type="button"
                              onClick={() => insertIntoEditor(msg.content)}
                              className="text-primary hover:text-primary/80 text-xs transition-colors"
                            >
                              插入编辑器 →
                            </button>
                          </div>
                          <div className="px-3 py-2 text-sm leading-relaxed">
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="text-muted-foreground text-sm">
                    AI 正在思考...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat input */}
              <div className="border-border flex-shrink-0 border-t p-3">
                <div className="border-border bg-accent focus-within:ring-ring flex items-end gap-2 rounded-lg border px-3 py-2 focus-within:ring-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendMessage();
                      }
                    }}
                    placeholder="输入消息... (Enter 发送，Shift+Enter 换行)"
                    className="max-h-28 min-h-5 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    rows={1}
                  />
                  <button
                    type="button"
                    onClick={() => void sendMessage()}
                    disabled={!input.trim() || isLoading}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted flex size-7 flex-shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed"
                  >
                    <Send className="size-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Review tab placeholder */}
          {activeTab === "review" && (
            <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
              审阅功能即将上线
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
