import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env.local") });

import { buildHdg } from "../lib/graph/hdg.js";
import { buildBehaviourGraph } from "../lib/graph/behaviour-graph.js";
import { buildBehaviourSignature } from "../lib/graph/signature.js";
import { buildFamilyAttentionLoop } from "../lib/graph/loop.js";

const ARYAN_ANSWERS: Record<string, string> = {
  G1: "social-anchored", G2: "social", G3: "quick-fixer",
  "D2.1": "mastery", "D2.2": "mastery", "D2.3": "mastery",
  "D3.1": "solo-push", "D3.2": "solo-push", "D3.3": "solo-push",
  "D5.1": "social", "D5.2": "social",
  "D6.1": "social-connection", "D6.2": "social-connection", "D6.3": "social-connection",
};

const hdg = buildHdg(ARYAN_ANSWERS);
const bg = buildBehaviourGraph(hdg);
const sig = buildBehaviourSignature(hdg, bg);
const loop = buildFamilyAttentionLoop(hdg, bg, sig);

console.log("Loop detected:", loop.detected);
if (loop.detected) {
  console.log("Trigger dimension:", loop.loop_tension_point?.child_dimension);
  console.log("Loop summary:", JSON.stringify({ trigger: loop.loop_tension_point, detected: loop.detected }, null, 2));
} else {
  console.log("No loop for Aryan — need different answers for loop-present test");
}
