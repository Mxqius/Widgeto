export type DockZone =
  | "top-left"
  | "top"
  | "top-right"
  | "left"
  | "right"
  | "bottom-left"
  | "bottom"
  | "bottom-right"
  | "center";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ArrangeMode = "grid" | "columns" | "cascade" | "ring";
