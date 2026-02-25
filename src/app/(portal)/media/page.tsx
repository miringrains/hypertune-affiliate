import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function MediaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!affiliate) redirect("/login");

  const { data: assets } = await supabase
    .from("media_assets")
    .select("*")
    .order("created_at", { ascending: false });

  const rows = assets ?? [];

  return (
    <div>
      <h1 className="text-display-sm">Media</h1>
      <p className="text-[14px] text-muted-foreground mt-1">
        Promotional assets to help you market Hypertune.
      </p>

      {rows.length === 0 ? (
        <Card className="mt-6">
          <div className="px-5 py-12 text-center text-[13px] text-muted-foreground">
            No media assets available.
          </div>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((asset) => (
            <Card key={asset.id}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[13px] font-semibold leading-tight">
                    {asset.title}
                  </h3>
                  <Badge
                    variant="outline"
                    className="shrink-0 text-[10px] uppercase"
                  >
                    {asset.file_type}
                  </Badge>
                </div>
                {asset.description && (
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    {asset.description}
                  </p>
                )}
                <a
                  href={asset.file_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-[12px] font-medium text-primary hover:underline"
                >
                  Download
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
