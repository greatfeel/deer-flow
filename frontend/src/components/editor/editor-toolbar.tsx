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
