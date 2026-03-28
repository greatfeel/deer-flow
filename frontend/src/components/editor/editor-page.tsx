// src/components/editor/editor-page.tsx
"use client";

import { useEditor } from "@tiptap/react";
import { ArrowLeft, Download, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

const DRAFT_KEY = "editor-draft";
const TITLE_KEY = "editor-title";

export function EditorPage() {
  const [title, setTitle] = useState("无标题文档");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Save title on change
  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
    localStorage.setItem(TITLE_KEY, e.target.value);
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
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          placeholder="无标题文档"
        />

        <div className="flex items-center gap-2">
          {/* Import dropdown */}
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

          {/* Export dropdown */}
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

      {/* Toolbar */}
      <EditorToolbar editor={editor} />

      {/* Editor content */}
      <RichTextEditor editor={editor} />

      {/* Status bar */}
      <div className="border-border bg-background flex flex-shrink-0 items-center gap-2 border-t px-4 py-1.5 text-xs text-muted-foreground">
        <span>{saveStatus === "saving" ? "正在保存..." : "已自动保存"}</span>
        <span>•</span>
        <span>{wordCount} 字</span>
      </div>
    </div>
  );
}
