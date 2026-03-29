"use client";

import { Download, FileJson, FileText, PenLineIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { storeImportContent } from "@/core/editor/import";
import { useI18n } from "@/core/i18n/hooks";
import { extractContentFromMessage, hasContent } from "@/core/messages/utils";
import {
  exportThreadAsJSON,
  exportThreadAsMarkdown,
  formatThreadAsMarkdown,
} from "@/core/threads/export";
import type { AgentThread } from "@/core/threads/types";
import { titleOfThread } from "@/core/threads/utils";

import { useThread } from "./messages/context";
import { Tooltip } from "./tooltip";

export function ExportTrigger({ threadId }: { threadId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const { thread } = useThread();

  const messages = thread.messages;

  const handleExportToEditor = useCallback(() => {
    if (messages.length === 0) {
      toast.error(t.conversation.noMessages);
      return;
    }

    // Strategy: find the last AI message with content as the primary source
    const lastAiMessage = [...messages]
      .reverse()
      .find((m) => m.type === "ai" && hasContent(m));
    const content = lastAiMessage
      ? extractContentFromMessage(lastAiMessage)
      : null;

    if (content) {
      // Use the last AI reply directly
      storeImportContent({ markdown: content, title: titleOfThread({ thread_id: threadId, values: thread.values } as AgentThread) });
    } else {
      // Fallback: export the full thread as markdown
      const agentThread = {
        thread_id: threadId,
        updated_at: new Date().toISOString(),
        values: thread.values,
      } as AgentThread;
      const markdown = formatThreadAsMarkdown(agentThread, messages);
      storeImportContent({ markdown, title: titleOfThread(agentThread) });
    }

    router.push("/workspace/aieditor?import=1");
  }, [messages, thread.values, threadId, router, t]);

  const handleExport = useCallback(
    (format: "markdown" | "json") => {
      if (messages.length === 0) {
        toast.error(t.conversation.noMessages);
        return;
      }
      const agentThread = {
        thread_id: threadId,
        updated_at: new Date().toISOString(),
        values: thread.values,
      } as AgentThread;

      if (format === "markdown") {
        exportThreadAsMarkdown(agentThread, messages);
      } else {
        exportThreadAsJSON(agentThread, messages);
      }
      toast.success(t.common.exportSuccess);
    },
    [messages, thread.values, threadId, t],
  );

  if (messages.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <Tooltip content={t.common.export}>
        <DropdownMenuTrigger asChild>
          <Button
            className="text-muted-foreground hover:text-foreground"
            variant="ghost"
          >
            <Download />
            {t.common.export}
          </Button>
        </DropdownMenuTrigger>
      </Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => handleExport("markdown")}>
          <FileText className="text-muted-foreground" />
          <span>{t.common.exportAsMarkdown}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handleExport("json")}>
          <FileJson className="text-muted-foreground" />
          <span>{t.common.exportAsJSON}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleExportToEditor}>
          <PenLineIcon className="text-muted-foreground" />
          <span>{t.common.exportToEditor}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
