import assert from "node:assert/strict";
import { assessPostSafety, sanitizeReply } from "../src/safety";

assert.equal(assessPostSafety({ text: "Nice writeup on using SQLite for local caches." }).ok, true);
assert.equal(assessPostSafety({ text: "Vote Trump 2024!!!" }).ok, false);
assert.equal(assessPostSafety({ text: "hi" }).ok, false);
assert.equal(sanitizeReply('  "cool take on the sqlite piece"  '), "cool take on the sqlite piece");

console.log("safety checks passed");
