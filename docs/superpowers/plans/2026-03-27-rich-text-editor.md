# Rich Text Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two new workspace pages — a standalone TipTap rich text editor and a TypeAI-style chat+editor split view — both supporting Markdown and .docx import/export, with localStorage autosave.

**Architecture:** TipTap React integration (`useEditor`) manages editor state in the page-level component, passed as props to toolbar and content components. Markdown IO uses `tiptap-markdown`; docx IO uses `mammoth` (import) and `html-to-docx` (export), both dynamically imported to avoid SSR issues. Chat in Page B is a simplified implementation that POSTs to the existing backend.

**Tech Stack:** TipTap React, tiptap-markdown, mammoth, html-to-docx, Next.js App Router, Tailwind CSS v4, TypeScript, pnpm

**Working directory for all commands:** `frontend/` inside the worktree at `/Users/edy/greatfeel/IDO/projects/solution_Agent/agent_server_editor`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/editor/tiptap-extensions.ts` | Create | TipTap extension array (single source of truth) |
| `src/lib/editor/markdown-io.ts` | Create | Markdown import (file → editor) and export (editor → .md download) |
| `src/lib/editor/docx-io.ts` | Create | .docx import via mammoth, export via html-to-docx |
| `src/styles/editor.module.css` | Create | ProseMirror prose styles (CSS Module with :global) |
| `src/components/editor/rich-text-editor.tsx` | Create | `EditorContent` wrapper + localStorage autosave effect |
| `src/components/editor/editor-toolbar.tsx` | Create | Format buttons (Bold/Italic/H1/H2/H3/list/blockquote/link/code) |
| `src/components/editor/editor-page.tsx` | Create | Page A full layout: header + toolbar + editor + status bar |
| `src/components/editor/chat-editor-panel.tsx` | Create | Page B TypeAI layout: header + (editor \| chat panel) |
| `src/app/workspace/editor/page.tsx` | Create | Next.js route for Page A |
| `src/app/workspace/chat-editor/page.tsx` | Create | Next.js route for Page B |
| `src/core/i18n/locales/en-US.ts` | Modify | Add `sidebar.editor` and `sidebar.chatEditor` keys |
| `src/core/i18n/locales/zh-CN.ts` | Modify | Add `sidebar.editor` and `sidebar.chatEditor` keys |
| `src/components/workspace/workspace-nav-chat-list.tsx` | Modify | Add two new nav entries (Editor + Chat Editor) |

---

## Task 1: Install dependencies

**Files:** none (package changes only)

- [ ] **Step 1: Install TipTap and IO packages**

```bash
cd /Users/edy/greatfeel/IDO/projects/solution_Agent/agent_server_editor/frontend
pnpm add @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-character-count @tiptap/extension-link tiptap-markdown mammoth html-to-docx
```

- [ ] **Step 2: Verify install succeeded**

```bash
cat package.json | grep -E "@tiptap|tiptap-markdown|mammoth|html-to-docx"
```

Expected: all 9 packages listed in `dependencies`.

- [ ] **Step 3: Add type declaration for html-to-docx (no official @types)**

Create `src/types/html-to-docx.d.ts`:

```typescript
declare module "html-to-docx" {
  function htmlToDocx(
    htmlString: string,
    headerHTMLString?: string | null,
    options?: {
      title?: string;
      margins?: { top?: number; bottom?: number; left?: number; right?: number };
      fontSize?: number;
      lang?: string;
    }
  ): Promise<Blob | Buffer>;
  export default htmlToDocx;
}
```

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml src/types/html-to-docx.d.ts
git commit -m "chore: add tiptap, mammoth, html-to-docx dependencies"
```

---

## Task 2: TipTap extensions config

**Files:**
- Create: `src/lib/editor/tiptap-extensions.ts`

- [ ] **Step 1: Create the extensions file**

```typescript
// src/lib/editor/tiptap-extensions.ts
import CharacterCount from "@tiptap/extension-character-count";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";

export const editorExtensions = [
  StarterKit,
  Placeholder.configure({ placeholder: "开始写作..." }),
  CharacterCount,
  Link.configure({ openOnClick: false }),
  Markdown.configure({ html: false, transformPastedText: true }),
];
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/edy/greatfeel/IDO/projects/solution_Agent/agent_server_editor/frontend
pnpm typecheck
```

