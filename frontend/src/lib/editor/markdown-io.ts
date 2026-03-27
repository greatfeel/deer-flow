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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markdown: string = (editor.storage as any).markdown.getMarkdown();
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
