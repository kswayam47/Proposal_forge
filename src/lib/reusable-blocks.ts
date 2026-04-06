import { v4 as uuidv4 } from "uuid";
import { ContentBlock, PlaceholderField } from "./supabase";

export type ReusableBlockType =
  | "bullet_key_value"
  | "bullet_indexed"
  | "calculations"
  | "bar_graph"
  | "plan"
  | "table_chart"
  | "metadata"
  | "sections_subsections";

export interface ReusableBlockConfig {
  id: ReusableBlockType;
  name: string;
  description: string;
  icon: string;
  category: "content" | "visualization" | "structure";
  createBlock: (sectionName: string, sectionNumber: number) => {
    headingBlock: ContentBlock;
    contentBlock: ContentBlock;
    placeholderFields: PlaceholderField[];
    formSectionConfig: {
      key: string;
      title: string;
      type: ReusableBlockType;
      dataKeys: string[];
      fields: { key: string; label: string; type: string }[];
      headingBlockId: string;
      contentBlockId: string;
    };
  };
}

export const REUSABLE_BLOCK_CONFIGS: ReusableBlockConfig[] = [
  {
    id: "bullet_key_value",
    name: "Bullet Points (Key-Value)",
    description: "Like Deliverables - categorized items with descriptions",
    icon: "list-check",
    category: "content",
    createBlock: (sectionName: string, sectionNumber: number) => {
      const baseKey = sectionName.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Date.now();
      const dataKey = `${baseKey}_items`;
      const introKey = `${baseKey}_intro`;
      const visualPlaceholder = `${baseKey}_items_section`;
      const headingBlockId = uuidv4();
      const contentBlockId = uuidv4();

        return {
          headingBlock: {
            id: headingBlockId,
            type: "heading" as const,
            level: 1,
            content: `${sectionNumber}. ${sectionName}`,
          },
          contentBlock: {
            id: contentBlockId,
            type: "paragraph" as const,
            content: "",
            visualPlaceholder,
          },
          placeholderFields: [
            {
              key: introKey,
              label: `${sectionName} Introduction`,
              type: "textarea",
              required: false,
            },
            {
              key: dataKey,
              label: `${sectionName} Items`,
              type: "list",
              required: false,
              columns: [
                { key: "type", label: "Category", type: "string" },
                { key: "description", label: "Description", type: "string" },
              ],
            },
          ],
          formSectionConfig: {
            key: baseKey,
            title: `${sectionNumber}. ${sectionName}`,
            type: "bullet_key_value",
            dataKeys: [introKey, dataKey],
            fields: [
              { key: introKey, label: "Introduction", type: "textarea" },
              { key: dataKey, label: "Items", type: "list" },
            ],
            headingBlockId,
            contentBlockId,
          },
        };

    },
  },
  {
    id: "bullet_indexed",
    name: "Bullet Points (Indexed)",
    description: "Like Assumptions & Dependencies - numbered items with categories",
    icon: "list-ordered",
    category: "content",
    createBlock: (sectionName: string, sectionNumber: number) => {
      const baseKey = sectionName.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Date.now();
      const dataKey = `${baseKey}_items`;
      const visualPlaceholder = `${baseKey}_indexed_section`;
      const prefix = sectionName.charAt(0).toUpperCase();
      const headingBlockId = uuidv4();
      const contentBlockId = uuidv4();

      return {
        headingBlock: {
          id: headingBlockId,
          type: "heading" as const,
          level: 1,
          content: `${sectionNumber}. ${sectionName}`,
        },
        contentBlock: {
          id: contentBlockId,
          type: "paragraph" as const,
          content: "",
          visualPlaceholder,
        },
        placeholderFields: [
          {
            key: dataKey,
            label: `${sectionName} Items`,
            type: "list",
            required: false,
            columns: [
              { key: "type", label: "Category", type: "string" },
              { key: "description", label: "Description", type: "string" },
            ],
          },
          {
            key: `${baseKey}_prefix`,
            label: "Index Prefix",
            type: "text",
            required: false,
            defaultValue: prefix,
          },
        ],
          formSectionConfig: {
            key: baseKey,
            title: `${sectionNumber}. ${sectionName}`,
            type: "bullet_indexed",
            dataKeys: [dataKey, `${baseKey}_prefix`],
            fields: [
              { key: dataKey, label: "Items", type: "list" },
              { key: `${baseKey}_prefix`, label: "Index Prefix (e.g. A, D, R)", type: "text" },
            ],
            headingBlockId,
            contentBlockId,
          },

      };
    },
  },
  {
    id: "calculations",
    name: "Calculations Section",
    description: "Like Pricing - with phase breakdowns, totals, and pie charts",
    icon: "calculator",
    category: "visualization",
    createBlock: (sectionName: string, sectionNumber: number) => {
      const baseKey = sectionName.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Date.now();
      const tableKey = `${baseKey}_table`;
      const taxKey = `${baseKey}_tax_percent`;
      const notesKey = `${baseKey}_notes`;
      const visualPlaceholder = `${baseKey}_pricing_section`;
      const headingBlockId = uuidv4();
      const contentBlockId = uuidv4();

      return {
        headingBlock: {
          id: headingBlockId,
          type: "heading" as const,
          level: 1,
          content: `${sectionNumber}. ${sectionName}`,
        },
        contentBlock: {
          id: contentBlockId,
          type: "chart" as const,
          content: "",
          visualPlaceholder,
        },
        placeholderFields: [
          {
            key: tableKey,
            label: `${sectionName} Phases`,
            type: "table",
            required: false,
            columns: [
              { key: "phase", label: "Phase/Item Name", type: "string" },
              { key: "cost", label: "Amount (₹)", type: "currency" },
            ],
          },
          {
            key: taxKey,
            label: "Tax Percentage (%)",
            type: "number",
            required: false,
            defaultValue: 18,
          },
          {
            key: notesKey,
            label: "Notes",
            type: "textarea",
            required: false,
          },
        ],
          formSectionConfig: {
            key: baseKey,
            title: `${sectionNumber}. ${sectionName}`,
            type: "calculations",
            dataKeys: [tableKey, taxKey, notesKey],
            fields: [
              { key: tableKey, label: "Phases/Breakdowns", type: "table" },
              { key: taxKey, label: "Tax Percentage (%)", type: "number" },
              { key: notesKey, label: "Notes", type: "textarea" },
            ],
            headingBlockId,
            contentBlockId,
          },

      };
    },
  },
  {
    id: "bar_graph",
    name: "Bar Graph Section",
    description: "Like Resource Engagement - horizontal bar visualization",
    icon: "bar-chart-horizontal",
    category: "visualization",
    createBlock: (sectionName: string, sectionNumber: number) => {
      const baseKey = sectionName.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Date.now();
      const dataKey = `${baseKey}_data`;
      const justificationKey = `${baseKey}_justification`;
      const visualPlaceholder = `${baseKey}_bar_section`;
      const headingBlockId = uuidv4();
      const contentBlockId = uuidv4();

      return {
        headingBlock: {
          id: headingBlockId,
          type: "heading" as const,
          level: 1,
          content: `${sectionNumber}. ${sectionName}`,
        },
        contentBlock: {
          id: contentBlockId,
          type: "chart" as const,
          content: "",
          visualPlaceholder,
        },
        placeholderFields: [
          {
            key: justificationKey,
            label: `${sectionName} Description`,
            type: "textarea",
            required: false,
          },
          {
            key: dataKey,
            label: `${sectionName} Items`,
            type: "table",
            required: false,
            columns: [
              { key: "role", label: "Label/Role", type: "string" },
              { key: "count", label: "Count", type: "number" },
              { key: "allocation", label: "Allocation %", type: "number" },
            ],
          },
        ],
          formSectionConfig: {
            key: baseKey,
            title: `${sectionNumber}. ${sectionName}`,
            type: "bar_graph",
            dataKeys: [justificationKey, dataKey],
            fields: [
              { key: justificationKey, label: "Justification", type: "textarea" },
              { key: dataKey, label: "Data Points", type: "table" },
            ],
            headingBlockId,
            contentBlockId,
          },

      };
    },
  },
  {
    id: "plan",
    name: "Plan Section",
    description: "Like Delivery Plan - timeline with phases and Gantt-style view",
    icon: "calendar-range",
    category: "visualization",
    createBlock: (sectionName: string, sectionNumber: number) => {
      const baseKey = sectionName.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Date.now();
      const phasesKey = `${baseKey}_phases`;
      const introKey = `${baseKey}_intro`;
      const visualPlaceholder = `${baseKey}_plan_section`;
      const headingBlockId = uuidv4();
      const contentBlockId = uuidv4();

      return {
        headingBlock: {
          id: headingBlockId,
          type: "heading" as const,
          level: 1,
          content: `${sectionNumber}. ${sectionName}`,
        },
        contentBlock: {
          id: contentBlockId,
          type: "chart" as const,
          content: "",
          visualPlaceholder,
        },
        placeholderFields: [
          {
            key: introKey,
            label: `${sectionName} Introduction`,
            type: "textarea",
            required: false,
          },
          {
            key: phasesKey,
            label: `${sectionName} Phases`,
            type: "table",
            required: false,
            columns: [
              { key: "title", label: "Phase Title", type: "string" },
              { key: "weeks_start", label: "Start Week", type: "number" },
              { key: "weeks_end", label: "End Week", type: "number" },
            ],
          },
        ],
          formSectionConfig: {
            key: baseKey,
            title: `${sectionNumber}. ${sectionName}`,
            type: "plan",
            dataKeys: [introKey, phasesKey],
            fields: [
              { key: introKey, label: "Introduction", type: "textarea" },
              { key: phasesKey, label: "Phases", type: "table" },
            ],
            headingBlockId,
            contentBlockId,
          },

      };
    },
  },
  {
    id: "table_chart",
    name: "Table with Chart",
    description: "Like Features & Requirements - data table with pie/bar visualization",
    icon: "table-chart",
    category: "visualization",
    createBlock: (sectionName: string, sectionNumber: number) => {
      const baseKey = sectionName.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Date.now();
      const listKey = `${baseKey}_list`;
      const titleKey = `${baseKey}_title`;
      const visualPlaceholder = `${baseKey}_table_chart_section`;
      const headingBlockId = uuidv4();
      const contentBlockId = uuidv4();

      return {
        headingBlock: {
          id: headingBlockId,
          type: "heading" as const,
          level: 1,
          content: `${sectionNumber}. ${sectionName}`,
        },
        contentBlock: {
          id: contentBlockId,
          type: "table" as const,
          content: "",
          visualPlaceholder,
        },
        placeholderFields: [
          {
            key: titleKey,
            label: `${sectionName} Table Title`,
            type: "text",
            required: false,
          },
          {
            key: listKey,
            label: `${sectionName} Items`,
            type: "table",
            required: false,
            columns: [
              { key: "category", label: "Category/App", type: "string" },
              { key: "subcategory", label: "Subcategory", type: "string" },
              { key: "name", label: "Name/Feature", type: "string" },
            ],
          },
        ],
          formSectionConfig: {
            key: baseKey,
            title: `${sectionNumber}. ${sectionName}`,
            type: "table_chart",
            dataKeys: [titleKey, listKey],
            fields: [
              { key: titleKey, label: "Table Title", type: "text" },
              { key: listKey, label: "Items", type: "table" },
            ],
            headingBlockId,
            contentBlockId,
          },

      };
    },
  },
  {
    id: "metadata",
    name: "Metadata Section",
    description: "Like Proposal Metadata - key-value display for document info",
    icon: "info",
    category: "structure",
    createBlock: (sectionName: string, sectionNumber: number) => {
      const baseKey = sectionName.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Date.now();
      const fieldsKey = `${baseKey}_fields`;
      const visualPlaceholder = `${baseKey}_metadata_section`;
      const headingBlockId = uuidv4();
      const contentBlockId = uuidv4();

      return {
        headingBlock: {
          id: headingBlockId,
          type: "heading" as const,
          level: 1,
          content: `${sectionNumber}. ${sectionName}`,
        },
        contentBlock: {
          id: contentBlockId,
          type: "paragraph" as const,
          content: "",
          visualPlaceholder,
        },
        placeholderFields: [
          {
            key: fieldsKey,
            label: `${sectionName} Fields`,
            type: "table",
            required: false,
            columns: [
              { key: "label", label: "Field Label", type: "string" },
              { key: "value", label: "Field Value", type: "string" },
            ],
          },
        ],
          formSectionConfig: {
            key: baseKey,
            title: `${sectionNumber}. ${sectionName}`,
            type: "metadata",
            dataKeys: [fieldsKey],
            fields: [
              { key: fieldsKey, label: "Fields", type: "table" },
            ],
            headingBlockId,
            contentBlockId,
          },

      };
    },
  },
  {
    id: "sections_subsections",
    name: "Sections with Subsections",
    description: "Like Change Management - grouped content with process/classification",
    icon: "layers",
    category: "structure",
    createBlock: (sectionName: string, sectionNumber: number) => {
      const baseKey = sectionName.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Date.now();
      const sub1Key = `${baseKey}_subsection1_items`;
      const sub2Key = `${baseKey}_subsection2_items`;
      const sub3Key = `${baseKey}_subsection3_items`;
      const visualPlaceholder = `${baseKey}_subsections_section`;
      const headingBlockId = uuidv4();
      const contentBlockId = uuidv4();

      return {
        headingBlock: {
          id: headingBlockId,
          type: "heading" as const,
          level: 1,
          content: `${sectionNumber}. ${sectionName}`,
        },
        contentBlock: {
          id: contentBlockId,
          type: "paragraph" as const,
          content: "",
          visualPlaceholder,
        },
        placeholderFields: [
          {
            key: sub1Key,
            label: `${sectionName} - Subsection 1`,
            type: "table",
            required: false,
            columns: [
              { key: "key", label: "Title", type: "string" },
              { key: "value", label: "Description", type: "string" },
            ],
          },
          {
            key: sub2Key,
            label: `${sectionName} - Subsection 2`,
            type: "table",
            required: false,
            columns: [
              { key: "key", label: "Title", type: "string" },
              { key: "value", label: "Description", type: "string" },
            ],
          },
          {
            key: sub3Key,
            label: `${sectionName} - Subsection 3 (Simple List)`,
            type: "list",
            required: false,
            columns: [{ key: "item", label: "Item", type: "string" }],
          },
        ],
          formSectionConfig: {
            key: baseKey,
            title: `${sectionNumber}. ${sectionName}`,
            type: "sections_subsections",
            dataKeys: [sub1Key, sub2Key, sub3Key],
            fields: [
              { key: sub1Key, label: "Subsection 1 (Key-Value)", type: "table" },
              { key: sub2Key, label: "Subsection 2 (Key-Value)", type: "table" },
              { key: sub3Key, label: "Subsection 3 (Simple List)", type: "list" },
            ],
            headingBlockId,
            contentBlockId,
          },

      };
    },
  },
];

export function getBlockConfig(type: ReusableBlockType): ReusableBlockConfig | undefined {
  return REUSABLE_BLOCK_CONFIGS.find((c) => c.id === type);
}

export function getBlocksByCategory(category: "content" | "visualization" | "structure"): ReusableBlockConfig[] {
  return REUSABLE_BLOCK_CONFIGS.filter((c) => c.category === category);
}
