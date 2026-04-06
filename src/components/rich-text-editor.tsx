"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import { TextAlign } from "@tiptap/extension-text-align";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Extension } from "@tiptap/core";
import { useEffect, useCallback, useState, useRef } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Type,
  Palette,
  Highlighter,
  ChevronDown,
  Plus,
  Minus,
  Strikethrough,
  Quote,
  Pilcrow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return {
      types: ["textStyle"],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) =>
              element.style.fontSize?.replace(/['"]+/g, ""),
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }: any) => {
          return chain().setMark("textStyle", { fontSize }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }: any) => {
          return chain()
            .setMark("textStyle", { fontSize: null })
            .removeEmptyTextStyle()
            .run();
        },
    };
  },
});

const FontFamily = Extension.create({
  name: "fontFamily",
  addOptions() {
    return {
      types: ["textStyle"],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontFamily: {
            default: null,
            parseHTML: (element) =>
              element.style.fontFamily?.replace(/['"]+/g, ""),
            renderHTML: (attributes) => {
              if (!attributes.fontFamily) {
                return {};
              }
              return {
                style: `font-family: ${attributes.fontFamily}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontFamily:
        (fontFamily: string) =>
        ({ chain }: any) => {
          return chain().setMark("textStyle", { fontFamily }).run();
        },
      unsetFontFamily:
        () =>
        ({ chain }: any) => {
          return chain()
            .setMark("textStyle", { fontFamily: null })
            .removeEmptyTextStyle()
            .run();
        },
    };
  },
});

const LineHeight = Extension.create({
  name: "lineHeight",
  addOptions() {
    return {
      types: ["paragraph", "heading"],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) {
                return {};
              }
              return {
                style: `line-height: ${attributes.lineHeight}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setLineHeight:
        (lineHeight: string) =>
        ({ commands }: any) => {
          return this.options.types.every((type: string) =>
            commands.updateAttributes(type, { lineHeight })
          );
        },
      unsetLineHeight:
        () =>
        ({ commands }: any) => {
          return this.options.types.every((type: string) =>
            commands.resetAttributes(type, "lineHeight")
          );
        },
    };
  },
});

const LetterSpacing = Extension.create({
  name: "letterSpacing",
  addOptions() {
    return {
      types: ["textStyle"],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          letterSpacing: {
            default: null,
            parseHTML: (element) => element.style.letterSpacing || null,
            renderHTML: (attributes) => {
              if (!attributes.letterSpacing) {
                return {};
              }
              return {
                style: `letter-spacing: ${attributes.letterSpacing}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setLetterSpacing:
        (letterSpacing: string) =>
        ({ chain }: any) => {
          return chain().setMark("textStyle", { letterSpacing }).run();
        },
      unsetLetterSpacing:
        () =>
        ({ chain }: any) => {
          return chain()
            .setMark("textStyle", { letterSpacing: null })
            .removeEmptyTextStyle()
            .run();
        },
    };
  },
});

const FONT_FAMILIES = [
  { value: "Inter", label: "Inter" },
  { value: "Arial", label: "Arial" },
  { value: "Georgia", label: "Georgia" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Courier New", label: "Courier New" },
  { value: "Verdana", label: "Verdana" },
  { value: "Trebuchet MS", label: "Trebuchet MS" },
  { value: "Palatino Linotype", label: "Palatino" },
  { value: "Helvetica", label: "Helvetica" },
  { value: "Roboto", label: "Roboto" },
  { value: "Open Sans", label: "Open Sans" },
  { value: "Montserrat", label: "Montserrat" },
];

const FONT_SIZES = [
  "8px", "10px", "12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "36px", "48px", "64px", "72px"
];

const PRESET_COLORS = [
  "#000000", "#374151", "#6b7280", "#9ca3af", "#d1d5db", "#ffffff",
  "#dc2626", "#ea580c", "#d97706", "#ca8a04", "#65a30d", "#16a34a",
  "#059669", "#0d9488", "#0891b2", "#0284c7", "#2563eb", "#4f46e5",
  "#7c3aed", "#9333ea", "#c026d3", "#db2777", "#e11d48", "#f43f5e",
];

const HIGHLIGHT_COLORS = [
  "#fef08a", "#fde047", "#bef264", "#86efac", "#5eead4", "#7dd3fc",
  "#a5b4fc", "#c4b5fd", "#f0abfc", "#fda4af", "#fed7aa", "#ffffff",
];

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  theme?: "light" | "dark";
  placeholder?: string;
  className?: string;
  editable?: boolean;
}

export function RichTextEditor({
  content,
  onChange,
  theme = "dark",
  placeholder = "Start typing...",
  className,
  editable = true,
}: RichTextEditorProps) {
  const isDark = theme === "dark";
  const [currentFontSize, setCurrentFontSize] = useState("16px");
  const [currentFontFamily, setCurrentFontFamily] = useState("Inter");
  const [currentColor, setCurrentColor] = useState("#000000");
  const [customColor, setCustomColor] = useState("#000000");
  const [lineHeight, setLineHeight] = useState(1.6);
  const [letterSpacing, setLetterSpacing] = useState(0);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextStyle,
      Color,
      FontSize,
      FontFamily,
      LineHeight,
      LetterSpacing,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[200px] max-w-none",
          isDark ? "prose-invert" : "",
          "p-4"
        ),
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content]);

  const applyFontSize = useCallback(
    (size: string) => {
      if (!editor) return;
      setCurrentFontSize(size);
      (editor.chain().focus() as any).setFontSize(size).run();
    },
    [editor]
  );

  const applyFontFamily = useCallback(
    (family: string) => {
      if (!editor) return;
      setCurrentFontFamily(family);
      (editor.chain().focus() as any).setFontFamily(family).run();
    },
    [editor]
  );

  const applyColor = useCallback(
    (color: string) => {
      if (!editor) return;
      setCurrentColor(color);
      editor.chain().focus().setColor(color).run();
    },
    [editor]
  );

  const applyHighlight = useCallback(
    (color: string) => {
      if (!editor) return;
      editor.chain().focus().toggleHighlight({ color }).run();
    },
    [editor]
  );

  const applyLineHeight = useCallback(
    (value: number) => {
      if (!editor) return;
      setLineHeight(value);
      (editor.chain().focus() as any).setLineHeight(`${value}`).run();
    },
    [editor]
  );

  const applyLetterSpacing = useCallback(
    (value: number) => {
      if (!editor) return;
      setLetterSpacing(value);
      (editor.chain().focus() as any).setLetterSpacing(`${value}px`).run();
    },
    [editor]
  );

  if (!editor) {
    return null;
  }

  return (
    <div className={cn("rich-text-editor", className)}>
      <div
        className={cn(
          "sticky top-0 z-10 flex flex-wrap items-center gap-1 p-2 border-b rounded-t-lg",
          isDark
            ? "bg-slate-800 border-slate-700"
            : "bg-white border-slate-200"
        )}
      >
        <div className="flex items-center gap-1 pr-2 border-r border-slate-600">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        <Select value={currentFontFamily} onValueChange={applyFontFamily}>
          <SelectTrigger className={cn("w-[130px] h-8", isDark ? "bg-slate-700 border-slate-600" : "")}>
            <Type className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((font) => (
              <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                {font.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={currentFontSize} onValueChange={applyFontSize}>
          <SelectTrigger className={cn("w-[80px] h-8", isDark ? "bg-slate-700 border-slate-600" : "")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map((size) => (
              <SelectItem key={size} value={size}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-0.5 px-1 border-l border-r border-slate-600">
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", editor.isActive("bold") && "bg-slate-700")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", editor.isActive("italic") && "bg-slate-700")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", editor.isActive("underline") && "bg-slate-700")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", editor.isActive("strike") && "bg-slate-700")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <div className="flex flex-col items-center">
                <Palette className="h-4 w-4" />
                <div className="w-4 h-1 rounded" style={{ backgroundColor: currentColor }} />
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <div className="space-y-3">
              <p className={cn("text-sm font-medium", isDark ? "text-white" : "text-slate-900")}>Text Color</p>
              <div className="grid grid-cols-6 gap-1.5">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    className={cn(
                      "w-7 h-7 rounded border-2 transition-transform hover:scale-110",
                      currentColor === color ? "border-primary" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => applyColor(color)}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => {
                    setCustomColor(e.target.value);
                    applyColor(e.target.value);
                  }}
                  className="w-8 h-8 rounded cursor-pointer"
                />
                <span className={cn("text-xs", isDark ? "text-slate-400" : "text-slate-500")}>Custom color</span>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Highlighter className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3" align="start">
            <div className="space-y-3">
              <p className={cn("text-sm font-medium", isDark ? "text-white" : "text-slate-900")}>Highlight Color</p>
              <div className="grid grid-cols-6 gap-1.5">
                {HIGHLIGHT_COLORS.map((color) => (
                  <button
                    key={color}
                    className={cn(
                      "w-7 h-7 rounded border transition-transform hover:scale-110",
                      isDark ? "border-slate-600" : "border-slate-200"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => applyHighlight(color)}
                  />
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => editor.chain().focus().unsetHighlight().run()}
              >
                Remove Highlight
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-0.5 px-1 border-l border-slate-600">
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", editor.isActive({ textAlign: "left" }) && "bg-slate-700")}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", editor.isActive({ textAlign: "center" }) && "bg-slate-700")}
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", editor.isActive({ textAlign: "right" }) && "bg-slate-700")}
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", editor.isActive({ textAlign: "justify" }) && "bg-slate-700")}
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          >
            <AlignJustify className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-0.5 px-1 border-l border-slate-600">
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", editor.isActive("heading", { level: 1 }) && "bg-slate-700")}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", editor.isActive("heading", { level: 2 }) && "bg-slate-700")}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", editor.isActive("heading", { level: 3 }) && "bg-slate-700")}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            <Heading3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", editor.isActive("paragraph") && "bg-slate-700")}
            onClick={() => editor.chain().focus().setParagraph().run()}
          >
            <Pilcrow className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-0.5 px-1 border-l border-slate-600">
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", editor.isActive("bulletList") && "bg-slate-700")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", editor.isActive("orderedList") && "bg-slate-700")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", editor.isActive("blockquote") && "bg-slate-700")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="h-4 w-4" />
          </Button>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2">
              <span className="text-xs">Spacing</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4" align="start">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className={cn("text-sm font-medium", isDark ? "text-white" : "text-slate-900")}>
                    Line Height
                  </span>
                  <span className={cn("text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
                    {lineHeight.toFixed(1)}
                  </span>
                </div>
                <Slider
                  value={[lineHeight]}
                  onValueChange={([v]) => applyLineHeight(v)}
                  min={1}
                  max={3}
                  step={0.1}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className={cn("text-sm font-medium", isDark ? "text-white" : "text-slate-900")}>
                    Letter Spacing
                  </span>
                  <span className={cn("text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
                    {letterSpacing}px
                  </span>
                </div>
                <Slider
                  value={[letterSpacing]}
                  onValueChange={([v]) => applyLetterSpacing(v)}
                  min={-2}
                  max={10}
                  step={0.5}
                  className="w-full"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {editor && (
        <BubbleMenu
          editor={editor}
          options={{ placement: 'top' }}
          className={cn(
            "flex items-center gap-1 p-1.5 rounded-lg shadow-lg border",
            isDark
              ? "bg-slate-800 border-slate-700"
              : "bg-white border-slate-200"
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", editor.isActive("bold") && "bg-slate-700")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", editor.isActive("italic") && "bg-slate-700")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", editor.isActive("underline") && "bg-slate-700")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px h-5 bg-slate-600 mx-1" />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Palette className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="grid grid-cols-6 gap-1">
                {PRESET_COLORS.slice(0, 12).map((color) => (
                  <button
                    key={color}
                    className="w-6 h-6 rounded border border-slate-300 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => applyColor(color)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Highlighter className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="grid grid-cols-6 gap-1">
                {HIGHLIGHT_COLORS.map((color) => (
                  <button
                    key={color}
                    className="w-6 h-6 rounded border border-slate-300 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => applyHighlight(color)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </BubbleMenu>
      )}

      <div
        className={cn(
          "rounded-b-lg border border-t-0 min-h-[300px]",
          isDark
            ? "bg-slate-900 border-slate-700"
            : "bg-white border-slate-200"
        )}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
