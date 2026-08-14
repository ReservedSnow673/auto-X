import { loadConfig } from "../src/config";
import { runEngagement } from "../src/engage";

async function main() {
  const config = loadConfig();
  console.log(
    JSON.stringify(
      {
        dryRun: config.DRY_RUN,
        model: config.OPENAI_MODEL,
        maxLikes: config.MAX_LIKES,
        maxReplies: config.MAX_REPLIES,
      },
      null,
      2,
    ),
  );

  const result = await runEngagement(config);
  console.log(JSON.stringify(result, null, 2));
  if (result.error) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
