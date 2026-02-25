"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Folder } from "@/components/shared/folder";
import {
  ArrowLeft,
  Download,
  FileVideo,
  FileImage,
  FileText,
  File,
  Loader2,
  FolderOpen,
} from "lucide-react";
import { PaperThumbnail } from "@/components/shared/paper-thumbnail";
import { toast } from "sonner";

interface Asset {
  id: string;
  title: string;
  file_type: string;
  file_size: number;
  description: string | null;
  created_at: string;
  thumbnail_url?: string | null;
}

interface FolderData {
  id: string;
  name: string;
  color: string;
  assets: Asset[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function FileIcon({ type }: { type: string }) {
  switch (type) {
    case "video":
      return <FileVideo className="w-4 h-4" />;
    case "image":
      return <FileImage className="w-4 h-4" />;
    case "application":
      return <FileText className="w-4 h-4" />;
    default:
      return <File className="w-4 h-4" />;
  }
}

export function MediaClient({ folders }: { folders: FolderData[] }) {
  const [activeFolder, setActiveFolder] = useState<FolderData | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const downloadAsset = async (assetId: string) => {
    setDownloading(assetId);
    try {
      const res = await fetch(`/api/media/download?id=${assetId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const link = document.createElement("a");
      link.href = data.url;
      link.download = data.title || "download";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to generate download link"
      );
    } finally {
      setDownloading(null);
    }
  };

  if (activeFolder) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveFolder(null)}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-display-sm">{activeFolder.name}</h1>
            <p className="text-[14px] text-muted-foreground mt-1">
              {activeFolder.assets.length} asset
              {activeFolder.assets.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {activeFolder.assets.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FolderOpen className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-[14px] text-muted-foreground">
                This folder is empty.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeFolder.assets.map((asset) => (
              <Card key={asset.id}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileIcon type={asset.file_type} />
                      <h3 className="text-[13px] font-semibold leading-tight truncate">
                        {asset.title}
                      </h3>
                    </div>
                    <Badge
                      variant="outline"
                      className="shrink-0 text-[10px] uppercase"
                    >
                      {asset.file_type}
                    </Badge>
                  </div>
                  {asset.description && (
                    <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2">
                      {asset.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      {formatBytes(asset.file_size)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadAsset(asset.id)}
                      disabled={downloading === asset.id}
                      className="text-[12px] h-7 px-2"
                    >
                      {downloading === asset.id ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5 mr-1" />
                      )}
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-sm">Media</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Promotional assets to help you market Hypertune.
        </p>
      </div>

      {folders.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderOpen className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-[14px] text-muted-foreground">
              No media assets available yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {folders.map((folder) => (
            <Folder
              key={folder.id}
              color={folder.color}
              label={folder.name}
              subtitle={`${folder.assets.length} file${folder.assets.length !== 1 ? "s" : ""}`}
              items={folder.assets.slice(0, 3).map((a, i) => (
                <PaperThumbnail
                  key={i}
                  title={a.title}
                  file_type={a.file_type}
                  thumbnail_url={a.thumbnail_url}
                />
              ))}
              onClick={() => setActiveFolder(folder)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
