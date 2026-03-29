/**
 * Utilities for importing markdown content into AiEditor.
 *
 * Flow: caller stores markdown via storeImportContent() → navigates to
 * /workspace/aieditor?import=1 → editor page reads via consumeImportContent().
 *
 * Uses sessionStorage so the data is automatically cleaned up when the tab closes.
 */

const IMPORT_CONTENT_KEY = "aieditor-import-content";
const IMPORT_TITLE_KEY = "aieditor-import-title";

export interface ImportPayload {
  markdown: string;
  title?: string;
}

/** Store markdown content for the editor to pick up. */
export function storeImportContent(payload: ImportPayload): void {
  sessionStorage.setItem(IMPORT_CONTENT_KEY, payload.markdown);
  if (payload.title) {
    sessionStorage.setItem(IMPORT_TITLE_KEY, payload.title);
  }
}

/**
 * Read and clear the stored import content.
 * Returns null if nothing was stored (normal editor open).
 */
export function consumeImportContent(): ImportPayload | null {
  const markdown = sessionStorage.getItem(IMPORT_CONTENT_KEY);
  if (!markdown) return null;

  const title = sessionStorage.getItem(IMPORT_TITLE_KEY) ?? undefined;

  // Clean up — one-time consumption
  sessionStorage.removeItem(IMPORT_CONTENT_KEY);
  sessionStorage.removeItem(IMPORT_TITLE_KEY);

  return { markdown, title };
}
