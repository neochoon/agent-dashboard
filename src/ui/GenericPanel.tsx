import React from "react";
import { Box, Text } from "ink";
import type { GenericPanelData, GenericPanelRenderer } from "../types/index.js";
import { PANEL_WIDTH, CONTENT_WIDTH, INNER_WIDTH, BOX, createTitleLine, createBottomLine, padLine, truncate } from "./constants.js";

interface GenericPanelProps {
  data: GenericPanelData;
  renderer?: GenericPanelRenderer;
  countdown?: number | null;
  relativeTime?: string;
  error?: string;
}

const PROGRESS_BAR_WIDTH = 10;

function createProgressBar(done: number, total: number): string {
  if (total === 0) return "░".repeat(PROGRESS_BAR_WIDTH);
  const filled = Math.round((done / total) * PROGRESS_BAR_WIDTH);
  const empty = PROGRESS_BAR_WIDTH - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

function formatTitleSuffix(countdown?: number | null, relativeTime?: string): string {
  if (countdown != null) return `↻ ${countdown}s`;
  if (relativeTime) return relativeTime;
  return "";
}

// Create progress title line: "┌─ Title ─────────── 7/10 ███████░░░ · ↻ 8s ─┐"
function createProgressTitleLine(
  title: string,
  done: number,
  total: number,
  countdown?: number | null,
  relativeTime?: string
): string {
  const label = ` ${title} `;
  const count = ` ${done}/${total} `;
  const bar = createProgressBar(done, total);
  const suffix = formatTitleSuffix(countdown, relativeTime);
  const suffixPart = suffix ? ` · ${suffix} ` + BOX.h : "";

  const dashCount = PANEL_WIDTH - 3 - label.length - count.length - bar.length - suffixPart.length;
  const dashes = BOX.h.repeat(Math.max(0, dashCount));
  return BOX.tl + BOX.h + label + dashes + count + bar + suffixPart + BOX.tr;
}

function StatusIcon({ status }: { status?: string }): React.ReactElement {
  switch (status) {
    case "done":
      return <Text color="green">✓</Text>;
    case "failed":
      return <Text color="red">✗</Text>;
    default:
      return <Text dimColor>○</Text>;
  }
}

function ListRenderer({ data }: { data: GenericPanelData }): React.ReactElement {
  const items = data.items || [];

  if (items.length === 0 && !data.summary) {
    return <Text>{BOX.v}<Text dimColor>{padLine(" No data")}</Text>{BOX.v}</Text>;
  }

  return (
    <>
      {data.summary && (
        <Text>{BOX.v}{padLine(" " + truncate(data.summary, CONTENT_WIDTH))}{BOX.v}</Text>
      )}
      {items.map((item, index) => (
        <Text key={index}>{BOX.v}{padLine(" • " + truncate(item.text, CONTENT_WIDTH - 3))}{BOX.v}</Text>
      ))}
      {items.length === 0 && data.summary && null}
    </>
  );
}

function ProgressRenderer({ data }: { data: GenericPanelData }): React.ReactElement {
  const items = data.items || [];

  return (
    <>
      {data.summary && (
        <Text>{BOX.v}{padLine(" " + truncate(data.summary, CONTENT_WIDTH))}{BOX.v}</Text>
      )}
      {items.map((item, index) => {
        const icon = item.status === "done" ? "✓" : item.status === "failed" ? "✗" : "○";
        const line = ` ${icon} ${truncate(item.text, CONTENT_WIDTH - 3)}`;
        return (
          <Text key={index}>{BOX.v}{padLine(line)}{BOX.v}</Text>
        );
      })}
      {items.length === 0 && !data.summary && (
        <Text>{BOX.v}<Text dimColor>{padLine(" No data")}</Text>{BOX.v}</Text>
      )}
    </>
  );
}

function StatusRenderer({ data }: { data: GenericPanelData }): React.ReactElement {
  const stats = data.stats || { passed: 0, failed: 0 };
  const items = data.items?.filter(i => i.status === "failed") || [];

  // Calculate summary line length for padding
  let summaryLength = 1 + 2 + String(stats.passed).length + " passed".length; // " ✓ X passed"
  if (stats.failed > 0) {
    summaryLength += 2 + 2 + String(stats.failed).length + " failed".length;
  }
  if (stats.skipped && stats.skipped > 0) {
    summaryLength += 2 + 2 + String(stats.skipped).length + " skipped".length;
  }
  const summaryPadding = Math.max(0, INNER_WIDTH - summaryLength);

  return (
    <>
      {data.summary && (
        <Text>{BOX.v}{padLine(" " + truncate(data.summary, CONTENT_WIDTH))}{BOX.v}</Text>
      )}
      <Text>
        {BOX.v}{" "}
        <Text color="green">✓ {stats.passed} passed</Text>
        {stats.failed > 0 && (
          <>
            {"  "}
            <Text color="red">✗ {stats.failed} failed</Text>
          </>
        )}
        {stats.skipped && stats.skipped > 0 && (
          <>
            {"  "}
            <Text dimColor>○ {stats.skipped} skipped</Text>
          </>
        )}
        {" ".repeat(summaryPadding)}{BOX.v}
      </Text>
      {items.length > 0 && items.map((item, index) => (
        <Text key={index}>{BOX.v}{padLine(" • " + truncate(item.text, CONTENT_WIDTH - 3))}{BOX.v}</Text>
      ))}
    </>
  );
}

export function GenericPanel({
  data,
  renderer = "list",
  countdown,
  relativeTime,
  error,
}: GenericPanelProps): React.ReactElement {
  const suffix = formatTitleSuffix(countdown, relativeTime);
  const progress = data.progress || { done: 0, total: 0 };

  // Error state
  if (error) {
    return (
      <Box flexDirection="column" width={PANEL_WIDTH}>
        <Text>{createTitleLine(data.title, suffix)}</Text>
        <Text>{BOX.v}<Text dimColor>{padLine(" " + error)}</Text>{BOX.v}</Text>
        <Text>{createBottomLine()}</Text>
      </Box>
    );
  }

  // Progress renderer has special title with progress bar
  if (renderer === "progress") {
    return (
      <Box flexDirection="column" width={PANEL_WIDTH}>
        <Text>{createProgressTitleLine(data.title, progress.done, progress.total, countdown, relativeTime)}</Text>
        <ProgressRenderer data={data} />
        <Text>{createBottomLine()}</Text>
      </Box>
    );
  }

  // List and Status renderers use standard title
  return (
    <Box flexDirection="column" width={PANEL_WIDTH}>
      <Text>{createTitleLine(data.title, suffix)}</Text>
      {renderer === "status" ? <StatusRenderer data={data} /> : <ListRenderer data={data} />}
      <Text>{createBottomLine()}</Text>
    </Box>
  );
}
