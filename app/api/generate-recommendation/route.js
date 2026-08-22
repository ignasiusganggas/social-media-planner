import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabaseClient";

function computeDates(start, end, perWeek) {
  if (!start || !end || !perWeek) return [];
  const startDate = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");
  if (isNaN(startDate) || isNaN(endDate) || endDate < startDate) return [];
  const weekdaySlots = {
    1: [3], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5],
    5: [1, 2, 3, 4, 5], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6],
  };
  const slots = weekdaySlots[Math.min(7, Math.max(1, perWeek))] || [1, 3, 5];
  const dates = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    if (slots.includes(cursor.getDay())) dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates.map((d) => d.toISOString().slice(0, 10));
}

export async function POST(request) {
  const { campaign_id, report_id, period_start, period_end, frequency } = await request.json();

  if (!campaign_id || !report_id || !period_start || !period_end || !frequency) {
    return NextResponse.json({ error: "Missing campaign, report, date range, or frequency." }, { status: 400 });
  }

  try {
    const { data: campaign } = await supabase.from("campaigns").select("*").eq("id", campaign_id).single();
    const { data: report } = await supabase.from("reports").select("*").eq("id", report_id).single();

    if (!report || report.content?.insufficient_data) {
      return NextResponse.json({ error: "The selected report doesn't have enough data to base a recommendation on." }, { status: 400 });
    }

    const dates = computeDates(period_start, period_end, Number(frequency));
    if (dates.length === 0) {
      return NextResponse.json({ error: "No posting dates fall in that date range with that frequency." }, { status: 400 });
    }

    const r = report.content;
    const previousPillars = (r.pillar_stats || []).map((p) => p.pillar);

    const prompt = `You are a social media strategist creating the NEXT content plan for a campaign, based on real historical performance data. Do NOT simply repeat the previous plan -- use the patterns below to shift strategy: lean into what performed well, reduce or rework what performed poorly. Every recommendation must reference the actual data given.

CAMPAIGN
Name: ${campaign?.name}
Objective: ${campaign?.objective || "Not specified"}
Audience: ${campaign?.audience || "Not specified"}
Platform: ${campaign?.platform}

PREVIOUS PERIOD REPORT DATA (already calculated, real numbers -- use as-is, do not recompute)
Executive summary: ${r.executive_summary}
Overall: ${JSON.stringify(r.overall)}
Top performing posts: ${JSON.stringify((r.top_posts || []).map((p) => ({ topic: p.topic, pillar: p.pillar, format: p.format, engagement_rate: p.engagement_rate })))}
Low performing posts: ${JSON.stringify((r.low_posts || []).map((p) => ({ topic: p.topic, pillar: p.pillar, format: p.format, engagement_rate: p.engagement_rate })))}
Pillar performance: ${JSON.stringify(r.pillar_stats)}
Format performance: ${JSON.stringify(r.format_stats)}
Report's own recommendations: ${JSON.stringify(r.recommendations)}

NEW PERIOD TO PLAN FOR
Dates needing content (in order, ${dates.length} total): ${JSON.stringify(dates)}
Posting frequency: ${frequency} per week

Respond ONLY with raw JSON (no markdown, no code fences) matching exactly this structure:
{
  "overall_strategy": "2-3 sentence paragraph on the strategic shift for this next period, referencing the data",
  "pillar_mix": [{"pillar": "string", "percent": number, "reason": "why this weighting, referencing actual past performance"}],
  "format_mix": [{"format": "string", "percent": number, "reason": "why this weighting, referencing actual past performance"}],
  "frequency_recommendation": "e.g. '4 posts per week'",
  "frequency_reason": "short reason, referencing data if relevant, otherwise state that frequency is being held steady due to limited data",
  "calendar": [
    {"date": "YYYY-MM-DD", "pillar": "string", "topic": "specific content idea, under 12 words", "format": "Reel | Carousel | Static Image | Story", "objective": "Awareness | Engagement | Conversion | Education", "reason": "short reason this specific idea was chosen, referencing the data where possible"}
  ]
}
The "calendar" array must have exactly ${dates.length} items, one per date listed above, in the same order. The pillar_mix percentages should sum to approximately 100, same for format_mix.`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
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
    const aiData = await aiRes.json();
    const textBlock = (aiData.content || []).find((b) => b.type === "text");
    if (!textBlock) throw new Error("No response from AI.");
    const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    // Save the recommendation record itself
    const { data: savedRec, error: recError } = await supabase
      .from("recommendations")
      .insert([{ campaign_id, based_on_report_id: report_id, period_start, period_end, content: parsed }])
      .select()
      .single();
    if (recError) throw new Error(recError.message);

    // Also insert the actual calendar into content_plans, so it flows into the Content Planner
    const rows = (parsed.calendar || []).map((item) => ({
      campaign_id,
      date: item.date,
      platform: campaign?.platform,
      pillar: item.pillar,
      topic: item.topic,
      format: item.format,
      objective: item.objective,
      status: "Planned",
      notes: item.reason ? `AI recommendation: ${item.reason}` : null,
    }));
    const { data: insertedItems, error: insertError } = await supabase
      .from("content_plans")
      .insert(rows)
      .select();
    if (insertError) throw new Error(insertError.message);

    return NextResponse.json({ ...savedRec, items_added: insertedItems?.length || 0 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
