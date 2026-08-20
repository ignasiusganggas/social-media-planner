import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseClient";

export async function PUT(request, { params }) {
  const body = await request.json();
  const { data, error } = await supabase
    .from("content_plans")
    .update(body)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request, { params }) {
  const { error } = await supabase.from("content_plans").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
