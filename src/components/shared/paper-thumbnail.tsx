"use client";

import { FileVideo, FileImage, FileText, File, Music } from "lucide-react";

interface PaperThumbnailProps {
  title: string;
  file_type: string;
  thumbnail_url?: string | null;
}

function TypeIcon({ type, className }: { type: string; className?: string }) {
  const cn = className || "w-6 h-6 text-gray-400/80";
  switch (type) {
    case "video":
      return <FileVideo className={cn} />;
    case "image":
      return <FileImage className={cn} />;
    case "application":
      return <FileText className={cn} />;
    case "audio":
      return <Music className={cn} />;
    default:
      return <File className={cn} />;
  }
}

export function PaperThumbnail({
  title,
  file_type,
  thumbnail_url,
}: PaperThumbnailProps) {
  if (thumbnail_url) {
    return (
      <img
        src={thumbnail_url}
        alt={title}
        className="w-full h-full object-cover"
        draggable={false}
      />
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1">
      <TypeIcon type={file_type} />
      <span className="text-[7px] text-gray-500 font-medium uppercase tracking-wide px-1 truncate max-w-full">
        {file_type}
      </span>
    </div>
  );
}
