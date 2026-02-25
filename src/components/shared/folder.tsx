"use client";

import { useState, type ReactNode } from "react";

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
    "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
  );
}

interface FolderProps {
  color?: string;
  size?: number;
  items?: (ReactNode | null)[];
  className?: string;
  onClick?: () => void;
}

export function Folder({
  color = "#E1261B",
  size = 1,
  items = [],
  className = "",
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
  const paper1 = darkenColor("#ffffff", 0.1);
  const paper2 = darkenColor("#ffffff", 0.05);
  const paper3 = "#ffffff";

  const handleClick = () => {
    setOpen((prev) => !prev);
    if (open) {
      setPaperOffsets(
        Array.from({ length: maxItems }, () => ({ x: 0, y: 0 }))
      );
    }
    onClick?.();
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

  return (
    <div
      className={`cursor-pointer transition-all duration-200 ease-in ${className}`}
      onClick={handleClick}
      style={{ transform: `scale(${size})` }}
    >
      <div
        className={`relative transition-transform duration-200 ${open ? "-translate-y-2" : "hover:-translate-y-2"}`}
        style={{ ["--folder-color" as string]: color, ["--folder-back-color" as string]: folderBackColor }}
      >
        {/* Folder back */}
        <div
          className="relative w-[100px] h-[80px] rounded-[0px_10px_10px_10px]"
          style={{ background: folderBackColor }}
        >
          <div
            className="absolute z-0 bottom-[98%] left-0 w-[30px] h-[10px] rounded-[5px_5px_0_0]"
            style={{ background: folderBackColor }}
          />
        </div>

        {/* Papers */}
        {papers.map((item, i) => {
          const bgColors = [paper1, paper2, paper3];
          const widths = ["70%", "80%", "90%"];
          const closedHeights = ["80%", "70%", "60%"];
          const openTransforms = [
            `translate(-120%, -70%) rotateZ(-15deg)`,
            `translate(10%, -70%) rotateZ(15deg)`,
            `translate(-50%, -100%) rotateZ(5deg)`,
          ];
          const openHoverTransforms = [
            `translate(-120%, -70%) rotateZ(-15deg) scale(1.1)`,
            `translate(10%, -70%) rotateZ(15deg) scale(1.1)`,
            `translate(-50%, -100%) rotateZ(5deg) scale(1.1)`,
          ];

          const baseTransform = open
            ? openTransforms[i]
            : "translate(-50%, 10%)";

          const magnetX = paperOffsets[i]?.x || 0;
          const magnetY = paperOffsets[i]?.y || 0;

          return (
            <div
              key={i}
              className="absolute z-[2] bottom-[10%] left-1/2 rounded-[10px] transition-all duration-300 ease-in-out overflow-hidden"
              onMouseMove={(e) => handlePaperMouseMove(e, i)}
              onMouseLeave={(e) => handlePaperMouseLeave(e, i)}
              style={{
                background: bgColors[i],
                width: widths[i],
                height: open ? (i === 0 ? closedHeights[i] : "80%") : closedHeights[i],
                transform: open
                  ? `${openTransforms[i]} translate(${magnetX}px, ${magnetY}px)`
                  : baseTransform,
              }}
            >
              {item}
            </div>
          );
        })}

        {/* Folder front */}
        <div
          className="absolute z-[3] inset-0 rounded-[5px_10px_10px_10px] origin-bottom transition-all duration-300 ease-in-out"
          style={{
            background: color,
            transform: open ? "skew(15deg) scaleY(0.6)" : undefined,
          }}
        />
      </div>
    </div>
  );
}
