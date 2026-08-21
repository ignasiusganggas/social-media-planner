import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseClient";

// We use graph.instagram.com because this app connects via "Instagram business login"
// (a Creator/Business account not linked to a Facebook Page). If a Page-linked
// Business account is used instead, graph.facebook.com would be used instead.
const IG_BASE = "https://graph.instagram.com";

async function fetchJson(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "Instagram API error");
  return data;
}

export async function POST() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Instagram access token is not configured." }, { status: 500 });
  }

  try {
    // 1. Get recent media
    const mediaFields = "id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count";
    const mediaData = await fetchJson(
      `${IG_BASE}/me/media?fields=${mediaFields}&limit=25&access_token=${token}`
    );
    const mediaList = mediaData.data || [];

    const results = [];
    const unavailableMetrics = new Set();

    for (const media of mediaList) {
      // 2. Try to get post-level insights. Not every metric is available for every
      // media type, so we ask for a safe, commonly-supported set and fall back
      // gracefully if some are missing rather than inventing numbers.
      let reach = null, saved = null, shares = null, videoViews = null;
      try {
        const metricList = media.media_type === "VIDEO" || media.media_type === "REELS"
          ? "reach,saved,shares,plays"
          : "reach,saved,shares";
        const insightsData = await fetchJson(
          `${IG_BASE}/${media.id}/insights?metric=${metricList}&access_token=${token}`
        );
        for (const m of insightsData.data || []) {
          const value = m.values?.[0]?.value ?? null;
          if (m.name === "reach") reach = value;
          if (m.name === "saved") saved = value;
          if (m.name === "shares") shares = value;
          if (m.name === "plays") videoViews = value;
        }
      } catch (e) {
        // Some accounts/media types don't support insights yet (e.g. very new posts).
        // We skip metrics for this post rather than failing the whole sync.
        unavailableMetrics.add(media.id);
      }

      const likes = media.like_count ?? null;
      const comments = media.comments_count ?? null;
      const totalEngagement = [likes, comments, saved, shares].filter((v) => v != null).reduce((a, b) => a + b, 0);
      const engagementRate = reach && reach > 0 ? Number(((totalEngagement / reach) * 100).toFixed(2)) : null;

      // 3. Best-effort match to a content plan item: same date, not already matched.
      let contentId = null;
      if (media.timestamp) {
        const postDate = media.timestamp.slice(0, 10);
        const { data: matchCandidates } = await supabase
          .from("content_plans")
          .select("id")
          .eq("date", postDate)
          .is("instagram_post_id", null)
          .limit(1);
        if (matchCandidates && matchCandidates.length > 0) {
          contentId = matchCandidates[0].id;
        }
      }

      const row = {
        ig_post_id: media.id,
        content_id: contentId,
        posted_at: media.timestamp,
        media_type: media.media_type,
        caption: media.caption || null,
        permalink: media.permalink,
        reach,
        likes,
        comments,
        saves: saved,
        shares,
        video_views: videoViews,
        engagement_rate: engagementRate,
        synced_at: new Date().toISOString(),
      };

      const { data: upserted, error } = await supabase
        .from("instagram_posts")
        .upsert(row, { onConflict: "ig_post_id" })
        .select()
        .single();

      if (!error) {
        results.push(upserted);
        if (contentId) {
          await supabase
            .from("content_plans")
            .update({ instagram_post_id: media.id, status: "Published" })
            .eq("id", contentId);
        }
      }
    }

    return NextResponse.json({
      synced: results.length,
      posts: results,
      note: unavailableMetrics.size > 0
        ? `${unavailableMetrics.size} post(s) had some metrics unavailable through the API (common for very recent posts) and were saved with what was available.`
        : null,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
