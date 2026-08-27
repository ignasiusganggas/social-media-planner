import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabaseClient";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaign_id");

  let query = supabase.from("reports").select("*").order("created_at", { ascending: false });
  if (campaignId) query = query.eq("campaign_id", campaignId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
}

// POST is used by the app to LIST reports (not just GET) specifically because POST
// requests are never cached by browsers, proxies, or service workers -- GET requests
// can be, at any layer, regardless of Cache-Control headers. This guarantees fresh data.
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const campaignId = body.campaign_id;

  let query = supabase.from("reports").select("*").order("created_at", { ascending: false });
  if (campaignId) query = query.eq("campaign_id", campaignId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
}
