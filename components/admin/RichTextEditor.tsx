"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import * as Popover from "@radix-ui/react-popover";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Unlink,
  Baseline,
  Highlighter,
  Image as ImageIcon,
  Undo2,
  Redo2,
  RemoveFormatting,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Swatch coerenti col design system N'arte + qualche stato. */
const SWATCHES: { name: string; value: string }[] = [
  { name: "Azzurro", value: "#1a6bad" },
  { name: "Corallo", value: "#e8542a" },
  { name: "Notte", value: "#0d1b2a" },
  { name: "Verde", value: "#2a9d5c" },
  { name: "Ambra", value: "#e8a030" },
  { name: "Rosso", value: "#d93d2a" },
];

type Props = {
  value: string;
  onChange: (html: string) => void;
};

export function RichTextEditor({ value, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Image.configure({ HTMLAttributes: { class: "rounded-xl" } }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "blog-prose focus:outline-none min-h-[320px] px-4 py-3",
      },
    },
  });

  // Applica modifiche esterne al contenuto (es. auto-compilazione SEO che
  // riscrive form.content) senza innescare un loop di update né spostare il
  // cursore durante la normale digitazione.
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  const addLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL del link", previous ?? "https://");
    if (url === null) return; // annullato
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const onPickImage = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = ""; // consente di ricaricare lo stesso file
      if (!file || !editor) return;
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("kind", "blog");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) {
          window.alert(data.error ?? "Upload non riuscito");
          return;
        }
        editor.chain().focus().setImage({ src: data.url }).run();
      } catch {
        window.alert("Errore durante l'upload dell'immagine");
      } finally {
        setUploading(false);
      }
    },
    [editor]
  );

  // immediatelyRender:false => editor è null al primo render lato client.
  if (!editor) {
    return (
      <div className="min-h-[380px] rounded-md border border-border bg-background" />
    );
  }

  return (
    <div className="rounded-md border border-border bg-background">
      {/* top-14 sotto lg: la topbar della shell è anch'essa sticky top-0 con
          z-30, quindi a top-0 la toolbar ci finiva sotto e spariva. */}
      <div className="sticky top-14 z-20 flex flex-wrap items-center gap-1 rounded-t-md border-b border-border bg-muted/60 px-2 py-2 backdrop-blur lg:top-0">
        <TB onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} label="Grassetto">
          <Bold className="size-4" />
        </TB>
        <TB onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} label="Corsivo">
          <Italic className="size-4" />
        </TB>
        <TB onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} label="Sottolineato">
          <UnderlineIcon className="size-4" />
        </TB>

        <Divider />

        <TB onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} label="Titolo 2">
          <Heading2 className="size-4" />
        </TB>
        <TB onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} label="Titolo 3">
          <Heading3 className="size-4" />
        </TB>
        <TB onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} label="Elenco puntato">
          <List className="size-4" />
        </TB>
        <TB onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} label="Elenco numerato">
          <ListOrdered className="size-4" />
        </TB>
        <TB onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} label="Citazione">
          <Quote className="size-4" />
        </TB>

        <Divider />

        <TB onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} label="Allinea a sinistra">
          <AlignLeft className="size-4" />
        </TB>
        <TB onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} label="Centra">
          <AlignCenter className="size-4" />
        </TB>
        <TB onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} label="Allinea a destra">
          <AlignRight className="size-4" />
        </TB>

        <Divider />

        <ColorPopover editor={editor} mode="text" />
        <ColorPopover editor={editor} mode="highlight" />

        <TB onClick={addLink} active={editor.isActive("link")} label="Link">
          <LinkIcon className="size-4" />
        </TB>
        <TB
          onClick={() => editor.chain().focus().unsetLink().run()}
          active={false}
          disabled={!editor.isActive("link")}
          label="Rimuovi link"
        >
          <Unlink className="size-4" />
        </TB>
        <TB onClick={() => fileInputRef.current?.click()} active={false} disabled={uploading} label="Immagine">
          <ImageIcon className="size-4" />
        </TB>

        <Divider />

        <TB onClick={() => editor.chain().focus().undo().run()} active={false} disabled={!editor.can().undo()} label="Annulla">
          <Undo2 className="size-4" />
        </TB>
        <TB onClick={() => editor.chain().focus().redo().run()} active={false} disabled={!editor.can().redo()} label="Ripeti">
          <Redo2 className="size-4" />
        </TB>
        <TB
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          active={false}
          label="Rimuovi formattazione"
        >
          <RemoveFormatting className="size-4" />
        </TB>
      </div>

      <EditorContent editor={editor} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPickImage}
      />
    </div>
  );
}

function TB({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md border transition-colors disabled:pointer-events-none disabled:opacity-40",
        active
          ? "border-azzurro/60 bg-azzurro-subtle text-azzurro"
          : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-border" />;
}

function ColorPopover({ editor, mode }: { editor: Editor; mode: "text" | "highlight" }) {
  const isText = mode === "text";
  const active = isText ? Boolean(editor.getAttributes("textStyle").color) : editor.isActive("highlight");
  const apply = (hex: string) => {
    if (isText) editor.chain().focus().setColor(hex).run();
    else editor.chain().focus().toggleHighlight({ color: hex }).run();
  };
  const reset = () => {
    if (isText) editor.chain().focus().unsetColor().run();
    else editor.chain().focus().unsetHighlight().run();
  };
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={isText ? "Colore testo" : "Evidenziatore"}
          title={isText ? "Colore testo" : "Evidenziatore"}
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-md border transition-colors",
            active
              ? "border-azzurro/60 bg-azzurro-subtle text-azzurro"
              : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {isText ? <Baseline className="size-4" /> : <Highlighter className="size-4" />}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          className="z-50 rounded-md border border-border bg-surface p-2 shadow-[var(--shadow-md)]"
        >
          <div className="grid grid-cols-3 gap-1.5">
            {SWATCHES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => apply(s.value)}
                aria-label={s.name}
                title={s.name}
                className="size-6 rounded-full border border-border"
                style={{ backgroundColor: s.value }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={reset}
            className="mt-2 w-full rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            Rimuovi
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
