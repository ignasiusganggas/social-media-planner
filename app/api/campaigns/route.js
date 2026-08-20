import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabaseClient";

export async function GET() {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request) {
  const body = await request.json();
  const { data, error } = await supabase
    .from("campaigns")
    .insert([
      {
        name: body.name,
        objective: body.objective,
        audience: body.audience,
        start_date: body.start_date,
        end_date: body.end_date,
        platform: body.platform,
        frequency: body.frequency,
        notes: body.notes,
      },
    ])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
