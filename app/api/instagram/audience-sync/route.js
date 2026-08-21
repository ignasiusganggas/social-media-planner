import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseClient";

const IG_BASE = "https://graph.instagram.com";

async function tryFetchMetric(token, metric, breakdown) {
  try {
    const url = `${IG_BASE}/me/insights?metric=${metric}&period=lifetime&breakdown=${breakdown}&access_token=${token}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    // Insights with a breakdown come back as a list of {dimension_values, value} pairs
    const totalValue = data.data?.[0]?.total_value;
    const results = totalValue?.breakdowns?.[0]?.results || [];
    return { ok: true, results };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function tryFetchOnlineFollowers(token) {
  try {
    const url = `${IG_BASE}/me/insights?metric=online_followers&period=lifetime&access_token=${token}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const values = data.data?.[0]?.values?.[0]?.value || {};
    // values is an object like { "0": 12, "1": 8, ... "23": 20 } representing hour-of-day
    return { ok: true, values };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export async function POST() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Instagram access token is not configured." }, { status: 500 });
  }

  const unavailable = [];

  const age = await tryFetchMetric(token, "follower_demographics", "age");
  if (!age.ok) unavailable.push("age distribution");

  const gender = await tryFetchMetric(token, "follower_demographics", "gender");
  if (!gender.ok) unavailable.push("gender distribution");

  const city = await tryFetchMetric(token, "follower_demographics", "city");
  if (!city.ok) unavailable.push("top cities");

  const country = await tryFetchMetric(token, "follower_demographics", "country");
  if (!country.ok) unavailable.push("top countries");

  const peakHours = await tryFetchOnlineFollowers(token);
  if (!peakHours.ok) unavailable.push("peak activity hours");

  const row = {
    age_distribution: age.ok ? age.results : null,
    gender_distribution: gender.ok ? gender.results : null,
    top_cities: city.ok ? city.results : null,
    top_countries: country.ok ? country.results : null,
    peak_hours: peakHours.ok ? peakHours.values : null,
    unavailable_metrics: unavailable,
    fetched_at: new Date().toISOString(),
  };

  const { data: saved, error } = await supabase
    .from("audience_insights")
    .insert([row])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ...saved,
    note: unavailable.length > 0
      ? `Instagram didn't return: ${unavailable.join(", ")}. This is common for smaller accounts -- Meta only shows these once an account has enough followers and reach.`
      : null,
  });
}
