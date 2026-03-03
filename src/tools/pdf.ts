import { z } from "zod";
import fs from "fs";
import path from "path";
import { getApiKey, postBinary, handleApiError } from "../client.js";
import { PDF_API_URL } from "../constants.js";

const GeneratePdfSchema = z
  .object({
    html: z.string().min(1).describe("HTML content to convert to PDF"),
    output_path: z
      .string()
      .optional()
      .describe(
        "Absolute file path to save the PDF (e.g. /Users/you/invoice.pdf). If omitted, returns base64-encoded PDF."
      ),
    format: z
      .enum(["A4", "Letter", "Legal", "Tabloid"])
      .default("A4")
      .describe("Paper format (default: A4)"),
    landscape: z
      .boolean()
      .default(false)
      .describe("Landscape orientation (default: portrait)"),
    margin_inches: z
      .number()
      .min(0)
      .max(4)
      .default(0.5)
      .describe("Page margin in inches 0–4 (default: 0.5)"),
    print_background: z
      .boolean()
      .default(true)
      .describe("Include background colors and images (default: true)"),
  })
  .strict();

type GeneratePdfInput = z.infer<typeof GeneratePdfSchema>;

export const generatePdfTool = {
  name: "docapi_generate_pdf" as const,
  config: {
    title: "Generate PDF",
    description: `Convert HTML to a PDF using DocAPI's headless Chromium renderer. Full CSS support: Flexbox, Grid, custom fonts, gradients, shadows.

Args:
  - html (string): HTML to render. Inline styles and <style> tags work. Google Fonts URLs supported.
  - output_path (string, optional): Absolute path to save the PDF (e.g. "/Users/you/report.pdf"). If omitted, returns base64 PDF data.
  - format ('A4' | 'Letter' | 'Legal' | 'Tabloid'): Paper size. Default: 'A4'.
  - landscape (boolean): Landscape orientation. Default: false.
  - margin_inches (number): Page margin in inches, 0–4. Default: 0.5.
  - print_background (boolean): Render background colors/images. Default: true.

Returns:
  - With output_path: "PDF saved to /path/file.pdf (N bytes). Credits remaining: N"
  - Without output_path: base64-encoded PDF content

Errors:
  - 401: Invalid API key — check DOCAPI_KEY
  - 402: Credits exhausted (agent accounts) — send USDC to top up
  - 429: Monthly limit exceeded — upgrade plan`,
    inputSchema: GeneratePdfSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  handler: async (params: GeneratePdfInput) => {
    try {
      const apiKey = getApiKey();
      const m = params.margin_inches;

      const body: Record<string, unknown> = {
        html: params.html,
        options: {
          format: params.format,
          landscape: params.landscape,
          printBackground: params.print_background,
          margin: {
            top: `${m}in`,
            right: `${m}in`,
            bottom: `${m}in`,
            left: `${m}in`,
          },
        },
      };

      const { data: pdfBuffer, creditsRemaining } = await postBinary(
        PDF_API_URL,
        body,
        apiKey
      );

      const creditsNote =
        creditsRemaining !== null ? ` Credits remaining: ${creditsRemaining}.` : "";

      if (params.output_path) {
        const absPath = path.resolve(params.output_path);
        fs.mkdirSync(path.dirname(absPath), { recursive: true });
        fs.writeFileSync(absPath, pdfBuffer);
        return {
          content: [
            {
              type: "text" as const,
              text: `PDF saved to ${absPath} (${pdfBuffer.length.toLocaleString()} bytes).${creditsNote}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `PDF generated (${pdfBuffer.length.toLocaleString()} bytes).${creditsNote}\n\nBase64:\n${pdfBuffer.toString("base64")}`,
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: handleApiError(error) }],
      };
    }
  },
};
