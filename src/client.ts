import axios, { AxiosError } from "axios";

export async function postBinary(
  url: string,
  body: Record<string, unknown>,
  apiKey: string
): Promise<{ data: Buffer; creditsRemaining: number | null }> {
  const response = await axios.post(url, body, {
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    responseType: "arraybuffer",
    timeout: 60000,
  });

  const creditsRemaining =
    typeof response.headers["x-credits-remaining"] === "string"
      ? parseInt(response.headers["x-credits-remaining"], 10)
      : null;

  return { data: Buffer.from(response.data as ArrayBuffer), creditsRemaining };
}

export function handleApiError(error: unknown): string {
  if (error instanceof AxiosError && error.response) {
    const status = error.response.status;
    if (status === 401)
      return "Error: Invalid API key. Check the x-api-key you configured in your MCP client.";
    if (status === 402)
      return "Error: Credits exhausted. Top up your account with USDC at https://www.docapi.co/dashboard";
    if (status === 429)
      return "Error: Monthly usage limit exceeded. Upgrade at https://www.docapi.co/pricing";
    return `Error: DocAPI returned ${status}: ${error.message}`;
  }
  if (error instanceof Error) return `Error: ${error.message}`;
  return `Error: ${String(error)}`;
}
