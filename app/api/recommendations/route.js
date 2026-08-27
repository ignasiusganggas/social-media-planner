import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabaseClient";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaign_id");

  let query = supabase.from("recommendations").select("*").order("created_at", { ascending: false });
  if (campaignId) query = query.eq("campaign_id", campaignId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
}

// POST used for LISTING (not just GET) because POST requests are never cached
// by browsers, proxies, or service workers -- this guarantees fresh data always.
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const campaignId = body.campaign_id;

  let query = supabase.from("recommendations").select("*").order("created_at", { ascending: false });
  if (campaignId) query = query.eq("campaign_id", campaignId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
}
