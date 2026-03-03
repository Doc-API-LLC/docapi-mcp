import { z } from "zod";
import { postBinary, handleApiError } from "../client.js";
import { SCREENSHOT_API_URL } from "../constants.js";

const CaptureScreenshotSchema = z
  .object({
    url: z
      .string()
      .url()
      .optional()
      .describe(
        "Live URL to screenshot (e.g. https://example.com). Provide url OR html, not both."
      ),
    html: z
      .string()
      .optional()
      .describe(
        "HTML to render and screenshot. Provide url OR html, not both."
      ),
    width: z
      .number()
      .int()
      .min(100)
      .max(3840)
      .default(1200)
      .describe("Viewport width in pixels (default: 1200)"),
    height: z
      .number()
      .int()
      .min(100)
      .max(2160)
      .default(630)
      .describe("Viewport height in pixels (default: 630)"),
    format: z
      .enum(["png", "jpeg"])
      .default("png")
      .describe("Image format (default: png)"),
  })
  .strict();

type CaptureScreenshotInput = z.infer<typeof CaptureScreenshotSchema>;

export const captureScreenshotConfig = {
  title: "Capture Screenshot",
  description: `Screenshot a URL or render HTML and capture it as an image. Returns the image inline so you can view it immediately.

Common uses: Open Graph images (1200×630), social cards, page thumbnails, template previews.

Args:
  - url (string, optional): A live URL to screenshot. Provide url OR html, not both.
  - html (string, optional): HTML to render. Full CSS support. Provide url OR html, not both.
  - width (number): Viewport width, 100–3840. Default: 1200.
  - height (number): Viewport height, 100–2160. Default: 630.
  - format ('png' | 'jpeg'): Image format. Default: 'png'.

Returns: Inline image you can view directly.

Examples:
  - OG image: { url: "https://mysite.com/blog/post", width: 1200, height: 630 }
  - Social card: { html: "<div style='background:#0f172a;color:white;padding:60px'><h1>My Post</h1></div>", width: 1200, height: 630 }`,
  inputSchema: CaptureScreenshotSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
};

export function captureScreenshotHandler(apiKey: string) {
  return async (params: CaptureScreenshotInput) => {
    try {
      if (!params.url && !params.html) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: "Error: Provide either 'url' or 'html', not neither." }],
        };
      }
      if (params.url && params.html) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: "Error: Provide either 'url' or 'html', not both." }],
        };
      }

      const body: Record<string, unknown> = {
        options: {
          width: params.width,
          height: params.height,
          format: params.format,
        },
      };
      if (params.url) body.url = params.url;
      if (params.html) body.html = params.html;

      const { data: imgBuffer, creditsRemaining } = await postBinary(
        SCREENSHOT_API_URL,
        body,
        apiKey
      );

      const mimeType = params.format === "jpeg" ? "image/jpeg" : "image/png";
      const creditsNote =
        creditsRemaining !== null ? `Credits remaining: ${creditsRemaining}.` : "";

      return {
        content: [
          {
            type: "image" as const,
            data: imgBuffer.toString("base64"),
            mimeType,
          },
          ...(creditsNote
            ? [{ type: "text" as const, text: creditsNote }]
            : []),
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: handleApiError(error) }],
      };
    }
  };
}
