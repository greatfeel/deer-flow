"use client";

import { useEffect, useRef } from "react";

import { bubblePanelMenus } from "./ai-editor-menus";

interface AiEditorWrapperProps {
  draftKey: string;
  onChange?: (html: string) => void;
  onReady?: (api: { getHtml: () => string; insert: (html: string) => void }) => void;
}

export function AiEditorWrapper({ draftKey, onChange, onReady }: AiEditorWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorInstanceRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  const onReadyRef = useRef(onReady);
  onChangeRef.current = onChange;
  onReadyRef.current = onReady;

  useEffect(() => {
    if (!containerRef.current) return;

    // Guard: clear any leftover child nodes from StrictMode double-mount
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let editor: any = null;
    let destroyed = false;

    void (async () => {
      // Dynamic import to avoid SSR issues
      const aieditorModule = await import("aieditor");
      await import("aieditor/dist/style.css" as string);

      if (destroyed || !containerRef.current) return;

      const draft = localStorage.getItem(draftKey) ?? "";

      editor = new aieditorModule.AiEditor({
        element: containerRef.current,
        placeholder: "开始你的创作...",
        content: draft,
        image: {
          allowBase64: true,
        },
        codeBlock: {
          languages: [
            { name: "javascript", value: "javascript" },
            { name: "typescript", value: "typescript" },
            { name: "python", value: "python" },
            { name: "java", value: "java" },
            { name: "go", value: "go" },
            { name: "rust", value: "rust" },
            { name: "html", value: "html" },
            { name: "css", value: "css" },
            { name: "sql", value: "sql" },
            { name: "bash", value: "bash" },
            { name: "json", value: "json" },
            { name: "markdown", value: "markdown" },
          ],
        },
        ai: {
          models: {
            custom: {
              url: "/api/editor/rewrite",
              protocol: "sse" as const,
              method: "POST",
              headers: () => ({ "Content-Type": "application/json" }),
              wrapPayload: (prompt: string) => JSON.stringify({ prompt }),
              parseMessage: (bodyString: string) => {
                try {
                  const json = JSON.parse(bodyString) as {
                    type?: string;
                    content?: string;
                  };
                  if (json.type === "done" || json.type === "error") {
                    return { role: "assistant", content: json.content ?? "", status: 2 as const };
                  }
                  return { role: "assistant", content: json.content ?? "", status: 1 as const };
                } catch {
                  return undefined;
                }
              },
            },
          },
          bubblePanelEnable: true,
          bubblePanelModel: "custom",
          bubblePanelMenus,
        },
        onChange: (aiEditor: { getHtml: () => string }) => {
          onChangeRef.current?.(aiEditor.getHtml());
        },
      });

      editorInstanceRef.current = editor;

      onReadyRef.current?.({
        getHtml: () => editor!.getHtml(),
        insert: (html: string) => editor!.insert(html),
      });
    })();

    return () => {
      destroyed = true;
      if (editorInstanceRef.current) {
        editorInstanceRef.current.destroy();
        editorInstanceRef.current = null;
      } else if (editor) {
        editor.destroy();
      }
    };
    // Only re-run if draftKey changes; onChange/onReady accessed via refs
  }, [draftKey]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div ref={containerRef} className="flex-1 overflow-y-auto" />
    </div>
  );
}
