import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { generatePdfConfig, generatePdfHandler } from "./tools/pdf.js";
import {
  captureScreenshotConfig,
  captureScreenshotHandler,
} from "./tools/screenshot.js";
import {
  checkCreditsConfig,
  checkCreditsHandler,
  registerAgentConfig,
  registerAgentHandler,
} from "./tools/account.js";
import {
  generateInvoiceConfig,
  generateInvoiceHandler,
} from "./tools/invoice.js";

export function createServer(apiKey: string): McpServer {
  const server = new McpServer({
    name: "docapi-mcp-server",
    version: "1.0.0",
  });

  server.registerTool(
    "docapi_generate_pdf",
    generatePdfConfig,
    generatePdfHandler(apiKey)
  );
  server.registerTool(
    "docapi_capture_screenshot",
    captureScreenshotConfig,
    captureScreenshotHandler(apiKey)
  );
  server.registerTool(
    "docapi_check_credits",
    checkCreditsConfig,
    checkCreditsHandler(apiKey)
  );
  server.registerTool(
    "docapi_register_agent",
    registerAgentConfig,
    registerAgentHandler(apiKey)
  );
  server.registerTool(
    "docapi_generate_invoice",
    generateInvoiceConfig,
    generateInvoiceHandler(apiKey)
  );

  server.prompt(
    "generate_pdf_from_html",
    "Generate a PDF from provided HTML content",
    { html: z.string().describe("The HTML content to convert to PDF") },
    async ({ html }) => ({
      messages: [
        {
          role: "user" as const,
          content: { type: "text" as const, text: `Please use the docapi_generate_pdf tool to convert this HTML to a PDF:\n\n${html}` },
        },
      ],
    })
  );

  return server;
}
