import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminMediaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (!affiliate || affiliate.role !== "admin") redirect("/dashboard");

  const service = await createServiceClient();
  const { data: assets } = await service
    .from("media_assets")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-sm">Media Assets</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Upload and manage marketing materials for affiliates
        </p>
      </div>

      {!assets || assets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-[14px] text-muted-foreground">
              No media assets uploaded yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <Card key={asset.id}>
              <CardContent className="pt-5 pb-4 px-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-[13px] font-semibold leading-tight">
                    {asset.title}
                  </h3>
                  <span className="text-[11px] text-muted-foreground uppercase shrink-0">
                    {asset.file_type}
                  </span>
                </div>
                {asset.description && (
                  <p className="text-[12px] text-muted-foreground mb-3 line-clamp-2">
                    {asset.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-auto">
                  {asset.campaign && (
                    <Badge
                      variant="outline"
                      className="text-[11px] font-medium"
                    >
                      {asset.campaign}
                    </Badge>
                  )}
                  <span className="text-[11px] text-muted-foreground ml-auto">
                    {new Date(asset.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
