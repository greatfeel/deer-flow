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
 * Export editor content as a .doc file download.
 * Uses Word-compatible HTML wrapping (browser-safe, no Node.js dependencies).
 */
export function exportDocx(
  editor: Editor,
  filename = "document"
): void {
  const html = editor.getHTML();
  const content = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${filename}</title></head>
<body>${html}</body>
</html>`;
  const blob = new Blob([content], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}
