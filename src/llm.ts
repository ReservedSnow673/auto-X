import OpenAI from "openai";
import { z } from "zod";
import type { AppConfig } from "./config";
import { sanitizeReply } from "./safety";

const decisionSchema = z.object({
  shouldEngage: z.boolean(),
  shouldLike: z.boolean(),
  shouldReply: z.boolean(),
  reply: z.string().nullable(),
  reason: z.string(),
});

export type EngageDecision = z.infer<typeof decisionSchema>;

const SYSTEM_PROMPT = `You help a real person casually engage on X (Twitter).

Rules for replies:
- Crisp, short, human (max ~140 characters, ideally under 100)
- Sound like a quick genuine reaction, not a brand, bot, or hype man
- Non-controversial: no politics, religion, identity fights, insults, NSFW, medical/legal advice
- No hashtags, no emojis spam (0–1 emoji max only if it fits naturally)
- No questions that demand work from the author
- No links, no self-promo, no "great post!", no generic compliments
- Prefer concrete reactions tied to something specific in the post
- If the post is promotional, rage-bait, ambiguous, or you are unsure: set shouldEngage=false

Output JSON only matching the schema.`;

export async function decideEngagement(
  config: AppConfig,
  post: { text: string; authorHandle: string },
): Promise<EngageDecision> {
  const client = new OpenAI({ apiKey: config.OPENAI_API_KEY });

  const response = await client.responses.create({
    model: config.OPENAI_MODEL,
    instructions: SYSTEM_PROMPT,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Author: @${post.authorHandle}\nPost:\n${post.text}`,
          },
        ],
      },
    ],
    reasoning: { effort: "minimal" },
    text: {
      verbosity: "low",
      format: {
        type: "json_schema",
        name: "engage_decision",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            shouldEngage: { type: "boolean" },
            shouldLike: { type: "boolean" },
            shouldReply: { type: "boolean" },
            reply: { type: ["string", "null"] },
            reason: { type: "string" },
          },
          required: [
            "shouldEngage",
            "shouldLike",
            "shouldReply",
            "reply",
            "reason",
          ],
        },
      },
    },
    max_output_tokens: 250,
  });

  const raw = response.output_text;
  if (!raw) {
    return {
      shouldEngage: false,
      shouldLike: false,
      shouldReply: false,
      reply: null,
      reason: "empty_model_output",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      shouldEngage: false,
      shouldLike: false,
      shouldReply: false,
      reply: null,
      reason: "invalid_json",
    };
  }

  const decision = decisionSchema.parse(parsed);

  if (decision.reply) {
    decision.reply = sanitizeReply(decision.reply);
    if (!decision.reply) {
      decision.shouldReply = false;
      decision.reply = null;
    }
  }

  if (!decision.shouldEngage) {
    decision.shouldLike = false;
    decision.shouldReply = false;
    decision.reply = null;
  }

  if (decision.shouldReply && !decision.reply) {
    decision.shouldReply = false;
  }

  // Likes are the cheap default when engaging; replies are optional.
  if (decision.shouldEngage && !decision.shouldLike && !decision.shouldReply) {
    decision.shouldLike = true;
  }

  return decision;
}
