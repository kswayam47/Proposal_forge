
import { NextResponse } from "next/server";
import puppeteer from "puppeteer";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employee_id") || "EMP001";
  const month = searchParams.get("month") || "";
  const projectKey = searchParams.get("project_key") || "";
  const displayName = searchParams.get("display_name") || "";

  if (!month) {
    return NextResponse.json({ error: "Month is required" }, { status: 400 });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // Pipe page console logs to terminal
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', (err: unknown) => console.error('PAGE ERROR:', (err as Error).message));

    // Set viewport to match A4 width (210mm ≈ 794px at 96dpi) so content fills the page
    await page.setViewport({ width: 794, height: 1123 });

    const reportUrl = new URL("/reports/report", req.url);
    reportUrl.searchParams.set("employee_id", employeeId);
    reportUrl.searchParams.set("month", month);
    reportUrl.searchParams.set("project_key", projectKey);
    reportUrl.searchParams.set("display_name", displayName);

    console.log("Navigating to report URL:", reportUrl.toString());

    // 1. Navigate and wait for network idle
    await page.goto(reportUrl.toString(), {
      waitUntil: "networkidle0",
      timeout: 120000,
    });

    // 2. Wait for the custom "data-ready" attribute signal from the page
    await page.waitForSelector('body[data-ready="true"]', { timeout: 120000 });

    // 3. Additional buffer for DOM stabilization
    await new Promise(r => setTimeout(r, 2000));

    // 4. Validate that charts are visible and HAVE DATA
    const chartValidation = await page.evaluate(() => {
      const canvases = document.querySelectorAll("canvas");
      const svgs = document.querySelectorAll("svg");
      const recharts = document.querySelectorAll(".recharts-surface");

      // Check if any recharts path/rect has been drawn
      const hasPaths = document.querySelectorAll(".recharts-line path, .recharts-bar-rectangle").length > 0;

      return {
        count: canvases.length + svgs.length,
        rechartsCount: recharts.length,
        hasPaths
      };
    });

    console.log("Chart Validation:", chartValidation);

    if (chartValidation.rechartsCount < 4 || !chartValidation.hasPaths) {
      throw new Error(`Visual validation failed: Expected 4+ charts with data, found ${chartValidation.rechartsCount} charts. Path data: ${chartValidation.hasPaths}`);
    }

    // 5. Generate PDF
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "0mm",
        right: "0mm",
        bottom: "0mm",
        left: "0mm",
      },
      displayHeaderFooter: false,
      preferCSSPageSize: true,
    });

    await browser.close();

    const fileName = `Assessment-${displayName.replace(/\s+/g, "-")}-${month}.pdf`;

    return new Response(pdf as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error("PDF Export Error:", error);
    if (browser) await browser.close();
    return NextResponse.json(
      { error: "Failed to generate PDF: " + error.message },
      { status: 500 }
    );
  }
}
