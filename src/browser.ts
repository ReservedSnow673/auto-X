import chromium from "@sparticuz/chromium";
import { chromium as playwright, type Browser, type BrowserContext, type Page } from "playwright-core";
import type { AppConfig } from "./config";

export type BrowserSession = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
};

function isServerless(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

export async function launchSession(config: AppConfig): Promise<BrowserSession> {
  const browser = isServerless()
    ? await playwright.launch({
        args: [...chromium.args, "--disable-blink-features=AutomationControlled"],
        executablePath: await chromium.executablePath(),
        headless: true,
      })
    : await playwright.launch({
        // Local: Playwright's bundled Chromium (run `npx playwright install chromium`)
        headless: true,
        args: ["--disable-blink-features=AutomationControlled"],
      });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
    locale: "en-US",
  });

  await context.addCookies([
    {
      name: "auth_token",
      value: config.X_AUTH_TOKEN,
      domain: ".x.com",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "None",
    },
    {
      name: "ct0",
      value: config.X_CT0,
      domain: ".x.com",
      path: "/",
      httpOnly: false,
      secure: true,
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();
  return { browser, context, page };
}

export async function closeSession(session: BrowserSession): Promise<void> {
  await session.context.close().catch(() => undefined);
  await session.browser.close().catch(() => undefined);
}

export async function openHomeFeed(page: Page): Promise<void> {
  await page.goto("https://x.com/home", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  // Cookie auth failed if we land on login/flow
  const url = page.url();
  if (/\/(login|i\/flow)/i.test(url)) {
    throw new Error(
      `X session invalid — redirected to ${url}. Refresh X_AUTH_TOKEN and X_CT0.`,
    );
  }

  await page.waitForSelector('article[data-testid="tweet"]', { timeout: 45_000 });
}

export function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const span = Math.max(0, maxMs - minMs);
  const ms = minMs + Math.floor(Math.random() * (span + 1));
  return new Promise((resolve) => setTimeout(resolve, ms));
}
