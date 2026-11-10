// SERV Reasoning client (docs.openserv.ai/serv-reasoning). OpenAI-compatible.
import OpenAI from "openai";
import { config } from "./config.js";

let client;
function getClient() {
  if (!config.serv.apiKey) throw new Error("SERV_API_KEY is missing. Add it to .env");
  client ??= new OpenAI({ baseURL: "https://inference-api.openserv.ai/v1", apiKey: config.serv.apiKey });
  return client;
}

// Readiness signal for the SERV pre-check: can SERV run a call right now?
// Presence check only. The key and the base URL are the configuration a
// call needs, and the base URL is fixed in this module, so a present key
// means configured. A present-but-wrong key is still only discovered when
// SERV answers; that failure happens after payment, exactly as before.
export function isServConfigured() {
  return Boolean(config.serv.apiKey);
}

// SERV Tools: declared as tools, handled server-side by SERV, never called by the model.
const SERV_TOOLS = [
  { type: "function", function: { name: "serv_prompt_guard" } },
  {
    type: "function",
    function: {
      name: "serv_shadow_agent",
      description: "Enable SERV shadow-agent validation.",
      parameters: {
        type: "object",
        properties: {
          hint: {
            type: "string",
            default:
              "Output must be one JSON object matching the schema. Every reason must include a quote copied word for word from the EVIDENCE block. If the evidence is not enough, verdict must be 'unclear'.",
          },
          max_iterations: { type: "integer", default: 3 },
        },
      },
    },
  },
];

export async function askServ({ system, user, hard = false }) {
  const res = await getClient().chat.completions.create({
    model: hard ? config.serv.hardModel : config.serv.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    tools: SERV_TOOLS,
    response_format: { type: "json_object" },
    max_completion_tokens: 1500,
  });
  const text = res.choices?.[0]?.message?.content ?? "";
  if (config.debug) console.log(`[DEBUG] Raw SERV response (${hard ? config.serv.hardModel : config.serv.model}):\n${text}`);
  return { text, model: res.model, usage: res.usage };
}
