import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseClient";

export async function DELETE(request, { params }) {
  const { error } = await supabase.from("reports").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
