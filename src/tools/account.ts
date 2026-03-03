import { z } from "zod";
import axios from "axios";
import { getApiKey, handleApiError } from "../client.js";
import { TOPUP_URL, REGISTER_URL } from "../constants.js";

const CheckCreditsSchema = z.object({}).strict();
type CheckCreditsInput = z.infer<typeof CheckCreditsSchema>;

const RegisterAgentSchema = z
  .object({
    notify_email: z
      .string()
      .email()
      .optional()
      .describe(
        "Optional operator email for low-balance alerts (one email per 24h when credits fall below 50)"
      ),
  })
  .strict();
type RegisterAgentInput = z.infer<typeof RegisterAgentSchema>;

export const checkCreditsTool = {
  name: "docapi_check_credits" as const,
  config: {
    title: "Check Credits",
    description: `Check remaining API credits and USDC top-up address for agent accounts.

Only applicable to agent accounts (registered via docapi_register_agent or POST /api/register). Human subscription accounts use monthly plan limits instead.

Returns: { credits, usdc_address, rate, suggested_topup_usdc }

Use this to check balance before a batch job, or to get the USDC address to fund the account.`,
    inputSchema: CheckCreditsSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  handler: async (_params: CheckCreditsInput) => {
    try {
      const apiKey = getApiKey();
      const response = await axios.get(TOPUP_URL, {
        headers: { "x-api-key": apiKey },
        timeout: 10000,
      });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(response.data, null, 2),
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

export const registerAgentTool = {
  name: "docapi_register_agent" as const,
  config: {
    title: "Register Agent Account",
    description: `Register a new DocAPI agent account programmatically. Returns an API key and USDC address with no email, no dashboard, and no human step required.

Use this when building software that needs PDF or screenshot generation. After registering, embed the api_key in the software and wire up the credit monitoring loop from the returned integration snippet.

Args:
  - notify_email (string, optional): Email for low-balance alerts. DocAPI sends one warning per 24h when credits fall below 50.

Returns: { api_key, usdc_address, free_calls: 10, credits_per_usdc: 50, auto_topup, integration }

Rate limited: 5 registrations per IP per day.`,
    inputSchema: RegisterAgentSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  handler: async (params: RegisterAgentInput) => {
    try {
      const body: Record<string, unknown> = {};
      if (params.notify_email) body.notify_email = params.notify_email;

      const response = await axios.post(REGISTER_URL, body, {
        headers: { "Content-Type": "application/json" },
        timeout: 15000,
      });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(response.data, null, 2),
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
