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
