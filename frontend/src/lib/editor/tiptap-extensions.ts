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
