import type { Page } from "playwright-core";

export type FeedPost = {
  id: string;
  authorHandle: string;
  text: string;
  href: string;
};

type RawTweet = {
  id: string | null;
  authorHandle: string | null;
  text: string | null;
  href: string | null;
};

export async function collectFeedPosts(
  page: Page,
  options: { scrollRounds: number; maxCandidates: number },
): Promise<FeedPost[]> {
  const seen = new Map<string, FeedPost>();

  for (let round = 0; round < options.scrollRounds; round += 1) {
    const batch = await page.$$eval('article[data-testid="tweet"]', (articles) => {
      return articles.map((article) => {
        const statusLink = article.querySelector(
          'a[href*="/status/"]',
        ) as HTMLAnchorElement | null;
        const href = statusLink?.href ?? null;
        const idMatch = href?.match(/\/status\/(\d+)/);
        const id = idMatch?.[1] ?? null;

        const userNameRoot = article.querySelector('[data-testid="User-Name"]');
        const userLink =
          (userNameRoot?.querySelector('a[href^="/"]') as HTMLAnchorElement | null) ??
          (article.querySelector('a[href^="/"][role="link"]') as HTMLAnchorElement | null);
        const handleFromHref = userLink?.getAttribute("href")?.replace(/^\//, "") ?? null;

        const textEl = article.querySelector('[data-testid="tweetText"]');
        const text = textEl?.textContent?.trim() ?? null;

        return {
          id,
          authorHandle: handleFromHref,
          text,
          href,
        };
      });
    });

    for (const raw of batch as RawTweet[]) {
      if (!raw.id || !raw.text || !raw.authorHandle || !raw.href) continue;
      if (seen.has(raw.id)) continue;
      seen.set(raw.id, {
        id: raw.id,
        authorHandle: raw.authorHandle.split("/")[0] ?? raw.authorHandle,
        text: raw.text,
        href: raw.href,
      });
    }

    if (seen.size >= options.maxCandidates) break;

    await page.mouse.wheel(0, 1800 + Math.floor(Math.random() * 800));
    await new Promise((r) => setTimeout(r, 1200 + Math.floor(Math.random() * 800)));
  }

  return Array.from(seen.values()).slice(0, options.maxCandidates);
}
