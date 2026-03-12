import { z } from "zod";
import { postBinary, handleApiError } from "../client.js";
import { INVOICE_API_URL } from "../constants.js";

const LineItemSchema = z.object({
  description: z.string().min(1).describe("Description of the product or service"),
  quantity: z.number().positive().describe("Quantity"),
  unit_price: z.number().nonnegative().describe("Price per unit"),
});

const GenerateInvoiceSchema = z
  .object({
    from_name: z.string().min(1).describe("Sender's name or business name"),
    from_email: z.string().email().optional().describe("Sender's email address"),
    from_address: z
      .string()
      .optional()
      .describe("Sender's address (use \\n for line breaks)"),
    from_phone: z.string().optional().describe("Sender's phone number"),
    to_name: z.string().min(1).describe("Recipient's name or business name"),
    to_email: z.string().email().optional().describe("Recipient's email address"),
    to_address: z
      .string()
      .optional()
      .describe("Recipient's address (use \\n for line breaks)"),
    line_items: z
      .array(LineItemSchema)
      .min(1)
      .describe("Line items: description, quantity, unit_price"),
    invoice_number: z.string().optional().describe("Invoice number (e.g. INV-001)"),
    date: z
      .string()
      .optional()
      .describe("Invoice date (e.g. 'January 1, 2026'). Defaults to today."),
    due_date: z.string().optional().describe("Payment due date"),
    currency_symbol: z
      .string()
      .default("$")
      .describe("Currency symbol (default: $)"),
    tax_percent: z
      .number()
      .min(0)
      .max(100)
      .optional()
      .describe("Tax percentage to apply to subtotal (e.g. 10 for 10%)"),
    notes: z
      .string()
      .optional()
      .describe("Additional notes shown at the bottom of the invoice"),
    logo_url: z
      .string()
      .url()
      .optional()
      .describe("URL of a logo image to display in the invoice header"),
  })
  .strict();

type GenerateInvoiceInput = z.infer<typeof GenerateInvoiceSchema>;

export const generateInvoiceConfig = {
  title: "Generate Invoice PDF",
  description: `Generate a professionally formatted invoice PDF from structured data. Returns a base64-encoded PDF.

Args:
  - from_name (string): Sender's name or business name
  - from_email (string, optional): Sender's email
  - from_address (string, optional): Sender's address (\\n for line breaks)
  - from_phone (string, optional): Sender's phone
  - to_name (string): Recipient's name or business name
  - to_email (string, optional): Recipient's email
  - to_address (string, optional): Recipient's address (\\n for line breaks)
  - line_items (array): Each item has description (string), quantity (number), unit_price (number)
  - invoice_number (string, optional): e.g. "INV-001"
  - date (string, optional): Invoice date. Defaults to today.
  - due_date (string, optional): Payment due date
  - currency_symbol (string): Defaults to "$"
  - tax_percent (number, optional): Tax rate as a percentage (0–100)
  - notes (string, optional): Footer notes
  - logo_url (string, optional): Logo image URL for the header

Returns: Base64-encoded PDF. Save it to disk with a file writing tool.

Errors:
  - 401: Invalid API key
  - 402: Credits exhausted (agent accounts) — send USDC to top up
  - 429: Monthly limit exceeded — upgrade at https://www.docapi.co/pricing`,
  inputSchema: GenerateInvoiceSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
};

export function generateInvoiceHandler(apiKey: string) {
  return async (params: GenerateInvoiceInput) => {
    try {
      const body: Record<string, unknown> = {
        from: {
          name: params.from_name,
          ...(params.from_email && { email: params.from_email }),
          ...(params.from_address && { address: params.from_address }),
          ...(params.from_phone && { phone: params.from_phone }),
        },
        to: {
          name: params.to_name,
          ...(params.to_email && { email: params.to_email }),
          ...(params.to_address && { address: params.to_address }),
        },
        line_items: params.line_items,
        currency_symbol: params.currency_symbol,
        ...(params.invoice_number && { invoice_number: params.invoice_number }),
        ...(params.date && { date: params.date }),
        ...(params.due_date && { due_date: params.due_date }),
        ...(params.tax_percent !== undefined && { tax_percent: params.tax_percent }),
        ...(params.notes && { notes: params.notes }),
        ...(params.logo_url && { logo_url: params.logo_url }),
      };

      const { data: pdfBuffer, creditsRemaining } = await postBinary(
        INVOICE_API_URL,
        body,
        apiKey
      );

      const creditsNote =
        creditsRemaining !== null ? ` Credits remaining: ${creditsRemaining}.` : "";

      return {
        content: [
          {
            type: "text" as const,
            text: `Invoice PDF generated (${pdfBuffer.length.toLocaleString()} bytes).${creditsNote}\n\nBase64:\n${pdfBuffer.toString("base64")}`,
          },
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
