export const layout = {
  sidebarWidth: 260,
  sidebarWidthCollapsed: 68,
  topbarHeight: 52,
  contentMaxWidth: 1280,
  contentMaxWidthPublic: 1440,
  pagePaddingDesktop: 32,
  pagePaddingMobile: 16,
  cardGap: 24,
  cardGapCompact: 16,
} as const;

export const radius = {
  none: 0,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  "2xl": 16,
  "3xl": 20,
  "4xl": 24,
  full: 9999,
} as const;

export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

export const zIndex = {
  base: 0,
  raised: 10,
  dropdown: 50,
  sticky: 100,
  overlay: 200,
  modal: 300,
  toast: 400,
  max: 999,
} as const;

export const duration = {
  fast: 100,
  normal: 200,
  smooth: 300,
  slow: 500,
} as const;

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export const ICON_STROKE_WIDTH = 1.75;
