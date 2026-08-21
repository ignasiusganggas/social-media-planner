import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabaseClient";

function avg(arr) {
  const vals = arr.filter((v) => v != null);
  if (vals.length === 0) return null;
  return Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));
}
function sum(arr) {
  return arr.filter((v) => v != null).reduce((a, b) => a + b, 0);
}

function groupBy(items, key) {
  const groups = {};
  for (const item of items) {
    const k = item[key] || "Unspecified";
    if (!groups[k]) groups[k] = [];
    groups[k].push(item);
  }
  return groups;
}

export async function POST(request) {
  const { campaign_id, period_start, period_end, period_type } = await request.json();

  if (!campaign_id || !period_start || !period_end) {
    return NextResponse.json({ error: "Missing campaign or date range." }, { status: 400 });
  }

  try {
    const { data: campaign } = await supabase.from("campaigns").select("*").eq("id", campaign_id).single();

    const { data: contentPlans } = await supabase
      .from("content_plans")
      .select("*")
      .eq("campaign_id", campaign_id)
      .gte("date", period_start)
      .lte("date", period_end);

    const planIds = (contentPlans || []).map((c) => c.id);
    let posts = [];
    if (planIds.length > 0) {
      const { data: postData } = await supabase
        .from("instagram_posts")
        .select("*")
        .in("content_id", planIds);
      posts = postData || [];
    }

    // Merge each content plan item with its matched Instagram performance, if any
    const merged = (contentPlans || []).map((cp) => {
      const post = posts.find((p) => p.content_id === cp.id);
      return {
        ...cp,
        reach: post?.reach ?? null,
        likes: post?.likes ?? null,
        comments: post?.comments ?? null,
        saves: post?.saves ?? null,
        shares: post?.shares ?? null,
        video_views: post?.video_views ?? null,
        engagement_rate: post?.engagement_rate ?? null,
        has_performance_data: !!post,
      };
    });

    const published = merged.filter((m) => m.has_performance_data);

    // If there's genuinely not enough data, don't spend an AI call — say so plainly.
    if (published.length < 2) {
      const insufficientReport = {
        insufficient_data: true,
        message: `Only ${published.length} post(s) in this period have matched Instagram performance data. At least 2 are needed for a meaningful report. Try a wider date range, or sync more Instagram posts first.`,
      };
      const { data: saved } = await supabase
        .from("reports")
        .insert([{ campaign_id, period_type, period_start, period_end, content: insufficientReport }])
        .select()
        .single();
      return NextResponse.json(saved);
    }

    // --- Real calculations, done in code, not by the AI ---
    const overall = {
      total_reach: sum(published.map((p) => p.reach)),
      total_likes: sum(published.map((p) => p.likes)),
      total_comments: sum(published.map((p) => p.comments)),
      total_saves: sum(published.map((p) => p.saves)),
      total_shares: sum(published.map((p) => p.shares)),
      avg_engagement_rate: avg(published.map((p) => p.engagement_rate)),
      posts_planned: merged.length,
      posts_published: published.length,
    };

    const ranked = [...published].sort((a, b) => (b.engagement_rate || 0) - (a.engagement_rate || 0));
    const topPosts = ranked.slice(0, 3);
    const lowPosts = ranked.slice(-3).reverse();

    const pillarGroups = groupBy(published, "pillar");
    const pillarStats = Object.entries(pillarGroups).map(([pillar, items]) => ({
      pillar,
      post_count: items.length,
      avg_engagement_rate: avg(items.map((i) => i.engagement_rate)),
      avg_reach: avg(items.map((i) => i.reach)),
    }));

    const formatGroups = groupBy(published, "format");
    const formatStats = Object.entries(formatGroups).map(([format, items]) => ({
      format,
      post_count: items.length,
      avg_engagement_rate: avg(items.map((i) => i.engagement_rate)),
      avg_reach: avg(items.map((i) => i.reach)),
    }));

    // --- Ask Claude to interpret these pre-calculated numbers, not invent new ones ---
    const prompt = `You are a social media analyst writing a performance report. Use ONLY the data provided below. Do not invent numbers. Clearly separate DATA (what the numbers show) from INTERPRETATION (what they may mean) from RECOMMENDATION (what to do next).

CAMPAIGN
Name: ${campaign?.name}
Objective: ${campaign?.objective || "Not specified"}
Audience: ${campaign?.audience || "Not specified"}
Period: ${period_start} to ${period_end}

OVERALL NUMBERS (already calculated, use as-is)
${JSON.stringify(overall, null, 2)}

TOP PERFORMING POSTS (by engagement rate)
${JSON.stringify(topPosts.map((p) => ({ topic: p.topic, pillar: p.pillar, format: p.format, engagement_rate: p.engagement_rate, reach: p.reach, likes: p.likes, comments: p.comments, saves: p.saves })), null, 2)}

LOWEST PERFORMING POSTS (by engagement rate)
${JSON.stringify(lowPosts.map((p) => ({ topic: p.topic, pillar: p.pillar, format: p.format, engagement_rate: p.engagement_rate, reach: p.reach, likes: p.likes, comments: p.comments, saves: p.saves })), null, 2)}

PERFORMANCE BY CONTENT PILLAR
${JSON.stringify(pillarStats, null, 2)}

PERFORMANCE BY FORMAT
${JSON.stringify(formatStats, null, 2)}

Respond ONLY with raw JSON (no markdown, no code fences) matching this exact structure:
{
  "executive_summary": "2-3 sentence plain-language summary of how the period went",
  "overall_performance_narrative": "short paragraph interpreting the overall numbers above",
  "top_performing_narrative": "why these posts likely performed well, based only on their pillar/format/topic patterns visible in the data",
  "low_performing_narrative": "possible reasons these underperformed, based only on visible patterns -- avoid unsupported claims",
  "pillar_analysis_narrative": "which pillars are performing best/worst and why, based on the numbers given",
  "format_analysis_narrative": "which formats are performing best/worst and why, based on the numbers given",
  "audience_engagement_insights": "any meaningful patterns visible in the data, or state plainly if the data is too limited to say much yet",
  "recommendations": ["specific, actionable recommendation referencing the actual data", "..."]
}`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const aiData = await aiRes.json();
    const textBlock = (aiData.content || []).find((b) => b.type === "text");
    if (!textBlock) throw new Error("No response from AI.");
    const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
    const narrative = JSON.parse(cleaned);

    const fullReport = {
      insufficient_data: false,
      overall,
      top_posts: topPosts,
      low_posts: lowPosts,
      pillar_stats: pillarStats,
      format_stats: formatStats,
      ...narrative,
    };

    const { data: saved, error: saveError } = await supabase
      .from("reports")
      .insert([{ campaign_id, period_type, period_start, period_end, content: fullReport }])
      .select()
      .single();

    if (saveError) throw new Error(saveError.message);
    return NextResponse.json(saved);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
