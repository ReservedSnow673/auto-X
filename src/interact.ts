import type { Page } from "playwright-core";
import type { FeedPost } from "./feed";

async function findTweetArticle(page: Page, post: FeedPost) {
  const articles = page.locator('article[data-testid="tweet"]');
  const count = await articles.count();
  for (let i = 0; i < count; i += 1) {
    const article = articles.nth(i);
    const link = article.locator(`a[href*="/status/${post.id}"]`).first();
    if ((await link.count()) > 0) {
      return article;
    }
  }
  return null;
}

export async function likePost(
  page: Page,
  post: FeedPost,
  dryRun: boolean,
): Promise<{ ok: boolean; detail: string }> {
  const article = await findTweetArticle(page, post);
  if (!article) {
    return { ok: false, detail: "tweet_not_in_dom" };
  }

  const unlike = article.locator('[data-testid="unlike"]');
  if ((await unlike.count()) > 0) {
    return { ok: true, detail: "already_liked" };
  }

  const like = article.locator('[data-testid="like"]').first();
  if ((await like.count()) === 0) {
    return { ok: false, detail: "like_button_missing" };
  }

  if (dryRun) {
    return { ok: true, detail: "dry_run_like" };
  }

  await like.click({ timeout: 10_000 });
  await new Promise((r) => setTimeout(r, 800));
  return { ok: true, detail: "liked" };
}

export async function replyToPost(
  page: Page,
  post: FeedPost,
  replyText: string,
  dryRun: boolean,
): Promise<{ ok: boolean; detail: string }> {
  const article = await findTweetArticle(page, post);
  if (!article) {
    // Navigate directly if scrolled away
    await page.goto(post.href, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForSelector('article[data-testid="tweet"]', { timeout: 30_000 });
  }

  const target = (await findTweetArticle(page, post)) ?? page.locator('article[data-testid="tweet"]').first();

  const replyButton = target.locator('[data-testid="reply"]').first();
  if ((await replyButton.count()) === 0) {
    return { ok: false, detail: "reply_button_missing" };
  }

  if (dryRun) {
    return { ok: true, detail: `dry_run_reply:${replyText}` };
  }

  await replyButton.click({ timeout: 10_000 });

  const composer = page.locator('[data-testid="tweetTextarea_0"]').first();
  await composer.waitFor({ state: "visible", timeout: 15_000 });
  await composer.click();
  await composer.fill(replyText);

  // Prefer inline reply button in the modal/composer
  const send = page.locator('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]').last();
  await send.waitFor({ state: "visible", timeout: 10_000 });

  const disabled = await send.getAttribute("aria-disabled");
  if (disabled === "true") {
    // Give React state a beat to catch up after fill()
    await new Promise((r) => setTimeout(r, 500));
  }

  await send.click({ timeout: 10_000 });
  await new Promise((r) => setTimeout(r, 1500));

  return { ok: true, detail: "replied" };
}
