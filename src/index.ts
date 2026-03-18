#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { type Request, type Response } from "express";
import { createServer } from "./server.js";

async function runHttp(): Promise<void> {
  const app = express();
  app.use(express.json());

  async function handleMcp(req: Request, res: Response) {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey || typeof apiKey !== "string") {
      res.status(401).json({
        error:
          "x-api-key header required. Get a free API key at https://www.docapi.co/signup",
      });
      return;
    }

    const server = createServer(apiKey);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }

  app.post("/mcp", handleMcp);
  app.post("/", handleMcp);

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", server: "docapi-mcp-server", version: "1.0.0" });
  });

  app.get("/.well-known/mcp/server-card.json", (_req: Request, res: Response) => {
    res.json({
      serverInfo: { name: "docapi-mcp", version: "1.0.0" },
      authentication: { required: true, schemes: ["apikey"] },
      tools: [
        { name: "generate_pdf", description: "Generate a PDF from HTML content or a URL" },
        { name: "capture_screenshot", description: "Capture a screenshot of a URL or HTML content" },
        { name: "generate_invoice", description: "Generate a PDF invoice from structured data" },
        { name: "get_account", description: "Get DocAPI account info and usage" },
      ],
    });
  });

  const port = parseInt(process.env.PORT ?? "3000", 10);
  app.listen(port, () => {
    console.error(`DocAPI MCP server running on http://0.0.0.0:${port}/mcp`);
  });
}

async function runStdio(): Promise<void> {
  const apiKey = process.env.DOCAPI_KEY;
  if (!apiKey) {
    console.error(
      "ERROR: DOCAPI_KEY environment variable is required.\n" +
        "Get a free API key at https://www.docapi.co/signup"
    );
    process.exit(1);
  }
  const server = createServer(apiKey);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("DocAPI MCP server running via stdio");
}

// HTTP is the default for Railway; set TRANSPORT=stdio for local development
const transport = process.env.TRANSPORT ?? "http";
if (transport === "stdio") {
  runStdio().catch((error: unknown) => {
    console.error("Server error:", error);
    process.exit(1);
  });
} else {
  runHttp().catch((error: unknown) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}
