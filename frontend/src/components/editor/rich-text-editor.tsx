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
