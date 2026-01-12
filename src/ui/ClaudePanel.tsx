import React from "react";
import { Box, Text } from "ink";
import type { ClaudeData, ClaudeSessionStatus } from "../types/index.js";
import {
  DEFAULT_PANEL_WIDTH,
  BOX,
  createTitleLine,
  createBottomLine,
  getInnerWidth,
  truncate,
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

function formatTime(date: Date | null): string {
  if (!date) return "";
  return date.toTimeString().slice(0, 5);
}

function formatElapsed(timestamp: Date | null): string {
  if (!timestamp) return "";
  const elapsed = Date.now() - timestamp.getTime();
  const seconds = Math.floor(elapsed / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
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
  const timeStr = formatTime(state.lastTimestamp);

  // Build title suffix: icon + time or countdown
  let titleSuffix = countdownSuffix;
  if (state.status !== "none" && statusIcon && timeStr) {
    titleSuffix = `${statusIcon} ${timeStr}`;
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
  if (state.status === "none") {
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

  // Active session - build content lines
  const lines: React.ReactElement[] = [];

  // Line 1: Last user message (quoted)
  if (state.lastUserMessage) {
    const maxMessageLen = contentWidth - 2; // Account for quotes
    const truncatedMessage = truncate(state.lastUserMessage, maxMessageLen);
    const quotedMessage = `"${truncatedMessage}"`;
    const messagePadding = Math.max(0, contentWidth - quotedMessage.length);

    lines.push(
      <Text key="message">
        {BOX.v}{" "}
        <Text>{quotedMessage}</Text>
        {" ".repeat(messagePadding)}
        {BOX.v}
      </Text>
    );
  }

  // Line 2: Current action (for running) or completion info (for completed)
  if (state.status === "running" && state.currentAction) {
    const actionText = `→ ${state.currentAction}`;
    const truncatedAction = truncate(actionText, contentWidth);
    const actionPadding = Math.max(0, contentWidth - truncatedAction.length);

    lines.push(
      <Text key="action">
        {BOX.v}{" "}
        <Text dimColor>{truncatedAction}</Text>
        {" ".repeat(actionPadding)}
        {BOX.v}
      </Text>
    );
  } else if (state.status === "completed" || state.status === "idle") {
    const elapsed = formatElapsed(state.lastTimestamp);
    const tokenText = state.tokenCount > 0 ? `${state.tokenCount} tokens` : "";

    let completionParts: string[] = ["✓ Completed"];
    if (tokenText) completionParts.push(tokenText);
    if (elapsed) completionParts.push(elapsed);

    const completionText = completionParts.join(" · ");
    const completionPadding = Math.max(0, contentWidth - completionText.length);

    lines.push(
      <Text key="completion">
        {BOX.v}{" "}
        <Text dimColor>{completionText}</Text>
        {" ".repeat(completionPadding)}
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
