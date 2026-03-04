/**
 * Seed affiliates from GHL CSV export into Supabase.
 *
 * Inserts with user_id=null and status='invited' so nobody can log in.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... npx tsx scripts/seed-affiliates.ts
 *
 * Or set the key in .env.local and run with dotenv:
 *   npx tsx scripts/seed-affiliates.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY || SERVICE_KEY === "your-supabase-service-role-key") {
  console.error(
    "Missing SUPABASE_SERVICE_ROLE_KEY. Set it in .env.local or pass as env var.\n" +
    "Get it from: Supabase Dashboard > Project Settings > API > service_role key"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SKIP_EMAILS = new Set([
  "kevin@breakthruweb.com",
  "anna@breakthruweb.com",
  "ramu@istesting.app",
  "stacey.hughes@dripengage.com",
]);

function parseCurrency(val: string): number {
  return parseFloat(val.replace(/[$,""]/g, "")) || 0;
}

function parseDate(val: string): string {
  const [day, month, year] = val.split("-");
  return `${year}-${month}-${day}T00:00:00Z`;
}

function extractSlug(row: string[]): string | null {
  for (let i = 12; i <= 14; i++) {
    const link = row[i]?.trim().replace(/"/g, "");
    if (link) {
      const match = link.match(/am_id=([^&"]+)/);
      if (match) return match[1];
    }
  }
  return null;
}

function deriveRate(campaign: string): number {
  if (campaign.includes("[70]")) return 70;
  if (campaign.includes("[50]")) return 50;
  return 70;
}

function sanitizeSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  const fields: string[] = [];

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (current || fields.length > 0) {
        fields.push(current);
        rows.push([...fields]);
        fields.length = 0;
        current = "";
      }
      if (ch === "\r" && content[i + 1] === "\n") i++;
    } else {
      current += ch;
    }
  }
  if (current || fields.length > 0) {
    fields.push(current);
    rows.push([...fields]);
  }
  return rows;
}

interface AffiliateInsert {
  name: string;
  email: string;
  slug: string;
  commission_rate: number;
  tier_level: number;
  role: "affiliate";
  status: "invited";
  commission_duration_months: number;
  sub_affiliate_rate: number;
  sub_affiliate_duration_months: number;
  created_at: string;
  user_id: null;
}

async function main() {
  const csvPath = resolve(__dirname, "../Affiliate-27-02-2026.csv");
  const content = readFileSync(csvPath, "utf-8");
  const rows = parseCSV(content);

  console.log(`Total CSV rows (including header): ${rows.length}`);

  const affiliates: AffiliateInsert[] = [];
  const skipped: string[] = [];
  const slugsSeen = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 12) continue;

    const email = row[2]?.trim();
    if (!email || SKIP_EMAILS.has(email)) {
      skipped.push(email || `row ${i}`);
      continue;
    }

    const name = row[1]?.trim();
    const campaign = row[3]?.trim();
    const rate = deriveRate(campaign);

    let slug = extractSlug(row);
    if (!slug) slug = sanitizeSlug(name);

    const slugLower = slug.toLowerCase();
    if (slugsSeen.has(slugLower)) {
      slug = slug + "-" + Math.floor(Math.random() * 9000 + 1000);
    }
    slugsSeen.add(slug.toLowerCase());

    affiliates.push({
      name,
      email,
      slug,
      commission_rate: rate,
      tier_level: 1,
      role: "affiliate",
      status: "invited",
      commission_duration_months: 12,
      sub_affiliate_rate: 10,
      sub_affiliate_duration_months: 12,
      created_at: parseDate(row[11]?.trim()),
      user_id: null,
    });
  }

  console.log(`Parsed ${affiliates.length} affiliates, skipped ${skipped.length}`);
  console.log("Skipped:", skipped.join(", "));

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const aff of affiliates) {
    const { data: existing } = await supabase
      .from("affiliates")
      .select("id")
      .eq("email", aff.email)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("affiliates")
        .update({
          name: aff.name,
          slug: aff.slug,
          commission_rate: aff.commission_rate,
          created_at: aff.created_at,
        })
        .eq("id", existing.id);

      if (error) {
        console.error(`  UPDATE error for ${aff.email}: ${error.message}`);
        errors++;
      } else {
        updated++;
      }
    } else {
      const { error } = await supabase.from("affiliates").insert(aff);

      if (error) {
        console.error(`  INSERT error for ${aff.email}: ${error.message}`);
        if (error.message.includes("duplicate key") && error.message.includes("slug")) {
          aff.slug = aff.slug + "-" + Math.floor(Math.random() * 9000 + 1000);
          const { error: retry } = await supabase.from("affiliates").insert(aff);
          if (retry) {
            console.error(`  RETRY error for ${aff.email}: ${retry.message}`);
            errors++;
          } else {
            inserted++;
          }
        } else {
          errors++;
        }
      } else {
        inserted++;
      }
    }
  }

  console.log("\n--- Summary ---");
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated:  ${updated}`);
  console.log(`Errors:   ${errors}`);
  console.log(`Total:    ${affiliates.length}`);

  const { count } = await supabase
    .from("affiliates")
    .select("*", { count: "exact", head: true })
    .eq("status", "invited");

  console.log(`\nAffiliates with status='invited' in DB: ${count}`);
  console.log("None of them can log in (user_id is NULL).");
}

main().catch(console.error);