Expected: no errors related to the new file. (Ignore pre-existing errors if any.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/editor/tiptap-extensions.ts
git commit -m "feat: add tiptap extensions config"
```

---

## Task 3: Markdown IO utilities

**Files:**
- Create: `src/lib/editor/markdown-io.ts`

- [ ] **Step 1: Create the markdown IO file**

```typescript
// src/lib/editor/markdown-io.ts
import type { Editor } from "@tiptap/react";

/**
 * Import a .md file into the editor.
 * Opens a file picker, reads the file, and sets editor content.
 */
export function importMarkdown(editor: Editor): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".md,.markdown,text/markdown";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const text = await file.text();
    editor.commands.setContent(text);
  };
  input.click();
}

/**
 * Export editor content as a .md file download.
 */
export function exportMarkdown(editor: Editor, filename = "document"): void {
  const markdown: string = editor.storage.markdown.getMarkdown();
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm typecheck
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/editor/markdown-io.ts
git commit -m "feat: add markdown import/export utilities"
```

---

## Task 4: docx IO utilities

**Files:**
- Create: `src/lib/editor/docx-io.ts`

- [ ] **Step 1: Create the docx IO file**

```typescript
// src/lib/editor/docx-io.ts
import type { Editor } from "@tiptap/react";

/**
 * Import a .docx file into the editor via mammoth (docx → HTML).
 * Opens a file picker, converts the file, and sets editor content.
 */
export function importDocx(editor: Editor): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept =
    ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const arrayBuffer = await file.arrayBuffer();
    const mammoth = (await import("mammoth")).default;
    const result = await mammoth.convertToHtml({ arrayBuffer });
    editor.commands.setContent(result.value);
  };
  input.click();
}

/**
 * Export editor content as a .docx file download via html-to-docx.
 */
