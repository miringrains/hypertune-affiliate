"use client";

import { useState, type ReactNode } from "react";
import "./folder.css";

function darkenColor(hex: string, percent: number): string {
  let color = hex.startsWith("#") ? hex.slice(1) : hex;
  if (color.length === 3) {
    color = color
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(color, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  r = Math.max(0, Math.min(255, Math.floor(r * (1 - percent))));
  g = Math.max(0, Math.min(255, Math.floor(g * (1 - percent))));
  b = Math.max(0, Math.min(255, Math.floor(b * (1 - percent))));
  return (
    "#" +
    ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
  );
}

interface FolderProps {
  color?: string;
  size?: number;
  items?: (ReactNode | null)[];
  className?: string;
  label?: string;
  subtitle?: string;
  onClick?: () => void;
}

export function Folder({
  color = "#E1261B",
  size = 1,
  items = [],
  className = "",
  label,
  subtitle,
  onClick,
}: FolderProps) {
  const maxItems = 3;
  const papers = items.slice(0, maxItems);
  while (papers.length < maxItems) {
    papers.push(null);
  }

  const [open, setOpen] = useState(false);
  const [paperOffsets, setPaperOffsets] = useState(
    Array.from({ length: maxItems }, () => ({ x: 0, y: 0 }))
  );

  const folderBackColor = darkenColor(color, 0.08);
  const paper1 = "#1a1a1a";
  const paper2 = "#222222";
  const paper3 = "#2a2a2a";

  const handleMouseEnter = () => setOpen(true);

  const handleMouseLeave = () => {
    setOpen(false);
    setPaperOffsets(
      Array.from({ length: maxItems }, () => ({ x: 0, y: 0 }))
    );
  };

  const handlePaperMouseMove = (
    e: React.MouseEvent<HTMLDivElement>,
    index: number
  ) => {
    if (!open) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const offsetX = (e.clientX - centerX) * 0.15;
    const offsetY = (e.clientY - centerY) * 0.15;
    setPaperOffsets((prev) => {
      const newOffsets = [...prev];
      newOffsets[index] = { x: offsetX, y: offsetY };
      return newOffsets;
    });
  };

  const handlePaperMouseLeave = (
    _e: React.MouseEvent<HTMLDivElement>,
    index: number
  ) => {
    setPaperOffsets((prev) => {
      const newOffsets = [...prev];
      newOffsets[index] = { x: 0, y: 0 };
      return newOffsets;
    });
  };

  const folderStyle = {
    "--folder-color": color,
    "--folder-back-color": folderBackColor,
    "--paper-1": paper1,
    "--paper-2": paper2,
    "--paper-3": paper3,
  } as React.CSSProperties;

  const scaleStyle = size !== 1 ? { transform: `scale(${size})` } : undefined;

  return (
    <div
      className={`folder-card ${className}`}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="folder-scene">
        <div style={scaleStyle}>
          <div
            className={`folder ${open ? "open" : ""}`}
            style={folderStyle}
          >
            <div className="folder__back">
              {papers.map((item, i) => (
                <div
                  key={i}
                  className={`paper paper-${i + 1}`}
                  onMouseMove={(e) => handlePaperMouseMove(e, i)}
                  onMouseLeave={(e) => handlePaperMouseLeave(e, i)}
                  style={
                    open
                      ? ({
                          "--magnet-x": `${paperOffsets[i]?.x || 0}px`,
                          "--magnet-y": `${paperOffsets[i]?.y || 0}px`,
                        } as React.CSSProperties)
                      : {}
                  }
                >
                  {item}
                </div>
              ))}
              <div className="folder__front" />
              <div className="folder__front right" />
            </div>
          </div>
        </div>
      </div>
      {label && (
        <div className="text-center">
          <p className="text-[13px] font-semibold">{label}</p>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
      )}
    </div>
  );
}
