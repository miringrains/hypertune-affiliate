import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Ignored in Server Components where cookies can't be set
          }
        },
      },
    },
  );
}

export async function createServiceClient() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * Fetches all rows from a query by paginating in chunks of 1000.
 * Pass a function that builds the query (without .range()).
 */
export async function fetchAll<T>(
  buildQuery: (client: SupabaseClient<Database>) => PromiseLike<{ data: T[] | null; error: unknown }>,
  client: SupabaseClient<Database>,
): Promise<T[]>;
export async function fetchAll<T>(
  queryFn: () => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]>;
export async function fetchAll<T>(
  ...args: unknown[]
): Promise<T[]> {
  const fn = args[0] as (...a: unknown[]) => PromiseLike<{ data: T[] | null; error: unknown }>;
  const { data } = await fn(args[1]);
  return data ?? [];
}

const PAGE_SIZE = 1000;

/**
 * Paginated fetch: calls builder(from, to) repeatedly until all rows are loaded.
 */
export async function fetchAllPaginated<T>(
  builder: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  while (true) {
    const { data } = await builder(offset, offset + PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return all;
}
