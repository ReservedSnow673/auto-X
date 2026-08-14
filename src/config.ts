import { z } from "zod";

const boolFromEnv = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

const intFromEnv = (value: string | undefined, fallback: number): number => {
  if (value === undefined || value === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default("gpt-5-nano"),
  X_AUTH_TOKEN: z.string().min(1),
  X_CT0: z.string().min(1),
  CRON_SECRET: z.string().min(1),
  DRY_RUN: z.boolean().default(true),
  MAX_CANDIDATES: z.number().int().min(1).max(20).default(8),
  MAX_LIKES: z.number().int().min(0).max(10).default(3),
  MAX_REPLIES: z.number().int().min(0).max(5).default(2),
  MIN_DELAY_MS: z.number().int().min(500).default(2500),
  MAX_DELAY_MS: z.number().int().min(1000).default(6000),
  SCROLL_ROUNDS: z.number().int().min(1).max(10).default(3),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(overrides?: Partial<AppConfig>): AppConfig {
  const raw = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL ?? "gpt-5-nano",
    X_AUTH_TOKEN: process.env.X_AUTH_TOKEN,
    X_CT0: process.env.X_CT0,
    CRON_SECRET: process.env.CRON_SECRET,
    DRY_RUN: boolFromEnv(process.env.DRY_RUN, true),
    MAX_CANDIDATES: intFromEnv(process.env.MAX_CANDIDATES, 8),
    MAX_LIKES: intFromEnv(process.env.MAX_LIKES, 3),
    MAX_REPLIES: intFromEnv(process.env.MAX_REPLIES, 2),
    MIN_DELAY_MS: intFromEnv(process.env.MIN_DELAY_MS, 2500),
    MAX_DELAY_MS: intFromEnv(process.env.MAX_DELAY_MS, 6000),
    SCROLL_ROUNDS: intFromEnv(process.env.SCROLL_ROUNDS, 3),
    ...overrides,
  };

  return envSchema.parse(raw);
}

export function assertAuthorized(request: Request, secret: string): boolean {
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  return querySecret === secret;
}
