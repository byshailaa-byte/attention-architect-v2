import { NextRequest, NextResponse } from "next/server";
import { tallyDimension, deriveArchetype } from "@/lib/engine/scorer";

// Halfway "FIRST READ": the currently-leading archetype from PARTIAL answers. The archetype
// is the attention_shape × reward_driver grid cell, both of which are usually resolved by the
// midpoint. Scoring logic is reused unchanged; this only runs the two grid dimensions.

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const answers = body?.answers as Record<string, string> | undefined;
  const seq = body?.questionSequence as Array<{ id: string; dimension: string }> | undefined;

  if (!answers || !Array.isArray(seq)) {
    return NextResponse.json({ archetype: null }, { status: 200 });
  }

  const shapeAns: string[] = [];
  const driverAns: string[] = [];
  for (const { id, dimension } of seq) {
    const v = answers[id];
    if (v === undefined) continue;
    if (dimension === "attention_shape") shapeAns.push(v);
    else if (dimension === "reward_driver") driverAns.push(v);
  }

  if (shapeAns.length === 0 || driverAns.length === 0) {
    return NextResponse.json({ archetype: null }, { status: 200 });
  }

  const shape = tallyDimension(shapeAns);
  const driver = tallyDimension(driverAns);
  const archetype = deriveArchetype(shape.value, driver.value);
  return NextResponse.json({ archetype: archetype === "Unknown" ? null : archetype });
}
