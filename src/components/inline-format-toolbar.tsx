"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Palette,
  Highlighter,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const FONT_SIZES = ["2px", "4px", "6px", "8px", "10px", "12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "36px", "48px", "64px", "72px", "96px", "128px"];

const FONT_FAMILIES = [
  { value: "Inter, sans-serif", label: "Inter" },
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "'Times New Roman', serif", label: "Times" },
  { value: "'Courier New', monospace", label: "Courier" },
  { value: "Verdana, sans-serif", label: "Verdana" },
  { value: "system-ui, sans-serif", label: "System" },
];

const TEXT_COLORS = [
  "#000000", "#374151", "#6b7280", "#9ca3af", "#ffffff",
  "#ef4444", "#f97316", "#f59e0b", "#10b981", "#06b6d4",
  "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef", "#f43f5e",
];

const HIGHLIGHT_COLORS = [
  "#fef08a", "#fde047", "#bef264", "#86efac", "#5eead4",
  "#7dd3fc", "#a5b4fc", "#c4b5fd", "#f0abfc", "#fda4af",
  "transparent",
];

interface InlineFormatToolbarProps {
  containerRef: React.RefObject<HTMLElement>;
  onFormat: (command: string, value?: string) => void;
  theme?: "light" | "dark";
}

export function InlineFormatToolbar({ containerRef, onFormat, theme = "dark" }: InlineFormatToolbarProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [currentFontSize, setCurrentFontSize] = useState("16px");
  const toolbarRef = useRef<HTMLDivElement>(null);
  const isDark = theme === "dark";

  const updateToolbarPosition = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      setVisible(false);
      return;
    }

    const range = selection.getRangeAt(0);
    const container = containerRef.current;
    
    if (!container || !container.contains(range.commonAncestorContainer)) {
      setVisible(false);
      return;
    }

    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    if (rect.width === 0) {
      setVisible(false);
      return;
    }

    const toolbarWidth = 400;
    let left = rect.left + rect.width / 2 - toolbarWidth / 2;
    left = Math.max(containerRect.left + 10, Math.min(left, containerRect.right - toolbarWidth - 10));

    setPosition({
      top: rect.top - 50,
      left: left,
    });
    setVisible(true);

    // Try to detect current font size
    try {
      const parent = range.commonAncestorContainer.parentElement;
      if (parent) {
        const size = window.getComputedStyle(parent).fontSize;
        setCurrentFontSize(size);
      }
    } catch (e) {}
  }, [containerRef]);

  useEffect(() => {
    const handleSelectionChange = () => {
      setTimeout(updateToolbarPosition, 10);
    };

    const handleMouseUp = () => {
      setTimeout(updateToolbarPosition, 10);
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [updateToolbarPosition]);

  const execCommand = (command: string, value?: string) => {
    if (command === "fontSize" && value) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        const selectedContent = range.extractContents();
        
        const walker = document.createTreeWalker(
          selectedContent,
          NodeFilter.SHOW_ELEMENT,
          null
        );
        
        const elementsToUnwrap: HTMLElement[] = [];
        let node;
        while ((node = walker.nextNode())) {
          const el = node as HTMLElement;
          if (el.tagName === 'SPAN' && el.style.fontSize) {
            elementsToUnwrap.push(el);
          }
        }
        
        elementsToUnwrap.forEach(el => {
          el.style.fontSize = '';
          if (!el.getAttribute('style') || el.getAttribute('style') === '') {
            const parent = el.parentNode;
            while (el.firstChild) {
              parent?.insertBefore(el.firstChild, el);
            }
            parent?.removeChild(el);
          }
        });
        
        const span = document.createElement("span");
        span.style.fontSize = value;
        span.appendChild(selectedContent);
        range.insertNode(span);
        
        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        selection.addRange(newRange);
        
        setCurrentFontSize(value);
      }
    } else {
      document.execCommand(command, false, value);
    }
    onFormat(command, value);
  };

  if (!visible) return null;

  return (
    <div
      ref={toolbarRef}
      className={cn(
        "fixed z-50 flex items-center gap-0.5 p-1.5 rounded-lg shadow-2xl border animate-in fade-in zoom-in-95 duration-150",
        isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
      )}
      style={{ top: position.top, left: position.left }}
      onMouseDown={(e) => e.preventDefault()}
    >
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className={cn("h-8 gap-1 px-2 hover:bg-muted", isDark ? "text-white" : "text-slate-900")}>
              <Type className="h-3.5 w-3.5" />
              <ChevronDown className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className={cn("w-36 p-1 z-[60]", isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900")} align="start">
            {FONT_FAMILIES.map((font) => (
              <button
                key={font.value}
                className={cn(
                  "w-full text-left px-2 py-1.5 text-sm rounded transition-colors",
                  isDark ? "text-slate-200 hover:bg-slate-800" : "text-slate-900 hover:bg-slate-100"
                )}
                style={{ fontFamily: font.value }}
                onClick={() => execCommand("fontName", font.value)}
              >
                {font.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className={cn("h-8 gap-1 px-2 text-xs hover:bg-muted", isDark ? "text-white" : "text-slate-900")}>
              {currentFontSize}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className={cn("w-24 p-1 z-[60] max-h-60 overflow-y-auto", isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900")} align="start">
            {FONT_SIZES.map((size) => (
              <button
                key={size}
                className={cn(
                  "w-full text-left px-2 py-1 text-sm rounded transition-colors",
                  isDark ? "text-slate-200 hover:bg-slate-800" : "text-slate-900 hover:bg-slate-100"
                )}
                onClick={() => execCommand("fontSize", size)}
              >
                {size}
              </button>
            ))}
            <div className="p-1 border-t border-slate-700 mt-1">
              <input 
                type="number" 
                className={cn("w-full h-7 px-1 text-xs rounded border bg-transparent", isDark ? "border-slate-700 text-white" : "border-slate-200 text-slate-900")}
                placeholder="Custom px"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.currentTarget.value) + 'px';
                    execCommand("fontSize", val);
                  }
                }}
              />
            </div>
          </PopoverContent>
        </Popover>

      <div className={cn("w-px h-5 mx-1", isDark ? "bg-slate-700" : "bg-slate-200")} />

      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8 hover:bg-muted", isDark ? "text-white" : "text-slate-900")}
        onClick={() => execCommand("bold")}
      >
        <Bold className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8 hover:bg-muted", isDark ? "text-white" : "text-slate-900")}
        onClick={() => execCommand("italic")}
      >
        <Italic className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8 hover:bg-muted", isDark ? "text-white" : "text-slate-900")}
        onClick={() => execCommand("underline")}
      >
        <Underline className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8 hover:bg-muted", isDark ? "text-white" : "text-slate-900")}
        onClick={() => execCommand("strikeThrough")}
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </Button>

      <div className={cn("w-px h-5 mx-1", isDark ? "bg-slate-700" : "bg-slate-200")} />

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className={cn("h-8 w-8 hover:bg-muted", isDark ? "text-white" : "text-slate-900")}>
              <Palette className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className={cn("w-44 p-2 z-[60]", isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900")} align="start">
            <p className={cn("text-xs font-medium mb-2", isDark ? "text-slate-400" : "text-slate-500")}>Text Color</p>
            <div className="grid grid-cols-5 gap-1">
              {TEXT_COLORS.map((color) => (
                <button
                  key={color}
                  className={cn("w-6 h-6 rounded border hover:scale-110 transition-transform", isDark ? "border-slate-700" : "border-slate-200")}
                  style={{ backgroundColor: color }}
                  onClick={() => execCommand("foreColor", color)}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className={cn("h-8 w-8 hover:bg-muted", isDark ? "text-white" : "text-slate-900")}>
              <Highlighter className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className={cn("w-44 p-2 z-[60]", isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900")} align="start">
            <p className={cn("text-xs font-medium mb-2", isDark ? "text-slate-400" : "text-slate-500")}>Highlight</p>
            <div className="grid grid-cols-5 gap-1">
              {HIGHLIGHT_COLORS.map((color, i) => (
                <button
                  key={i}
                  className={cn(
                    "w-6 h-6 rounded border hover:scale-110 transition-transform flex items-center justify-center",
                    color === "transparent" ? "bg-white border-dashed" : "",
                    isDark ? "border-slate-700" : "border-slate-200"
                  )}
                  style={{ backgroundColor: color === "transparent" ? undefined : color }}
                  onClick={() => execCommand("hiliteColor", color)}
                >
                  {color === "transparent" && <span className="text-[10px] text-slate-400">X</span>}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

      <div className={cn("w-px h-5 mx-1", isDark ? "bg-slate-700" : "bg-slate-200")} />

      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8 hover:bg-muted", isDark ? "text-white" : "text-slate-900")}
        onClick={() => execCommand("justifyLeft")}
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8 hover:bg-muted", isDark ? "text-white" : "text-slate-900")}
        onClick={() => execCommand("justifyCenter")}
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8 hover:bg-muted", isDark ? "text-white" : "text-slate-900")}
        onClick={() => execCommand("justifyRight")}
      >
        <AlignRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