export async function exportDocx(
  editor: Editor,
  filename = "document"
): Promise<void> {
  const html = editor.getHTML();
  const htmlToDocx = (await import("html-to-docx")).default;
  const blob = await htmlToDocx(
    `<!DOCTYPE html><html><body>${html}</body></html>`,
    null,
    { title: filename, fontSize: 24, lang: "zh-CN" }
  );
  const url = URL.createObjectURL(blob as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm typecheck
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/editor/docx-io.ts
git commit -m "feat: add docx import/export utilities"
```

---

## Task 5: ProseMirror CSS styles

**Files:**
- Create: `src/styles/editor.module.css`

- [ ] **Step 1: Create the CSS module**

```css
/* src/styles/editor.module.css */

/* Scroll container — centers the editor with max-width */
.editorScroll {
  flex: 1;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  padding: 48px 24px 80px;
}

.editorScroll::-webkit-scrollbar {
  width: 6px;
}

.editorScroll::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

.editorInner {
  width: 100%;
  max-width: 680px;
}

/* ProseMirror core */
.editorScroll :global(.ProseMirror) {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 16px;
  line-height: 1.8;
  color: var(--foreground);
  min-height: 400px;
  outline: none;
}

/* Placeholder text */
.editorScroll :global(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: var(--muted-foreground);
  pointer-events: none;
  height: 0;
}

/* Headings */
.editorScroll :global(.ProseMirror h1) {
  font-size: 28px;
  font-weight: 500;
  line-height: 1.35;
  margin-top: 32px;
  margin-bottom: 16px;
}

.editorScroll :global(.ProseMirror h2) {
  font-size: 22px;
  font-weight: 500;
  line-height: 1.4;
  margin-top: 28px;
  margin-bottom: 12px;
}

.editorScroll :global(.ProseMirror h3) {
  font-family: "DM Sans", sans-serif;
  font-size: 16px;
  font-weight: 600;
  margin-top: 22px;
  margin-bottom: 8px;
}

/* Paragraph */
.editorScroll :global(.ProseMirror p) {
  margin-bottom: 14px;
}

/* Lists */
.editorScroll :global(.ProseMirror ul),
.editorScroll :global(.ProseMirror ol) {
  padding-left: 22px;
  margin-bottom: 14px;
}

.editorScroll :global(.ProseMirror li) {
  margin-bottom: 4px;
}

/* Blockquote */
.editorScroll :global(.ProseMirror blockquote) {
  border-left: 3px solid var(--border);
  padding-left: 16px;
  color: var(--muted-foreground);
  font-style: italic;
  margin-bottom: 14px;
}

/* Inline code */
.editorScroll :global(.ProseMirror code) {
  font-family: "Courier New", monospace;
  font-size: 13px;
  background: var(--accent);
  padding: 2px 6px;
  border-radius: 3px;
}

/* Code block */
.editorScroll :global(.ProseMirror pre) {
  background: var(--foreground);
  color: var(--background);
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  margin-bottom: 14px;
  font-family: "Courier New", monospace;
  font-size: 13px;
  line-height: 1.6;
}

.editorScroll :global(.ProseMirror pre code) {
  background: none;
  padding: 0;
  color: inherit;
}

/* Links */
.editorScroll :global(.ProseMirror a) {
  color: var(--primary);
  text-decoration: underline;
  cursor: pointer;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/editor.module.css
git commit -m "feat: add ProseMirror editor CSS module"
```

---

## Task 6: RichTextEditor component

**Files:**
- Create: `src/components/editor/rich-text-editor.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/editor/rich-text-editor.tsx
"use client";

import { EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/react";

import styles from "@/styles/editor.module.css";

interface RichTextEditorProps {
  editor: Editor | null;
}

/**
 * Renders the TipTap EditorContent inside a scrollable, centered container.
 * The parent component owns the `editor` instance (created via useEditor).
 */
export function RichTextEditor({ editor }: RichTextEditorProps) {
  return (
    <div className={styles.editorScroll}>
      <div className={styles.editorInner}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/rich-text-editor.tsx
git commit -m "feat: add RichTextEditor component"
```

---

## Task 7: EditorToolbar component

**Files:**
- Create: `src/components/editor/editor-toolbar.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/editor/editor-toolbar.tsx
"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
  Underline,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface EditorToolbarProps {
  editor: Editor | null;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({
  onClick,
  isActive,
  title,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "flex size-7 items-center justify-center rounded text-sm transition-colors",
        "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        isActive && "bg-accent text-accent-foreground"
      )}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <div className="bg-border mx-1 h-5 w-px flex-shrink-0" />;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null;

  return (
    <div className="bg-background border-border flex flex-wrap items-center gap-0.5 border-b px-3 py-1.5">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="粗体 (Ctrl+B)"
      >
        <Bold className="size-3.5" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="斜体 (Ctrl+I)"
      >
        <Italic className="size-3.5" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline?.().run()}
        isActive={editor.isActive("underline")}
        title="下划线 (Ctrl+U)"
      >
        <Underline className="size-3.5" />
      </ToolbarButton>

      <Separator />

      <ToolbarButton
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        }
        isActive={editor.isActive("heading", { level: 1 })}
        title="一级标题"
      >
        <Heading1 className="size-3.5" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        isActive={editor.isActive("heading", { level: 2 })}
        title="二级标题"
      >
        <Heading2 className="size-3.5" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
        isActive={editor.isActive("heading", { level: 3 })}
        title="三级标题"
      >
        <Heading3 className="size-3.5" />
      </ToolbarButton>

      <Separator />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="无序列表"
      >
        <List className="size-3.5" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="有序列表"
      >
        <ListOrdered className="size-3.5" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        title="引用"
      >
        <Quote className="size-3.5" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive("code")}
        title="行内代码"
      >
        <Code className="size-3.5" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => {
          const url = window.prompt("输入链接地址:");
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}
        isActive={editor.isActive("link")}
        title="链接"
      >
        <Link className="size-3.5" />
      </ToolbarButton>
    </div>
  );
}
```

> **Note:** StarterKit does not include Underline. If `toggleUnderline` is undefined, the button will be a no-op. To enable it, add `@tiptap/extension-underline` in Task 1 and include it in `tiptap-extensions.ts`. For initial validation, Underline can be omitted.

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/editor-toolbar.tsx
git commit -m "feat: add EditorToolbar component"
```

---

## Task 8: EditorPage layout (Page A)

**Files:**
- Create: `src/components/editor/editor-page.tsx`

- [ ] **Step 1: Create the component**

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/editor-page.tsx
git commit -m "feat: add EditorPage layout component"
```

---

## Task 9: Page A route

**Files:**
- Create: `src/app/workspace/editor/page.tsx`

- [ ] **Step 1: Create the route**

```typescript
// src/app/workspace/editor/page.tsx
import { EditorPage } from "@/components/editor/editor-page";

export default function EditorRoute() {
  return <EditorPage />;
}
```

- [ ] **Step 2: Start dev server and verify Page A renders**

```bash
pnpm dev
```

Open `http://localhost:3000/workspace/editor` in a browser.

Expected:
- Header with back button, title input, Import/Export dropdowns
- Toolbar with Bold/Italic/H1/H2/H3/list/blockquote/code/link buttons
- Empty editor area with placeholder text "开始写作..."
- Status bar showing "已自动保存 • 0 字"

- [ ] **Step 3: Verify Markdown import works**

1. Create a file `test.md` with content: `# Hello\n\nThis is **bold** text.`
2. Click Import → 导入 Markdown → select `test.md`
3. Confirm editor shows the heading and bold text correctly

- [ ] **Step 4: Verify Markdown export works**

1. Type some content in the editor
2. Click Export → 导出 Markdown
3. Confirm a `.md` file downloads with the correct content

- [ ] **Step 5: Commit**

```bash
git add src/app/workspace/editor/page.tsx
git commit -m "feat: add /workspace/editor route (Page A)"
```

---

## Task 10: Add i18n keys for nav entries

**Files:**
- Modify: `src/core/i18n/locales/en-US.ts`
- Modify: `src/core/i18n/locales/zh-CN.ts`

- [ ] **Step 1: Add keys to en-US.ts**

Find the `sidebar` block (contains `newChat`, `chats`, `agents`) and add two keys:

```typescript
// In src/core/i18n/locales/en-US.ts
// Find:
  sidebar: {
    newChat: "New chat",
    chats: "Chats",
    recentChats: "Recent chats",
    demoChats: "Demo chats",
    agents: "Agents",
  },
// Replace with:
  sidebar: {
    newChat: "New chat",
    chats: "Chats",
    recentChats: "Recent chats",
    demoChats: "Demo chats",
    agents: "Agents",
    editor: "Editor",
    chatEditor: "Chat Editor",
  },
```

- [ ] **Step 2: Add keys to zh-CN.ts**

```typescript
// In src/core/i18n/locales/zh-CN.ts
// Find:
  sidebar: {
    newChat: "新对话",
    chats: "对话",
    recentChats: "最近的对话",
    demoChats: "演示对话",
    agents: "智能体",
  },
// Replace with:
  sidebar: {
    newChat: "新对话",
    chats: "对话",
    recentChats: "最近的对话",
    demoChats: "演示对话",
    agents: "智能体",
    editor: "编辑器",
    chatEditor: "聊天编辑器",
  },
```

- [ ] **Step 3: Verify TypeScript compiles (i18n is typed)**

```bash
pnpm typecheck
```

Expected: no errors. The `Translations` type enforces both locales have the same keys.

- [ ] **Step 4: Commit**

```bash
git add src/core/i18n/locales/en-US.ts src/core/i18n/locales/zh-CN.ts
git commit -m "feat: add editor i18n keys to sidebar"
```

---

## Task 11: Add nav entries to sidebar

**Files:**
- Modify: `src/components/workspace/workspace-nav-chat-list.tsx`

- [ ] **Step 1: Add Editor and ChatEditor nav items**

```typescript
// src/components/workspace/workspace-nav-chat-list.tsx
"use client";

import { BotIcon, MessagesSquare, PenLineIcon, LayoutPanelLeftIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useI18n } from "@/core/i18n/hooks";

export function WorkspaceNavChatList() {
  const { t } = useI18n();
  const pathname = usePathname();
  return (
    <SidebarGroup className="pt-1">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton isActive={pathname === "/workspace/chats"} asChild>
            <Link className="text-muted-foreground" href="/workspace/chats">
              <MessagesSquare />
              <span>{t.sidebar.chats}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname.startsWith("/workspace/agents")}
            asChild
          >
            <Link className="text-muted-foreground" href="/workspace/agents">
              <BotIcon />
              <span>{t.sidebar.agents}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname === "/workspace/editor"}
            asChild
          >
            <Link className="text-muted-foreground" href="/workspace/editor">
              <PenLineIcon />
              <span>{t.sidebar.editor}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname === "/workspace/chat-editor"}
            asChild
          >
            <Link className="text-muted-foreground" href="/workspace/chat-editor">
              <LayoutPanelLeftIcon />
              <span>{t.sidebar.chatEditor}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
```

- [ ] **Step 2: Verify nav entries appear in browser**

With dev server running, open `http://localhost:3000/workspace/chats` and confirm two new items appear in the sidebar: "编辑器" and "聊天编辑器".

- [ ] **Step 3: Commit**

```bash
git add src/components/workspace/workspace-nav-chat-list.tsx
git commit -m "feat: add editor nav entries to workspace sidebar"
```

---

## Task 12: ChatEditorPanel (Page B)

**Files:**
- Create: `src/components/editor/chat-editor-panel.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/editor/chat-editor-panel.tsx
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
                        {/* AI content card */}
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/chat-editor-panel.tsx
git commit -m "feat: add ChatEditorPanel component (Page B)"
```

---

## Task 13: Page B route

**Files:**
- Create: `src/app/workspace/chat-editor/page.tsx`

- [ ] **Step 1: Create the route**

```typescript
// src/app/workspace/chat-editor/page.tsx
import { ChatEditorPanel } from "@/components/editor/chat-editor-panel";

export default function ChatEditorRoute() {
  return <ChatEditorPanel />;
}
```

- [ ] **Step 2: Verify Page B renders**

Open `http://localhost:3000/workspace/chat-editor` in the browser.

Expected:
- Header with back button, title input, Import/Export dropdowns
- Left side: full editor with toolbar and status bar
- Right side (360px): "AI 对话" and "审阅" tabs, empty chat with placeholder, input box
- Sidebar shows both new entries highlighted correctly

- [ ] **Step 3: Verify "Insert into editor" works**

1. Type a message in the chat input and press Enter (the API call will fail unless the backend is running — that's expected)
2. To test editor insertion without a live API: temporarily hardcode a message in `messages` state and click "插入编辑器 →"
3. Confirm the text appears in the editor area

- [ ] **Step 4: Commit**

```bash
git add src/app/workspace/chat-editor/page.tsx
git commit -m "feat: add /workspace/chat-editor route (Page B)"
```

---

## Task 14: End-to-end smoke test

- [ ] **Step 1: Test Markdown round-trip**

1. Go to `/workspace/editor`
2. Type: `# 标题\n\n这是**粗体**文本和*斜体*文本。`
3. Click Export → 导出 Markdown → confirm `.md` file downloads with correct content
4. Refresh the page — confirm content is restored from localStorage
5. Click Import → 导入 Markdown → select the exported file → confirm content loads correctly

- [ ] **Step 2: Test docx import**

1. Find any `.docx` file (or create one with Word/Google Docs)
2. Go to `/workspace/editor`
3. Click Import → 导入 Word → select the file
4. Confirm text content appears in the editor (formatting may vary)

- [ ] **Step 3: Test docx export**

1. Type some content in the editor
2. Click Export → 导出 Word
3. Confirm a `.docx` file downloads and can be opened in Word/WPS

- [ ] **Step 4: Test sidebar navigation**

1. Navigate to any existing chat at `/workspace/chats`
2. Confirm sidebar shows: 对话, 智能体, 编辑器, 聊天编辑器
3. Click 编辑器 → confirm navigates to `/workspace/editor`
4. Click 聊天编辑器 → confirm navigates to `/workspace/chat-editor`
5. Confirm existing chat/agent pages are unaffected

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete rich text editor integration (Page A + Page B)"
```

---

## Known Limitations (out of scope for this iteration)

- **Page B chat API**: The fetch URL `/api/chat/completions` is a placeholder — adjust to match the actual backend endpoint and request/response schema
- **Underline**: StarterKit does not include Underline; add `@tiptap/extension-underline` if needed
- **docx export fidelity**: `html-to-docx` produces basic .docx; complex formatting (tables, images) may not convert perfectly
- **No backend persistence**: All data is in localStorage; clearing browser data loses all drafts
