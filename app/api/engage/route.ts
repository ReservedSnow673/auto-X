import { NextResponse } from "next/server";
import { assertAuthorized, loadConfig } from "@/config";
import { runEngagement } from "@/engage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Manual trigger for testing. Same auth as cron (Bearer CRON_SECRET).
 * Optional JSON body overrides: { "dryRun": true, "maxLikes": 1, "maxReplies": 1 }
 */
export async function POST(request: Request) {
  let config;
  try {
    config = loadConfig();
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing or invalid environment configuration",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }

  if (!assertAuthorized(request, config.CRON_SECRET)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    dryRun?: boolean;
    maxLikes?: number;
    maxReplies?: number;
    maxCandidates?: number;
  } = {};

  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const runConfig = loadConfig({
    DRY_RUN: body.dryRun ?? config.DRY_RUN,
    MAX_LIKES: body.maxLikes ?? config.MAX_LIKES,
    MAX_REPLIES: body.maxReplies ?? config.MAX_REPLIES,
    MAX_CANDIDATES: body.maxCandidates ?? config.MAX_CANDIDATES,
  });

  const result = await runEngagement(runConfig);
  const status = result.error ? 500 : 200;
  return NextResponse.json({ ok: !result.error, ...result }, { status });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "POST with Authorization: Bearer $CRON_SECRET to run engagement once",
  });
}
