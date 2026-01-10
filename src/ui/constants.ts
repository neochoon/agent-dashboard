// Default panel width (can be overridden via config)
export const DEFAULT_PANEL_WIDTH = 70;

// Legacy exports for backward compatibility (use functions with width param for new code)
export const PANEL_WIDTH = DEFAULT_PANEL_WIDTH;
export const CONTENT_WIDTH = DEFAULT_PANEL_WIDTH - 4;
export const INNER_WIDTH = DEFAULT_PANEL_WIDTH - 2;

// Calculate widths based on panel width
export function getContentWidth(panelWidth: number): number {
  return panelWidth - 4;
}

export function getInnerWidth(panelWidth: number): number {
  return panelWidth - 2;
}

// Box drawing characters
export const BOX = {
  tl: "┌",
  tr: "┐",
  bl: "└",
  br: "┘",
  h: "─",
  v: "│",
  ml: "├",
  mr: "┤",
};

// Create a title line with label on left and suffix on right
// Example: "┌─ Git ───────────────────────────────── ↻ 25s ─┐"
export function createTitleLine(label: string, suffix: string = "", panelWidth: number = DEFAULT_PANEL_WIDTH): string {
  const leftPart = BOX.h + " " + label + " ";
  const rightPart = suffix ? " " + suffix + " " + BOX.h : "";
  const dashCount = panelWidth - 1 - leftPart.length - rightPart.length - 1;
  const dashes = BOX.h.repeat(Math.max(0, dashCount));
  return BOX.tl + leftPart + dashes + rightPart + BOX.tr;
}

// Create bottom line
export function createBottomLine(panelWidth: number = DEFAULT_PANEL_WIDTH): string {
  return BOX.bl + BOX.h.repeat(getInnerWidth(panelWidth)) + BOX.br;
}

// Pad content to fit inner width (content goes between │ and │)
export function padLine(content: string, panelWidth: number = DEFAULT_PANEL_WIDTH): string {
  const innerWidth = getInnerWidth(panelWidth);
  const padding = innerWidth - content.length;
  return content + " ".repeat(Math.max(0, padding));
}

// Separator line for content area
export function createSeparator(panelWidth: number = DEFAULT_PANEL_WIDTH): string {
  return "─".repeat(getContentWidth(panelWidth));
}

// Legacy separator (for backward compatibility)
export const SEPARATOR = "─".repeat(CONTENT_WIDTH);

// Truncate text to fit within max length, adding "..." if needed
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}
