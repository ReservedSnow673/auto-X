import { closeSession, launchSession, openHomeFeed, randomDelay } from "./browser";
import type { AppConfig } from "./config";
import { collectFeedPosts, type FeedPost } from "./feed";
import { likePost, replyToPost } from "./interact";
import { decideEngagement } from "./llm";
import { assessPostSafety } from "./safety";

export type ActionLog = {
  postId: string;
  authorHandle: string;
  textPreview: string;
  action: "skip" | "like" | "reply" | "like+reply";
  detail: string;
};

export type RunResult = {
  dryRun: boolean;
  scanned: number;
  liked: number;
  replied: number;
  skipped: number;
  actions: ActionLog[];
  error?: string;
};

function preview(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 120);
}

export async function runEngagement(config: AppConfig): Promise<RunResult> {
  const actions: ActionLog[] = [];
  let liked = 0;
  let replied = 0;
  let skipped = 0;
  let scanned = 0;

  const session = await launchSession(config);

  try {
    await openHomeFeed(session.page);
    await randomDelay(config.MIN_DELAY_MS, config.MAX_DELAY_MS);

    const posts = await collectFeedPosts(session.page, {
      scrollRounds: config.SCROLL_ROUNDS,
      maxCandidates: config.MAX_CANDIDATES,
    });
    scanned = posts.length;

    for (const post of posts) {
      if (liked >= config.MAX_LIKES && replied >= config.MAX_REPLIES) {
        break;
      }

      const safety = assessPostSafety({
        text: post.text,
        authorHandle: post.authorHandle,
      });

      if (!safety.ok) {
        skipped += 1;
        actions.push({
          postId: post.id,
          authorHandle: post.authorHandle,
          textPreview: preview(post.text),
          action: "skip",
          detail: safety.reason,
        });
        continue;
      }

      const decision = await decideEngagement(config, post);
      if (!decision.shouldEngage) {
        skipped += 1;
        actions.push({
          postId: post.id,
          authorHandle: post.authorHandle,
          textPreview: preview(post.text),
          action: "skip",
          detail: `llm:${decision.reason}`,
        });
        await randomDelay(400, 1200);
        continue;
      }

      let didLike = false;
      let didReply = false;
      const details: string[] = [decision.reason];

      const canLike = decision.shouldLike && liked < config.MAX_LIKES;
      const canReply =
        decision.shouldReply &&
        Boolean(decision.reply) &&
        replied < config.MAX_REPLIES;

      if (canLike) {
        await randomDelay(config.MIN_DELAY_MS, config.MAX_DELAY_MS);
        const likeResult = await likePost(session.page, post, config.DRY_RUN);
        details.push(`like:${likeResult.detail}`);
        if (likeResult.ok && likeResult.detail !== "already_liked") {
          liked += 1;
          didLike = true;
        } else if (likeResult.detail === "already_liked") {
          didLike = true;
        }
      }

      if (canReply && decision.reply) {
        await randomDelay(config.MIN_DELAY_MS, config.MAX_DELAY_MS);
        const replyResult = await replyToPost(
          session.page,
          post,
          decision.reply,
          config.DRY_RUN,
        );
        details.push(`reply:${replyResult.detail}`);
        if (replyResult.ok) {
          replied += 1;
          didReply = true;
        }
      }

      if (!didLike && !didReply) {
        skipped += 1;
        actions.push({
          postId: post.id,
          authorHandle: post.authorHandle,
          textPreview: preview(post.text),
          action: "skip",
          detail: details.join(" | "),
        });
        continue;
      }

      const action: ActionLog["action"] =
        didLike && didReply ? "like+reply" : didReply ? "reply" : "like";

      actions.push({
        postId: post.id,
        authorHandle: post.authorHandle,
        textPreview: preview(post.text),
        action,
        detail: details.join(" | "),
      });
    }

    return {
      dryRun: config.DRY_RUN,
      scanned,
      liked,
      replied,
      skipped,
      actions,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      dryRun: config.DRY_RUN,
      scanned,
      liked,
      replied,
      skipped,
      actions,
      error: message,
    };
  } finally {
    await closeSession(session);
  }
}

export type { FeedPost };
