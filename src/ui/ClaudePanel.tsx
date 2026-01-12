import React from "react";
import { Box, Text } from "ink";
import type { ClaudeData, ClaudeSessionStatus, ActivityEntry } from "../types/index.js";
import {
  DEFAULT_PANEL_WIDTH,
  BOX,
  createTitleLine,
  createBottomLine,
  getInnerWidth,
} from "./constants.js";

interface ClaudePanelProps {
  data: ClaudeData;
  countdown?: number | null;
  width?: number;
  isRunning?: boolean;
  justRefreshed?: boolean;
}

function formatCountdown(seconds: number | null | undefined): string {
  if (seconds == null) return "";
  const padded = String(seconds).padStart(2, " ");
  return `↻ ${padded}s`;
}

function getStatusIcon(status: ClaudeSessionStatus): string {
  switch (status) {
    case "running":
      return "🔄";
    case "completed":
      return "✅";
    case "idle":
      return "⏳";
    case "none":
    default:
      return "";
  }
}

function formatActivityTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Calculate the display width of a string in the terminal.
 * Emojis typically display as 2 characters wide.
 */
function getDisplayWidth(str: string): number {
  let width = 0;
  for (const char of str) {
    const code = char.codePointAt(0) || 0;
    // Emoji ranges
    if (
      (code >= 0x1F300 && code <= 0x1F9FF) || // Misc symbols, emoticons, etc.
      (code >= 0x2600 && code <= 0x26FF) ||   // Misc symbols
      (code >= 0x2700 && code <= 0x27BF) ||   // Dingbats (includes ✏)
      (code >= 0x1F600 && code <= 0x1F64F) || // Emoticons
      (code >= 0x1F680 && code <= 0x1F6FF)    // Transport symbols
    ) {
      width += 2;
    } else if (code === 0xFE0F) {
      // Variation selector - skip (already counted in base emoji)
      continue;
    } else if (
      // CJK characters (Korean, Chinese, Japanese) - 2 wide
      (code >= 0xAC00 && code <= 0xD7AF) ||   // Korean Hangul syllables
      (code >= 0x1100 && code <= 0x11FF) ||   // Korean Hangul Jamo
      (code >= 0x3130 && code <= 0x318F) ||   // Korean Hangul Compatibility Jamo
      (code >= 0x4E00 && code <= 0x9FFF) ||   // CJK Unified Ideographs
      (code >= 0x3400 && code <= 0x4DBF) ||   // CJK Extension A
      (code >= 0x3000 && code <= 0x303F) ||   // CJK Symbols
      (code >= 0xFF00 && code <= 0xFFEF)      // Fullwidth forms
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

function formatActivityLine(activity: ActivityEntry, maxWidth: number): { text: string; displayWidth: number } {
  const time = formatActivityTime(activity.timestamp);
  const icon = activity.icon;
  const label = activity.label;
  const detail = activity.detail;

  // Fixed parts: "[HH:MM:SS] " = 12 chars, icon = 2 display width, " " = 1, label, ": " = 2
  const fixedPrefix = `[${time}] `;
  const fixedPrefixWidth = fixedPrefix.length; // 12
  const iconWidth = 2; // All our icons are 2-wide
  const labelWidth = label.length;
  const separatorWidth = detail ? 2 : 0; // ": " if there's detail

  const prefixDisplayWidth = fixedPrefixWidth + iconWidth + 1 + labelWidth + separatorWidth;

  if (detail) {
    const availableWidth = maxWidth - prefixDisplayWidth;
    let truncatedDetail = detail;
    let detailDisplayWidth = getDisplayWidth(detail);

    // Truncate if needed, accounting for wide characters
    if (detailDisplayWidth > availableWidth) {
      truncatedDetail = "";
      let currentWidth = 0;
      for (const char of detail) {
        const charWidth = getDisplayWidth(char);
        if (currentWidth + charWidth > availableWidth - 3) {
          truncatedDetail += "...";
          currentWidth += 3;
          break;
        }
        truncatedDetail += char;
        currentWidth += charWidth;
      }
      detailDisplayWidth = currentWidth;
    }

    const text = `${fixedPrefix}${icon} ${label}: ${truncatedDetail}`;
    const displayWidth = prefixDisplayWidth + detailDisplayWidth;
    return { text, displayWidth };
  }

  const text = `${fixedPrefix}${icon} ${label}`;
  const displayWidth = prefixDisplayWidth;
  return { text, displayWidth };
}

export function ClaudePanel({
  data,
  countdown,
  width = DEFAULT_PANEL_WIDTH,
  isRunning = false,
  justRefreshed = false,
}: ClaudePanelProps): React.ReactElement {
  const countdownSuffix = isRunning ? "running..." : formatCountdown(countdown);
  const innerWidth = getInnerWidth(width);
  const contentWidth = innerWidth - 2; // Account for "│ " prefix

  const { state } = data;
  const statusIcon = getStatusIcon(state.status);

  // Build title suffix
  let titleSuffix = countdownSuffix;
  if (state.status !== "none" && statusIcon) {
    titleSuffix = statusIcon;
  }

  // Error state
  if (data.error) {
    const errorPadding = Math.max(0, contentWidth - data.error.length);
    return (
      <Box flexDirection="column" width={width}>
        <Text>{createTitleLine("Claude", titleSuffix, width)}</Text>
        <Text>
          {BOX.v}{" "}
          <Text color="red">{data.error}</Text>
          {" ".repeat(errorPadding)}
          {BOX.v}
        </Text>
        <Text>{createBottomLine(width)}</Text>
      </Box>
    );
  }

  // No active session
  if (state.status === "none" || state.activities.length === 0) {
    const noSessionText = "No active session";
    const noSessionPadding = Math.max(0, contentWidth - noSessionText.length);
    return (
      <Box flexDirection="column" width={width}>
        <Text>{createTitleLine("Claude", countdownSuffix, width)}</Text>
        <Text>
          {BOX.v}{" "}
          <Text dimColor>{noSessionText}</Text>
          {" ".repeat(noSessionPadding)}
          {BOX.v}
        </Text>
        <Text>{createBottomLine(width)}</Text>
      </Box>
    );
  }

  // Active session - build activity log lines
  const lines: React.ReactElement[] = [];

  for (let i = 0; i < state.activities.length; i++) {
    const activity = state.activities[i];
    const { text: lineText, displayWidth } = formatActivityLine(activity, contentWidth);
    const padding = Math.max(0, contentWidth - displayWidth);

    // Determine color based on activity type
    const isFirst = i === 0;
    const color = isFirst ? undefined : "gray";

    lines.push(
      <Text key={`activity-${i}`}>
        {BOX.v}{" "}
        <Text color={color} dimColor={!isFirst}>
          {lineText}
        </Text>
        {" ".repeat(padding)}
        {BOX.v}
      </Text>
    );
  }

  // Add token count if available
  if (state.tokenCount > 0) {
    const tokenText = `${state.tokenCount.toLocaleString()} tokens`;
    const tokenPadding = Math.max(0, contentWidth - tokenText.length);
    lines.push(
      <Text key="tokens">
        {BOX.v}{" "}
        <Text dimColor>{tokenText}</Text>
        {" ".repeat(tokenPadding)}
        {BOX.v}
      </Text>
    );
  }

  return (
    <Box flexDirection="column" width={width}>
      <Text>{createTitleLine("Claude", titleSuffix, width)}</Text>
      {lines}
      <Text>{createBottomLine(width)}</Text>
    </Box>
  );
}
