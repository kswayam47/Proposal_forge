"use client";

import { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { v4 as uuidv4 } from "uuid";
import {
  GripVertical,
  Plus,
  Trash2,
  Copy,
  Type,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Image,
  Table2,
  BarChart3,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "./rich-text-editor";

export interface EditorBlock {
  id: string;
  type: "text" | "heading" | "list" | "quote" | "divider" | "image" | "table" | "chart" | "spacer";
  content: string;
  level?: 1 | 2 | 3;
  listType?: "bullet" | "ordered";
  metadata?: Record<string, any>;
}

interface SortableBlockProps {
  block: EditorBlock;
  index: number;
  theme: "light" | "dark";
  onUpdate: (id: string, content: string) => void;
  onUpdateMetadata: (id: string, metadata: Record<string, any>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onChangeType: (id: string, type: EditorBlock["type"], level?: number) => void;
  onAddBelow: (id: string) => void;
  isDragging?: boolean;
  proposalId?: string;
}

function SortableBlock({
  block,
  index,
  theme,
  onUpdate,
  onUpdateMetadata,
  onDelete,
  onDuplicate,
  onChangeType,
  onAddBelow,
  isDragging,
  proposalId,
}: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSorting,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isDark = theme === "dark";
  const [showActions, setShowActions] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useCallback((input: HTMLInputElement | null) => {
    if (input) {
      input.onclick = null;
    }
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("proposalId", proposalId || "general");
      formData.append("imageType", "content");

      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      onUpdate(block.id, data.url);
      onUpdateMetadata(block.id, { ...block.metadata, imagePath: data.path });
    } catch (error) {
      console.error("Image upload error:", error);
      alert(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const renderBlockContent = () => {
    switch (block.type) {
      case "heading":
        const HeadingTag = `h${block.level || 1}` as keyof JSX.IntrinsicElements;
        const headingSizes = {
          1: "text-3xl font-extrabold",
          2: "text-2xl font-bold",
          3: "text-xl font-semibold",
        };
        return (
          <div className="w-full">
            <HeadingTag
              contentEditable
              suppressContentEditableWarning
              className={cn(
                headingSizes[block.level || 1],
                "outline-none w-full",
                isDark ? "text-white" : "text-slate-900"
              )}
              onBlur={(e) => onUpdate(block.id, e.currentTarget.textContent || "")}
            >
              {block.content || "Heading"}
            </HeadingTag>
          </div>
        );

      case "text":
        return (
          <RichTextEditor
            content={block.content || "<p></p>"}
            onChange={(html) => onUpdate(block.id, html)}
            theme={theme}
            placeholder="Start typing..."
            className="w-full"
          />
        );

      case "list":
        const ListTag = block.listType === "ordered" ? "ol" : "ul";
        return (
          <div className="w-full">
            <ListTag
              className={cn(
                block.listType === "ordered" ? "list-decimal" : "list-disc",
                "pl-6 space-y-2",
                isDark ? "text-slate-300" : "text-slate-700"
              )}
            >
              {(block.content || "Item 1\nItem 2\nItem 3").split("\n").map((item, i) => (
                <li
                  key={i}
                  contentEditable
                  suppressContentEditableWarning
                  className="outline-none"
                  onBlur={(e) => {
                    const items = (block.content || "").split("\n");
                    items[i] = e.currentTarget.textContent || "";
                    onUpdate(block.id, items.join("\n"));
                  }}
                >
                  {item}
                </li>
              ))}
            </ListTag>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-xs opacity-60 hover:opacity-100"
              onClick={() => onUpdate(block.id, (block.content || "") + "\nNew item")}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add item
            </Button>
          </div>
        );

      case "quote":
        return (
          <blockquote
            contentEditable
            suppressContentEditableWarning
            className={cn(
              "border-l-4 pl-4 py-2 italic outline-none w-full",
              isDark ? "border-slate-500 text-slate-400" : "border-slate-300 text-slate-600"
            )}
            onBlur={(e) => onUpdate(block.id, e.currentTarget.textContent || "")}
          >
            {block.content || "Enter a quote..."}
          </blockquote>
        );

      case "divider":
        return (
          <hr className={cn("my-4", isDark ? "border-slate-700" : "border-slate-200")} />
        );

      case "spacer":
        return (
          <div
            className={cn(
              "h-8 w-full flex items-center justify-center border-2 border-dashed rounded cursor-ns-resize",
              isDark ? "border-slate-700 text-slate-500" : "border-slate-200 text-slate-400"
            )}
          >
            <span className="text-xs">Spacer</span>
          </div>
        );

      case "image":
        return block.content ? (
          <div className="relative group/image">
            <img
              src={block.content}
              alt="Uploaded image"
              className="max-w-full h-auto rounded-lg"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <span className={cn(
                  "px-3 py-1.5 rounded text-sm bg-white text-black hover:bg-gray-100"
                )}>
                  Replace
                </span>
              </label>
              <button
                onClick={() => onUpdate(block.id, "")}
                className="px-3 py-1.5 rounded text-sm bg-red-500 text-white hover:bg-red-600"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <label
            className={cn(
              "p-8 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2 cursor-pointer transition-colors",
              isDark ? "border-slate-700 bg-slate-800/50 hover:border-slate-500" : "border-slate-200 bg-slate-50 hover:border-slate-400",
              isUploading && "opacity-50 pointer-events-none"
            )}
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              disabled={isUploading}
            />
            <Image className={cn("h-8 w-8", isDark ? "text-slate-500" : "text-slate-400")} />
            <p className={cn("text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
              {isUploading ? "Uploading..." : "Click to upload image"}
            </p>
          </label>
        );

      case "table":
        return (
          <div
            className={cn(
              "p-8 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2",
              isDark ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-slate-50"
            )}
          >
            <Table2 className={cn("h-8 w-8", isDark ? "text-slate-500" : "text-slate-400")} />
            <p className={cn("text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
              Table placeholder
            </p>
          </div>
        );

      case "chart":
        return (
          <div
            className={cn(
              "p-8 border-2 border-dashed rounded-xl text-center flex flex-col items-center gap-2",
              isDark ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-slate-50"
            )}
          >
            <BarChart3 className={cn("h-8 w-8", isDark ? "text-slate-500" : "text-slate-400")} />
            <p className={cn("text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
              Chart placeholder
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative",
        isSorting && "opacity-50",
        isDragging && "z-50"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div
        className={cn(
          "flex items-start gap-2 p-2 rounded-lg transition-colors",
          showActions && (isDark ? "bg-slate-800/50" : "bg-slate-50"),
          isSorting && "ring-2 ring-primary ring-offset-2"
        )}
      >
        <div
          className={cn(
            "flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pt-1",
            showActions && "opacity-100"
          )}
        >
          <button
            {...attributes}
            {...listeners}
            className={cn(
              "cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700",
              isDark ? "text-slate-500" : "text-slate-400"
            )}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700",
                  isDark ? "text-slate-500" : "text-slate-400"
                )}
              >
                <Plus className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => onAddBelow(block.id)}>
                <FileText className="h-4 w-4 mr-2" />
                Text Block
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                onAddBelow(block.id);
                setTimeout(() => onChangeType(block.id, "heading", 1), 0);
              }}>
                <Heading1 className="h-4 w-4 mr-2" />
                Heading 1
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                onAddBelow(block.id);
                setTimeout(() => onChangeType(block.id, "heading", 2), 0);
              }}>
                <Heading2 className="h-4 w-4 mr-2" />
                Heading 2
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                onAddBelow(block.id);
                setTimeout(() => onChangeType(block.id, "heading", 3), 0);
              }}>
                <Heading3 className="h-4 w-4 mr-2" />
                Heading 3
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                onAddBelow(block.id);
                setTimeout(() => onChangeType(block.id, "list"), 0);
              }}>
                <List className="h-4 w-4 mr-2" />
                Bullet List
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                onAddBelow(block.id);
                setTimeout(() => {
                  onChangeType(block.id, "list");
                }, 0);
              }}>
                <ListOrdered className="h-4 w-4 mr-2" />
                Numbered List
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                onAddBelow(block.id);
                setTimeout(() => onChangeType(block.id, "quote"), 0);
              }}>
                <Quote className="h-4 w-4 mr-2" />
                Quote
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                onAddBelow(block.id);
                setTimeout(() => onChangeType(block.id, "divider"), 0);
              }}>
                <Minus className="h-4 w-4 mr-2" />
                Divider
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                onAddBelow(block.id);
                setTimeout(() => onChangeType(block.id, "spacer"), 0);
              }}>
                <ChevronUp className="h-4 w-4 mr-2" />
                Spacer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex-1 min-w-0">{renderBlockContent()}</div>

        <div
          className={cn(
            "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
            showActions && "opacity-100"
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onDuplicate(block.id)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onChangeType(block.id, "text")}>
                <FileText className="h-4 w-4 mr-2" />
                Convert to Text
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeType(block.id, "heading", 1)}>
                <Heading1 className="h-4 w-4 mr-2" />
                Convert to H1
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeType(block.id, "heading", 2)}>
                <Heading2 className="h-4 w-4 mr-2" />
                Convert to H2
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeType(block.id, "heading", 3)}>
                <Heading3 className="h-4 w-4 mr-2" />
                Convert to H3
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeType(block.id, "list")}>
                <List className="h-4 w-4 mr-2" />
                Convert to List
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeType(block.id, "quote")}>
                <Quote className="h-4 w-4 mr-2" />
                Convert to Quote
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(block.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

interface ProposalBlockEditorProps {
  initialBlocks?: EditorBlock[];
  onChange?: (blocks: EditorBlock[]) => void;
  theme?: "light" | "dark";
  className?: string;
  proposalId?: string;
}

export function ProposalBlockEditor({
  initialBlocks,
  onChange,
  theme = "dark",
  className,
  proposalId,
}: ProposalBlockEditorProps) {
  const [blocks, setBlocks] = useState<EditorBlock[]>(
    initialBlocks || [
      { id: uuidv4(), type: "heading", content: "Untitled Document", level: 1 },
      { id: uuidv4(), type: "text", content: "<p>Start writing your content here...</p>" },
    ]
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  const isDark = theme === "dark";

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newBlocks = arrayMove(items, oldIndex, newIndex);
        onChange?.(newBlocks);
        return newBlocks;
      });
    }
  };

  const handleUpdateBlock = useCallback((id: string, content: string) => {
    setBlocks((prev) => {
      const newBlocks = prev.map((block) =>
        block.id === id ? { ...block, content } : block
      );
      onChange?.(newBlocks);
      return newBlocks;
    });
  }, [onChange]);

  const handleUpdateMetadata = useCallback((id: string, metadata: Record<string, any>) => {
    setBlocks((prev) => {
      const newBlocks = prev.map((block) =>
        block.id === id ? { ...block, metadata } : block
      );
      onChange?.(newBlocks);
      return newBlocks;
    });
  }, [onChange]);

  const handleDeleteBlock = useCallback((id: string) => {
    setBlocks((prev) => {
      if (prev.length <= 1) return prev;
      const newBlocks = prev.filter((block) => block.id !== id);
      onChange?.(newBlocks);
      return newBlocks;
    });
  }, [onChange]);

  const handleDuplicateBlock = useCallback((id: string) => {
    setBlocks((prev) => {
      const index = prev.findIndex((block) => block.id === id);
      if (index === -1) return prev;
      const block = prev[index];
      const newBlock = { ...block, id: uuidv4() };
      const newBlocks = [...prev.slice(0, index + 1), newBlock, ...prev.slice(index + 1)];
      onChange?.(newBlocks);
      return newBlocks;
    });
  }, [onChange]);

  const handleChangeType = useCallback((id: string, type: EditorBlock["type"], level?: number) => {
    setBlocks((prev) => {
      const newBlocks = prev.map((block) =>
        block.id === id
          ? {
              ...block,
              type,
              level: level as 1 | 2 | 3 | undefined,
              listType: type === "list" ? "bullet" : undefined,
            }
          : block
      );
      onChange?.(newBlocks);
      return newBlocks;
    });
  }, [onChange]);

  const handleAddBelow = useCallback((id: string) => {
    setBlocks((prev) => {
      const index = prev.findIndex((block) => block.id === id);
      if (index === -1) return prev;
      const newBlock: EditorBlock = {
        id: uuidv4(),
        type: "text",
        content: "<p></p>",
      };
      const newBlocks = [...prev.slice(0, index + 1), newBlock, ...prev.slice(index + 1)];
      onChange?.(newBlocks);
      return newBlocks;
    });
  }, [onChange]);

  const addBlockAtEnd = useCallback((type: EditorBlock["type"] = "text") => {
    const newBlock: EditorBlock = {
      id: uuidv4(),
      type,
      content: type === "text" ? "<p></p>" : "",
      level: type === "heading" ? 2 : undefined,
      listType: type === "list" ? "bullet" : undefined,
    };
    setBlocks((prev) => {
      const newBlocks = [...prev, newBlock];
      onChange?.(newBlocks);
      return newBlocks;
    });
  }, [onChange]);

  const activeBlock = useMemo(
    () => blocks.find((block) => block.id === activeId),
    [blocks, activeId]
  );

  return (
    <div className={cn("proposal-block-editor", className)}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1">
              {blocks.map((block, index) => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  index={index}
                  theme={theme}
                  onUpdate={handleUpdateBlock}
                  onUpdateMetadata={handleUpdateMetadata}
                  onDelete={handleDeleteBlock}
                  onDuplicate={handleDuplicateBlock}
                  onChangeType={handleChangeType}
                  onAddBelow={handleAddBelow}
                  proposalId={proposalId}
                />
              ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeBlock ? (
            <div
              className={cn(
                "p-4 rounded-lg shadow-lg opacity-90",
                isDark ? "bg-slate-800" : "bg-white"
              )}
            >
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-slate-500" />
                <span className={cn("text-sm", isDark ? "text-white" : "text-slate-900")}>
                  {activeBlock.type === "heading"
                    ? `Heading ${activeBlock.level}`
                    : activeBlock.type.charAt(0).toUpperCase() + activeBlock.type.slice(1)}
                </span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <div className="mt-4 flex justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "gap-2",
                isDark ? "border-slate-700 hover:bg-slate-800" : ""
              )}
            >
              <Plus className="h-4 w-4" />
              Add Block
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48">
            <DropdownMenuItem onClick={() => addBlockAtEnd("text")}>
              <FileText className="h-4 w-4 mr-2" />
              Text Block
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addBlockAtEnd("heading")}>
              <Type className="h-4 w-4 mr-2" />
              Heading
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addBlockAtEnd("list")}>
              <List className="h-4 w-4 mr-2" />
              List
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addBlockAtEnd("quote")}>
              <Quote className="h-4 w-4 mr-2" />
              Quote
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => addBlockAtEnd("divider")}>
              <Minus className="h-4 w-4 mr-2" />
              Divider
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addBlockAtEnd("spacer")}>
              <ChevronUp className="h-4 w-4 mr-2" />
              Spacer
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => addBlockAtEnd("image")}>
              <Image className="h-4 w-4 mr-2" />
              Image
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addBlockAtEnd("table")}>
              <Table2 className="h-4 w-4 mr-2" />
              Table
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addBlockAtEnd("chart")}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Chart
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
