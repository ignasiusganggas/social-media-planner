import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabaseClient";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaign_id");

  let query = supabase.from("content_plans").select("*").order("date", { ascending: true });
  if (campaignId) query = query.eq("campaign_id", campaignId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// Accepts either a single item object or an array of items (bulk insert after AI generation)
export async function POST(request) {
  const body = await request.json();
  const rows = Array.isArray(body) ? body : [body];

  const { data, error } = await supabase.from("content_plans").insert(rows).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
