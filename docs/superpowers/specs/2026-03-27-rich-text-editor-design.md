# Rich Text Editor — Design Spec

**Date:** 2026-03-27
**Branch:** feature/rich-text-editor
**Project:** agent_server / frontend (Next.js 16 + React 19 + Tailwind CSS v4)

---

## Overview

Add two new pages to the existing workspace app: a standalone rich text editor and a chat+editor split view. Both support Markdown and .docx import/export. No existing pages are modified except adding two nav entries.

---

## Goals

- Rich text editing via TipTap (React integration)
- Markdown import/export (priority)
- .docx import/export (validation-level quality)
- Local autosave via localStorage
- Zero impact on existing functionality

---

## Pages & Routes

### Page A — `/workspace/editor`
Standalone full-width editor. No sidebar nav icons.

**Layout:**
- **Header** (48px): back button (←), editable document title, Import / Export buttons
- **Toolbar**: height follows TipTap's natural button sizing (no fixed height); buttons: Bold, Italic, Underline | H1, H2, H3 | ordered/unordered list, blockquote | link, code
- **Editor area** (flex:1): TipTap `EditorContent` fills remaining height; centered content, max-width 680px, Lora serif font, warm-white background (#faf9f7)
- **Status bar**: height follows TipTap `CharacterCount` extension output (no fixed height); shows autosave status + word count

### Page B — `/workspace/chat-editor`
TypeAI-style split layout. No sidebar nav icons.

**Layout:**
- **Header** (48px): same as Page A
- **Body** (flex:1, horizontal split):
  - **Left — Editor area** (flex:1): same toolbar + TipTap EditorContent + status bar as Page A; all sizes follow TipTap defaults
  - **Right — Chat panel** (360px, fixed): tabs (AI对话 / 审阅), chat message list, AI content cards with "插入编辑器 →" button, chat input with send button

---

## Navigation

Two entries added to `workspace-nav-menu.tsx` (only change to existing files):
- ✏️ **编辑器** → `/workspace/editor`
- ⊞ **聊天编辑器** → `/workspace/chat-editor`

---

## File Structure

```
frontend/src/
├── app/workspace/
│   ├── editor/
│   │   └── page.tsx
│   └── chat-editor/
│       └── page.tsx
├── components/
│   └── editor/
│       ├── rich-text-editor.tsx     # Core TipTap editor component
│       ├── editor-toolbar.tsx       # Format buttons + import/export
│       ├── editor-page.tsx          # Page A layout
│       └── chat-editor-panel.tsx    # Page B layout (TypeAI style)
└── lib/
    └── editor/
        ├── tiptap-extensions.ts     # TipTap extension config
        ├── markdown-io.ts           # Markdown import/export
        └── docx-io.ts               # .docx import/export
```

---

## Dependencies (new)

| Package | Purpose |
|---|---|
| `@tiptap/react` | TipTap React integration |
| `@tiptap/pm` | ProseMirror core |
| `@tiptap/starter-kit` | Base extensions (bold, italic, headings, lists, blockquote, code) |
| `@tiptap/extension-placeholder` | Empty state hint text |
| `@tiptap/extension-character-count` | Word/char count |
| `@tiptap/extension-link` | Hyperlinks |
| `tiptap-markdown` | Markdown serialize/deserialize |
| `mammoth` | .docx → HTML (import) |
| `html-to-docx` | HTML → .docx (export) |

---

## Data Flow

### Markdown Import
```
File picker → read file text → tiptap-markdown.parse(text) → editor.commands.setContent()
```

### Markdown Export
```
editor.storage.markdown.getMarkdown() → Blob → download as .md
```

### docx Import
```
File picker → mammoth.convertToHtml(arrayBuffer) → editor.commands.setContent(html)
```

### docx Export
```
editor.getHTML() → htmlToDocx(html) → Blob → download as .docx
```

### Autosave
```
editor onChange → debounce(1000ms) → localStorage.setItem('editor-draft', editor.getJSON())
onMount → localStorage.getItem('editor-draft') → editor.commands.setContent(draft)
```

### Chat → Editor (Page B only)
```
AI response card "插入编辑器 →" click → tiptap-markdown.parse(aiMarkdown) → editor.commands.insertContent()
```

---

## Constraints

- **No backend** for this iteration — all storage is client-side localStorage
- **No auth changes** — pages are accessible to anyone with workspace access
- **Styling**: match existing project theme (Tailwind CSS v4, warm-white palette from typeai-clone reference)
- **Page B chat**: connects to the existing backend API (`/api/chat`) using the same fetch pattern as the current chat pages; the UI is a simplified reimplementation (not a reuse of the existing chat React components, which are tightly coupled to their own layout) — full feature parity with the existing chat is out of scope
