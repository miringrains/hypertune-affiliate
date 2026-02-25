"use client";

import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Folder } from "@/components/shared/folder";
import {
  FolderPlus,
  Upload,
  Trash2,
  ArrowLeft,
  FileVideo,
  FileImage,
  FileText,
  File,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { PaperThumbnail } from "@/components/shared/paper-thumbnail";

interface Asset {
  id: string;
  title: string;
  file_type: string;
  file_size: number;
  file_path: string;
  description: string | null;
  created_at: string;
  thumbnail_url?: string | null;
}

interface FolderData {
  id: string;
  name: string;
  color: string;
  created_at: string;
  assets: Asset[];
}

const FOLDER_COLORS = [
  "#E1261B",
  "#5227FF",
  "#00B894",
  "#FDCB6E",
  "#E17055",
  "#6C5CE7",
  "#00CEC9",
  "#FF6B6B",
];

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

export function AdminMediaClient({
  initialFolders,
}: {
  initialFolders: FolderData[];
}) {
  const [folders, setFolders] = useState<FolderData[]>(initialFolders);
  const [activeFolder, setActiveFolder] = useState<FolderData | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/media/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim(), color: newFolderColor }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFolders((prev) => [
        { ...data.folder, assets: [] },
        ...prev,
      ]);
      setNewFolderName("");
      setShowNewFolder(false);
      toast.success("Folder created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create folder");
    } finally {
      setCreating(false);
    }
  };

  const deleteFolder = async (folderId: string) => {
    if (!confirm("Delete this folder and all its assets?")) return;
    setDeleting(folderId);
    try {
      const res = await fetch(`/api/admin/media/folders?id=${folderId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      if (activeFolder?.id === folderId) setActiveFolder(null);
      toast.success("Folder deleted");
    } catch {
      toast.error("Failed to delete folder");
    } finally {
      setDeleting(null);
    }
  };

  const uploadFiles = async (files: FileList) => {
    if (!activeFolder) return;
    setUploading(true);

    let uploaded = 0;
    const total = files.length;

    for (const file of Array.from(files)) {
      setUploadProgress(`Uploading ${uploaded + 1}/${total}: ${file.name}`);

      try {
        const presignRes = await fetch("/api/admin/media/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            folder_id: activeFolder.id,
            filename: file.name,
            content_type: file.type,
            file_size: file.size,
            title: file.name,
          }),
        });
        const presignData = await presignRes.json();
        if (!presignRes.ok) throw new Error(presignData.error);

        const uploadRes = await fetch(presignData.signed_url, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadRes.ok) {
          await fetch(`/api/admin/media/upload?id=${presignData.asset.id}`, {
            method: "DELETE",
          });
          throw new Error(`Storage upload failed (${uploadRes.status})`);
        }

        setActiveFolder((prev) =>
          prev
            ? { ...prev, assets: [...prev.assets, presignData.asset] }
            : prev
        );
        setFolders((prev) =>
          prev.map((f) =>
            f.id === activeFolder.id
              ? { ...f, assets: [...f.assets, presignData.asset] }
              : f
          )
        );
        uploaded++;
      } catch (e) {
        toast.error(
          `Failed to upload ${file.name}: ${e instanceof Error ? e.message : "Unknown error"}`
        );
      }
    }

    setUploading(false);
    setUploadProgress("");
    if (uploaded > 0) {
      toast.success(`Uploaded ${uploaded} file${uploaded > 1 ? "s" : ""}`);
    }
  };

  const deleteAsset = async (assetId: string) => {
    if (!confirm("Delete this asset?")) return;
    setDeleting(assetId);
    try {
      const res = await fetch(`/api/admin/media/upload?id=${assetId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");

      setActiveFolder((prev) =>
        prev
          ? { ...prev, assets: prev.assets.filter((a) => a.id !== assetId) }
          : prev
      );
      setFolders((prev) =>
        prev.map((f) => ({
          ...f,
          assets: f.assets.filter((a) => a.id !== assetId),
        }))
      );
      toast.success("Asset deleted");
    } catch {
      toast.error("Failed to delete asset");
    } finally {
      setDeleting(null);
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

        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                uploadFiles(e.target.files);
              }
              e.target.value = "";
            }}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            {uploading ? uploadProgress : "Upload Files"}
          </Button>
        </div>

        {activeFolder.assets.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-[14px] text-muted-foreground">
                No assets in this folder yet. Upload files to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      File
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Uploaded
                    </th>
                    <th className="px-5 py-3 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeFolder.assets.map((asset) => (
                    <tr key={asset.id} className="border-b border-border">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <FileIcon type={asset.file_type} />
                          <span className="text-[13px] font-medium">
                            {asset.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase"
                        >
                          {asset.file_type}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-[12px] text-muted-foreground">
                        {formatBytes(asset.file_size)}
                      </td>
                      <td className="px-5 py-3 text-[12px] text-muted-foreground">
                        {new Date(asset.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteAsset(asset.id)}
                          disabled={deleting === asset.id}
                          className="text-destructive hover:text-destructive"
                        >
                          {deleting === asset.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-display-sm">Media Assets</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Organize marketing materials into folders for your affiliates
          </p>
        </div>
        <Button onClick={() => setShowNewFolder(true)}>
          <FolderPlus className="w-4 h-4 mr-2" />
          New Folder
        </Button>
      </div>

      {showNewFolder && (
        <Card>
          <CardContent className="p-5">
            <div className="space-y-4">
              <div>
                <Label className="text-[12px]">Folder Name</Label>
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Product Screenshots"
                  className="mt-1.5"
                  onKeyDown={(e) => e.key === "Enter" && createFolder()}
                />
              </div>
              <div>
                <Label className="text-[12px]">Color</Label>
                <div className="flex gap-2 mt-1.5">
                  {FOLDER_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewFolderColor(c)}
                      className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                      style={{
                        background: c,
                        outline:
                          newFolderColor === c
                            ? "2px solid white"
                            : "2px solid transparent",
                        outlineOffset: "2px",
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={createFolder} disabled={creating || !newFolderName.trim()}>
                  {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowNewFolder(false);
                    setNewFolderName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {folders.length === 0 && !showNewFolder ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderPlus className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-[14px] text-muted-foreground">
              No folders yet. Create one to start organizing media assets.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {folders.map((folder) => (
            <div key={folder.id} className="group relative">
              <div className="flex flex-col items-center gap-3">
                <Folder
                  color={folder.color}
                  size={1.2}
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
                <div className="text-center">
                  <button
                    onClick={() => setActiveFolder(folder)}
                    className="text-[13px] font-semibold hover:underline"
                  >
                    {folder.name}
                  </button>
                  <p className="text-[11px] text-muted-foreground">
                    {folder.assets.length} file
                    {folder.assets.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteFolder(folder.id);
                }}
                disabled={deleting === folder.id}
                className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive/90 text-white rounded-full p-1.5 hover:bg-destructive"
              >
                {deleting === folder.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
