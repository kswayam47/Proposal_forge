import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  PageBreak,
  ImageRun,
  convertInchesToTwip,
  ShadingType,
  TableLayoutType,
} from "docx";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function formatCurrency(amount: number): string {
  if (amount === 0) return "₹0";
  const absAmount = Math.abs(amount);
  if (absAmount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (absAmount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  if (absAmount >= 1000) return `₹${(amount / 1000).toFixed(2)} K`;
  return `₹${amount.toFixed(0)}`;
}

function createStyledTableCell(text: string, isHeader: boolean = false, width?: number) {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text, bold: isHeader, size: isHeader ? 22 : 20 })],
      spacing: { before: 60, after: 60 },
    })],
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    shading: isHeader ? { fill: "E8E8E8", type: ShadingType.CLEAR } : undefined,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { proposalId, chartImages } = await request.json();

    if (!proposalId) {
      return NextResponse.json({ error: "Proposal ID required" }, { status: 400 });
    }

    const { data: proposal, error: proposalError } = await supabase
      .from("proposals")
      .select("*, template:templates(*)")
      .eq("id", proposalId)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const filledData = proposal.filled_data || {};
    const template = proposal.template;
    const children: any[] = [];

    children.push(
      new Paragraph({
        text: proposal.title || "Business Proposal",
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Prepared for: ", italics: true }),
          new TextRun({ text: filledData.client_name || proposal.client_name || "Client", bold: true }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Template: ${template?.proposal_type || "Standard"}`, italics: true }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
            italics: true
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({ children: [new PageBreak()] })
    );

    children.push(
      new Paragraph({
        text: "Table of Contents",
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 },
      })
    );

    const sections = [
      "Proposal Metadata",
      "Business Understanding",
      "Features & Requirements",
      "Delivery Plan",
      "Resource Engagement",
      "Pricing",
      "Tasks Involved",
      "Deliverables",
      "Assumptions & Dependencies",
      "Change Management",
      "Governance",
      "Sign-off Requirements",
    ];

    sections.forEach((section, i) => {
      children.push(
        new Paragraph({
          text: `${i + 1}. ${section}`,
          spacing: { after: 100 },
        })
      );
    });

    children.push(new Paragraph({ children: [new PageBreak()] }));

    children.push(
      new Paragraph({
        text: "1. Proposal Metadata",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    const metadataRows = [
      ["Client Name", filledData.client_name || "-"],
      ["Industry", filledData.client_industry || "-"],
      ["Region", filledData.region || "-"],
      ["Start Date", filledData.start_date ? new Date(filledData.start_date as string).toLocaleDateString() : "-"],
      ["Validity Period", filledData.validity_period || "-"],
      ["Author", filledData.proposal_author || "-"],
    ];

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: metadataRows.map(([label, value]) =>
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })],
                width: { size: 30, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [new Paragraph({ text: String(value) })],
                width: { size: 70, type: WidthType.PERCENTAGE },
              }),
            ],
          })
        ),
      })
    );

    children.push(new Paragraph({ children: [new PageBreak()] }));

    children.push(
      new Paragraph({
        text: "2. Business Understanding",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    if (filledData.client_overview) {
      children.push(
        new Paragraph({
          text: "Client Overview",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        }),
        new Paragraph({
          text: String(filledData.client_overview),
          spacing: { after: 200 },
        })
      );
    }

    const problemStatements = filledData.problem_statements as any[] || [];
    if (problemStatements.length > 0) {
      children.push(
        new Paragraph({
          text: "Problem Statements",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
      problemStatements.forEach((ps: any, i: number) => {
        children.push(
          new Paragraph({
            text: `${i + 1}. ${ps.statement || ps}`,
            spacing: { after: 100 },
            bullet: { level: 0 },
          })
        );
      });
    }

    const objectives = filledData.objectives as any[] || [];
    if (objectives.length > 0) {
      children.push(
        new Paragraph({
          text: "Objectives",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
      objectives.forEach((obj: any, i: number) => {
        children.push(
          new Paragraph({
            text: `${obj.objective || obj}`,
            spacing: { after: 100 },
            bullet: { level: 0 },
          })
        );
      });
    }

    children.push(new Paragraph({ children: [new PageBreak()] }));

    children.push(
      new Paragraph({
        text: "3. Features & Requirements",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    const featureList = filledData.feature_list as any[] || [];
    if (featureList.length > 0) {
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "App", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Category", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Feature", bold: true })] })] }),
              ],
            }),
            ...featureList.map((f: any) =>
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: f.category || "User" })] }),
                  new TableCell({ children: [new Paragraph({ text: f.subcategory || "General" })] }),
                  new TableCell({ children: [new Paragraph({ text: f.name || "-" })] }),
                ],
              })
            ),
          ],
        })
      );

      const categoryByApp: Record<string, number> = {};
      featureList.forEach((f: any) => {
        const cat = f.category || "User";
        categoryByApp[cat] = (categoryByApp[cat] || 0) + 1;
      });

      const categoryBreakdown: Record<string, number> = {};
      featureList.forEach((f: any) => {
        const catName = f.subcategory || "General";
        categoryBreakdown[catName] = (categoryBreakdown[catName] || 0) + 1;
      });

      children.push(
        new Paragraph({
          text: "Features Analysis by App",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 100 },
        })
      );

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                createStyledTableCell("App/Category", true, 50),
                createStyledTableCell("Count", true, 25),
                createStyledTableCell("Percentage", true, 25),
              ],
            }),
            ...Object.entries(categoryByApp).map(([category, count]) =>
              new TableRow({
                children: [
                  createStyledTableCell(category, false, 50),
                  createStyledTableCell(String(count), false, 25),
                  createStyledTableCell(`${Math.round((count / featureList.length) * 100)}%`, false, 25),
                ],
              })
            ),
          ],
        })
      );

      children.push(
        new Paragraph({
          text: "Features Analysis by Subcategory",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 100 },
        })
      );

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                createStyledTableCell("Subcategory", true, 50),
                createStyledTableCell("Count", true, 25),
                createStyledTableCell("Percentage", true, 25),
              ],
            }),
            ...Object.entries(categoryBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([category, count]) =>
                new TableRow({
                  children: [
                    createStyledTableCell(category, false, 50),
                    createStyledTableCell(String(count), false, 25),
                    createStyledTableCell(`${Math.round((count / featureList.length) * 100)}%`, false, 25),
                  ],
                })
              ),
          ],
        })
      );
    }

    children.push(new Paragraph({ children: [new PageBreak()] }));

    children.push(
      new Paragraph({
        text: "4. Delivery Plan (Phases & Timelines)",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    const deliveryPhases = filledData.delivery_phases as any[] || [];
    if (deliveryPhases.length > 0) {
      deliveryPhases.forEach((phase: any, i: number) => {
        children.push(
          new Paragraph({
            text: `Phase ${i + 1} (Weeks ${phase.weeks_start || 0}–${phase.weeks_end || 12}): ${phase.title || ""}`,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          })
        );

        const platforms = phase.platforms || [];
        platforms.forEach((platform: any) => {
          if (platform.name && platform.features) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `${platform.name}: `, bold: true }),
                  new TextRun({ text: platform.features }),
                ],
                spacing: { after: 100 },
                bullet: { level: 0 },
              })
            );
          }
        });
      });

      const phaseDurations = deliveryPhases.map((p: any) => Math.max((p.weeks_end || 0) - (p.weeks_start || 0), 0));
      const totalDuration = Math.max(phaseDurations.reduce((sum: number, d: number) => sum + d, 0), 1);

      children.push(
        new Paragraph({
          text: "Phase Duration Analysis",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 100 },
        })
      );

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                createStyledTableCell("Phase", true, 40),
                createStyledTableCell("Duration (Weeks)", true, 30),
                createStyledTableCell("Percentage", true, 30),
              ],
            }),
            ...deliveryPhases.map((phase: any, i: number) => {
              const duration = phaseDurations[i];
              return new TableRow({
                children: [
                  createStyledTableCell(`Phase ${i + 1}: ${phase.title || ""}`, false, 40),
                  createStyledTableCell(String(duration), false, 30),
                  createStyledTableCell(`${Math.round((duration / totalDuration) * 100)}%`, false, 30),
                ],
              });
            }),
            new TableRow({
              children: [
                createStyledTableCell("Total", true, 40),
                createStyledTableCell(String(totalDuration), true, 30),
                createStyledTableCell("100%", true, 30),
              ],
            }),
          ],
        })
      );
    }

    children.push(new Paragraph({ children: [new PageBreak()] }));

    children.push(
      new Paragraph({
        text: "5. Resource Engagement",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    const resources = filledData.resource_plan as any[] || [];
    if (resources.length > 0) {
      const totalCount = resources.reduce((sum: number, r: any) => sum + (r.count || 0), 0);
      const justification = filledData.resource_justification as string || `${resources.length} resources, with some engaged on an as-needed basis, can deliver the work effectively.`;

      children.push(
        new Paragraph({
          children: [new TextRun({ text: justification, italics: true })],
          spacing: { after: 200 },
        })
      );

      children.push(
        new Paragraph({
          text: "Role & Count",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                createStyledTableCell("Role", true, 50),
                createStyledTableCell("Count", true, 25),
                createStyledTableCell("% of Team", true, 25),
              ],
            }),
            ...resources.map((r: any) => {
              const countPercent = totalCount > 0 ? Math.round(((r.count || 0) / totalCount) * 100) : 0;
              return new TableRow({
                children: [
                  createStyledTableCell(r.role || "-", false, 50),
                  createStyledTableCell(String(r.count || 0), false, 25),
                  createStyledTableCell(`${countPercent}%`, false, 25),
                ],
              });
            }),
          ],
        })
      );

      children.push(
        new Paragraph({
          text: "Engagement Allocation",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 100 },
        })
      );

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                createStyledTableCell("Role", true, 60),
                createStyledTableCell("Allocation %", true, 40),
              ],
            }),
            ...resources.map((r: any) =>
              new TableRow({
                children: [
                  createStyledTableCell(r.role || "-", false, 60),
                  createStyledTableCell(`${r.allocation || 100}%`, false, 40),
                ],
              })
            ),
          ],
        })
      );
    }

    children.push(new Paragraph({ children: [new PageBreak()] }));

    children.push(
      new Paragraph({
        text: "6. Pricing",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    const phasePricing = filledData.phase_pricing_table as any[] || [];
    const totalCost = phasePricing.reduce((sum: number, p: any) => sum + (Number(p.cost) || 0), 0);
    const taxPercent = Number(filledData.tax_percent) || 18;
    const totalWithTax = totalCost * (1 + taxPercent / 100);

    if (phasePricing.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Given the scope, team composition, and phased delivery, the complete ${phasePricing.length}-phase engagement is priced at ` }),
            new TextRun({ text: `${formatCurrency(totalCost)} + ${taxPercent}% GST`, bold: true }),
            new TextRun({ text: `, totaling ` }),
            new TextRun({ text: formatCurrency(totalWithTax), bold: true }),
            new TextRun({ text: `.` }),
          ],
          spacing: { after: 300 },
        })
      );

      children.push(
        new Paragraph({
          text: "Pricing Summary by Phase",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                createStyledTableCell("Phase", true, 50),
                createStyledTableCell("Cost", true, 25),
                createStyledTableCell("Percentage", true, 25),
              ],
            }),
            ...phasePricing.map((p: any) => {
              const percentage = totalCost > 0 ? Math.round((Number(p.cost) / totalCost) * 100) : 0;
              return new TableRow({
                children: [
                  createStyledTableCell(p.phase || "-", false, 50),
                  createStyledTableCell(formatCurrency(Number(p.cost) || 0), false, 25),
                  createStyledTableCell(`${percentage}%`, false, 25),
                ],
              });
            }),
            new TableRow({
              children: [
                createStyledTableCell("Subtotal", true, 50),
                createStyledTableCell(formatCurrency(totalCost), true, 25),
                createStyledTableCell("100%", true, 25),
              ],
            }),
            new TableRow({
              children: [
                createStyledTableCell(`GST (${taxPercent}%)`, false, 50),
                createStyledTableCell(formatCurrency(totalCost * (taxPercent / 100)), false, 25),
                createStyledTableCell("-", false, 25),
              ],
            }),
            new TableRow({
              children: [
                createStyledTableCell("Grand Total", true, 50),
                createStyledTableCell(formatCurrency(totalWithTax), true, 25),
                createStyledTableCell("-", true, 25),
              ],
            }),
          ],
        })
      );

      phasePricing.forEach((phase: any, phaseIdx: number) => {
        if (phase.breakdown && phase.breakdown.length > 0) {
          children.push(
            new Paragraph({
              text: `${phase.phase || `Phase ${phaseIdx + 1}`} - Breakdown`,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 100 },
            })
          );

          children.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    createStyledTableCell("Item", true, 50),
                    createStyledTableCell("Cost", true, 25),
                    createStyledTableCell("Percentage", true, 25),
                  ],
                }),
                ...phase.breakdown.map((b: any) => {
                  const percentage = Number(phase.cost) > 0 ? Math.round((Number(b.cost) / Number(phase.cost)) * 100) : 0;
                  return new TableRow({
                    children: [
                      createStyledTableCell(b.item || "-", false, 50),
                      createStyledTableCell(formatCurrency(Number(b.cost) || 0), false, 25),
                      createStyledTableCell(`${percentage}%`, false, 25),
                    ],
                  });
                }),
              ],
            })
          );
        }
      });
    }

    children.push(new Paragraph({ children: [new PageBreak()] }));

    // 7. Tasks Involved
    children.push(
      new Paragraph({
        text: "7. Tasks Involved",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    const tasks = filledData.tasks_detailed as any[] || [];
    if (tasks.length > 0) {
      const groupedTasks: Record<string, string[]> = {};
      tasks.forEach((t: any) => {
        if (!groupedTasks[t.type]) groupedTasks[t.type] = [];
        groupedTasks[t.type].push(t.description);
      });

      Object.entries(groupedTasks).forEach(([category, items]) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${category}: `, bold: true }),
              new TextRun({ text: items.join(", ") + "." }),
            ],
            spacing: { after: 100 },
            bullet: { level: 0 },
          })
        );
      });
    }

    children.push(new Paragraph({ children: [new PageBreak()] }));

    // 8. Deliverables
    children.push(
      new Paragraph({
        text: "8. Deliverables",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    const deliverables = filledData.deliverables_detailed as any[] || [];
    if (deliverables.length > 0) {
      const groupedDeliverables: Record<string, string[]> = {};
      deliverables.forEach((d: any) => {
        if (!groupedDeliverables[d.type]) groupedDeliverables[d.type] = [];
        groupedDeliverables[d.type].push(d.description);
      });

      Object.entries(groupedDeliverables).forEach(([category, items]) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${category}: `, bold: true }),
              new TextRun({ text: items.join(", ") + "." }),
            ],
            spacing: { after: 100 },
            bullet: { level: 0 },
          })
        );
      });
    }

    children.push(new Paragraph({ children: [new PageBreak()] }));

    // 9. Assumptions & Dependencies
    children.push(
      new Paragraph({
        text: "9. Assumptions & Dependencies",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    const assumptions = filledData.assumptions_detailed as any[] || [];
    if (assumptions.length > 0) {
      children.push(
        new Paragraph({
          text: "Assumptions",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );

      const groupedAssumptions: Record<string, string[]> = {};
      assumptions.forEach((a: any) => {
        if (!groupedAssumptions[a.type]) groupedAssumptions[a.type] = [];
        groupedAssumptions[a.type].push(a.description);
      });

      Object.entries(groupedAssumptions).forEach(([category, items], i) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `A${i + 1}: ${category}: `, bold: true }),
              new TextRun({ text: items.join(", ") + "." }),
            ],
            spacing: { after: 100 },
            bullet: { level: 0 },
          })
        );
      });
    }

    const dependencies = filledData.dependencies_detailed as any[] || [];
    if (dependencies.length > 0) {
      children.push(
        new Paragraph({
          text: "Dependencies",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );

      const groupedDependencies: Record<string, string[]> = {};
      dependencies.forEach((d: any) => {
        if (!groupedDependencies[d.type]) groupedDependencies[d.type] = [];
        groupedDependencies[d.type].push(d.description);
      });

      Object.entries(groupedDependencies).forEach(([category, items], i) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `D${i + 1}: ${category}: `, bold: true }),
              new TextRun({ text: items.join(", ") + "." }),
            ],
            spacing: { after: 100 },
            bullet: { level: 0 },
          })
        );
      });
    }

    children.push(new Paragraph({ children: [new PageBreak()] }));

    // 10. Change Management
    children.push(
      new Paragraph({
        text: "10. Change Management",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    const processItems = filledData.change_process_items as any[] || [];
    const classificationItems = filledData.change_classification_items as any[] || [];
    const constraintItems = filledData.change_constraint_items as any[] || [];

    if (processItems.length > 0) {
      children.push(
        new Paragraph({
          text: "Process",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
      processItems.forEach((item: any) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${item.key}: `, bold: true }),
              new TextRun({ text: item.value + "." }),
            ],
            spacing: { after: 100 },
            bullet: { level: 0 },
          })
        );
      });
    }

    if (classificationItems.length > 0) {
      children.push(
        new Paragraph({
          text: "Classification",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
      classificationItems.forEach((item: any) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${item.key}: `, bold: true }),
              new TextRun({ text: item.value + "." }),
            ],
            spacing: { after: 100 },
            bullet: { level: 0 },
          })
        );
      });
    }

    if (constraintItems.length > 0) {
      children.push(
        new Paragraph({
          text: "Constraints",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
      constraintItems.forEach((item: any) => {
        children.push(
          new Paragraph({
            text: (typeof item === 'string' ? item : item.value || item.constraint || '') + ".",
            spacing: { after: 100 },
            bullet: { level: 0 },
          })
        );
      });
    }

    children.push(new Paragraph({ children: [new PageBreak()] }));

    // 11. Governance
    children.push(
      new Paragraph({
        text: "11. Governance",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    const cadenceItems = filledData.governance_cadence_items as any[] || [];
    const reportingItems = filledData.governance_reporting_items as any[] || [];
    const decisionItems = filledData.governance_decision_items as any[] || [];

    if (cadenceItems.length > 0) {
      children.push(
        new Paragraph({
          text: "Cadence",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
      cadenceItems.forEach((item: any) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${item.key}: `, bold: true }),
              new TextRun({ text: item.value + "." }),
            ],
            spacing: { after: 100 },
            bullet: { level: 0 },
          })
        );
      });
    }

    if (reportingItems.length > 0) {
      children.push(
        new Paragraph({
          text: "Reporting",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
      reportingItems.forEach((item: any) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${item.key}: `, bold: true }),
              new TextRun({ text: item.value + "." }),
            ],
            spacing: { after: 100 },
            bullet: { level: 0 },
          })
        );
      });
    }

    if (decisionItems.length > 0) {
      children.push(
        new Paragraph({
          text: "Decision Rights",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
      decisionItems.forEach((item: any) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${item.key}: `, bold: true }),
              new TextRun({ text: item.value + "." }),
            ],
            spacing: { after: 100 },
            bullet: { level: 0 },
          })
        );
      });
    }

    children.push(new Paragraph({ children: [new PageBreak()] }));

    // 12. Sign-off Requirements
    children.push(
      new Paragraph({
        text: "12. Sign-off Requirements",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    const signoffRequirements = filledData.signoff_requirements as any[] || [];
    if (signoffRequirements.length > 0) {
      signoffRequirements.forEach((req: any) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${req.stage}: `, bold: true }),
              new TextRun({ text: req.description + "." }),
            ],
            spacing: { after: 100 },
            bullet: { level: 0 },
          })
        );
      });
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children,
      }],
    });

    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${proposal.title || "Proposal"}.docx"`,
      },
    });
  } catch (error) {
    console.error("Error generating Word document:", error);
    return NextResponse.json({ error: "Failed to generate Word document" }, { status: 500 });
  }
}
