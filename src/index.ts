#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { generatePdfTool } from "./tools/pdf.js";
import { captureScreenshotTool } from "./tools/screenshot.js";
import { checkCreditsTool, registerAgentTool } from "./tools/account.js";

const server = new McpServer({
  name: "docapi-mcp-server",
  version: "1.0.0",
});

server.registerTool(
  generatePdfTool.name,
  generatePdfTool.config,
  generatePdfTool.handler
);
server.registerTool(
  captureScreenshotTool.name,
  captureScreenshotTool.config,
  captureScreenshotTool.handler
);
server.registerTool(
  checkCreditsTool.name,
  checkCreditsTool.config,
  checkCreditsTool.handler
);
server.registerTool(
  registerAgentTool.name,
  registerAgentTool.config,
  registerAgentTool.handler
);

async function runStdio(): Promise<void> {
  if (!process.env.DOCAPI_KEY) {
    console.error(
      "ERROR: DOCAPI_KEY environment variable is required.\n" +
        "Get a free API key at https://www.docapi.co/signup"
    );
    process.exit(1);
  }
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("DocAPI MCP server running via stdio");
}

async function runHttp(): Promise<void> {
  if (!process.env.DOCAPI_KEY) {
    console.error(
      "WARNING: DOCAPI_KEY is not set. PDF and screenshot tools will fail. " +
        "Set it in your Railway environment variables."
    );
  }

  const app = express();
  app.use(express.json());

  app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", server: "docapi-mcp-server", version: "1.0.0" });
  });

  const port = parseInt(process.env.PORT ?? "3000", 10);
  app.listen(port, () => {
    console.error(`DocAPI MCP server running on http://0.0.0.0:${port}/mcp`);
  });
}

const transport = process.env.TRANSPORT ?? "stdio";
if (transport === "http") {
  runHttp().catch((error: unknown) => {
    console.error("Server error:", error);
    process.exit(1);
  });
} else {
  runStdio().catch((error: unknown) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}
