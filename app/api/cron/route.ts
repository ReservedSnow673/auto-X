import { NextResponse } from "next/server";
import { assertAuthorized, loadConfig } from "@/config";
import { runEngagement } from "@/engage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
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

  const result = await runEngagement(config);
  const status = result.error ? 500 : 200;
  return NextResponse.json({ ok: !result.error, ...result }, { status });
}

export async function POST(request: Request) {
  return GET(request);
}
