import { NextResponse } from "next/server";

export async function POST(request) {
  const { campaign, slots } = await request.json();

  const prompt = `You are a social media content strategist. Generate a content calendar for this campaign.

Campaign name: ${campaign.name}
Objective: ${campaign.objective || "Not specified"}
Target audience: ${campaign.audience || "Not specified"}
Platform: ${campaign.platform}
Additional notes: ${campaign.notes || "None"}

For each of the following dates and pre-assigned content pillars, invent one specific, concrete content idea (not generic). Vary the format across Reel, Carousel, Static Image, and Story in a natural mix. Vary the objective across Awareness, Engagement, Conversion, and Education where it fits.

Slots (in order):
${slots.map((s, i) => `${i + 1}. Date: ${s.date}, Pillar: ${s.pillar}`).join("\n")}

Respond ONLY with a raw JSON array (no markdown, no prose, no code fences), one object per slot, in the same order, with EXACTLY these keys:
[{"date": "YYYY-MM-DD", "pillar": "string", "topic": "string (a specific content idea, under 12 words)", "format": "Reel | Carousel | Static Image | Story", "objective": "Awareness | Engagement | Conversion | Education"}]`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const textBlock = (data.content || []).find((b) => b.type === "text");
    if (!textBlock) throw new Error("No response from AI.");

    const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
    const items = JSON.parse(cleaned);

    return NextResponse.json(items);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
