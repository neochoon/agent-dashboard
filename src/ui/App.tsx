import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { GitPanel } from "./GitPanel.js";
import { PlanPanel } from "./PlanPanel.js";
import { TestPanel } from "./TestPanel.js";
import { WelcomePanel } from "./WelcomePanel.js";
import { getGitData, type GitData } from "../data/git.js";
import { getPlanDataWithConfig } from "../data/plan.js";
import { getTestData } from "../data/tests.js";
import { runTestCommand } from "../runner/command.js";
import { parseConfig, type Config } from "../config/parser.js";
import { PANEL_WIDTH } from "./constants.js";
import type { PlanData, TestData } from "../types/index.js";

interface AppProps {
  mode: "watch" | "once";
  agentDirExists?: boolean;
}

const REFRESH_INTERVAL = 5000; // 5 seconds
const REFRESH_SECONDS = REFRESH_INTERVAL / 1000;

function WelcomeApp(): React.ReactElement {
  return <WelcomePanel />;
}

function DashboardApp({ mode }: { mode: "watch" | "once" }): React.ReactElement {
  const { exit } = useApp();

  // Parse config once at startup
  const { config, warnings } = useMemo(() => parseConfig(), []);

  // Git data - uses config commands
  const [gitData, setGitData] = useState<GitData>(() => getGitData(config.panels.git));
  const refreshGit = useCallback(() => {
    setGitData(getGitData(config.panels.git));
  }, [config.panels.git]);

  // Plan data - uses config source
  const [planData, setPlanData] = useState<PlanData>(() => getPlanDataWithConfig(config.panels.plan));
  const refreshPlan = useCallback(() => {
    setPlanData(getPlanDataWithConfig(config.panels.plan));
  }, [config.panels.plan]);

  // Test data - uses config command or falls back to file
  const getTestDataFromConfig = useCallback((): TestData => {
    if (config.panels.tests.command) {
      return runTestCommand(config.panels.tests.command);
    }
    return getTestData();
  }, [config.panels.tests.command]);

  const [testData, setTestData] = useState<TestData>(() => getTestDataFromConfig());
  const refreshTest = useCallback(() => {
    setTestData(getTestDataFromConfig());
  }, [getTestDataFromConfig]);

  const [countdown, setCountdown] = useState(REFRESH_SECONDS);

  const refreshAll = useCallback(() => {
    if (config.panels.git.enabled) refreshGit();
    if (config.panels.plan.enabled) refreshPlan();
    if (config.panels.tests.enabled) refreshTest();
    setCountdown(REFRESH_SECONDS);
  }, [refreshGit, refreshPlan, refreshTest, config]);

  // Per-panel refresh timers
  useEffect(() => {
    if (mode !== "watch") return;

    const timers: NodeJS.Timeout[] = [];

    // Git panel timer
    if (config.panels.git.enabled && config.panels.git.interval !== null) {
      timers.push(setInterval(refreshGit, config.panels.git.interval));
    }

    // Plan panel timer
    if (config.panels.plan.enabled && config.panels.plan.interval !== null) {
      timers.push(setInterval(refreshPlan, config.panels.plan.interval));
    }

    // Tests panel timer (null = manual, no timer)
    if (config.panels.tests.enabled && config.panels.tests.interval !== null) {
      timers.push(setInterval(refreshTest, config.panels.tests.interval));
    }

    return () => timers.forEach((t) => clearInterval(t));
  }, [mode, config, refreshGit, refreshPlan, refreshTest]);

  // Countdown timer - use shortest interval for display
  useEffect(() => {
    if (mode !== "watch") return;

    const tick = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : REFRESH_SECONDS));
    }, 1000);
    return () => clearInterval(tick);
  }, [mode]);

  // Keyboard shortcuts
  useInput(
    (input) => {
      if (input === "q") {
        exit();
      }
      if (input === "r") {
        refreshAll();
      }
    },
    { isActive: mode === "watch" }
  );

  return (
    <Box flexDirection="column">
      {warnings.length > 0 && (
        <Box marginBottom={1}>
          <Text color="yellow">⚠ {warnings.join(", ")}</Text>
        </Box>
      )}
      {config.panels.git.enabled && (
        <Box>
          <GitPanel
            branch={gitData.branch}
            commits={gitData.commits}
            stats={gitData.stats}
            uncommitted={gitData.uncommitted}
          />
        </Box>
      )}
      {config.panels.plan.enabled && (
        <Box marginTop={config.panels.git.enabled ? 1 : 0}>
          <PlanPanel
            plan={planData.plan}
            decisions={planData.decisions}
            error={planData.error}
          />
        </Box>
      )}
      {config.panels.tests.enabled && (
        <Box marginTop={config.panels.git.enabled || config.panels.plan.enabled ? 1 : 0}>
          <TestPanel
            results={testData.results}
            isOutdated={testData.isOutdated}
            commitsBehind={testData.commitsBehind}
            error={testData.error}
          />
        </Box>
      )}
      {mode === "watch" && (
        <Box marginTop={1} width={PANEL_WIDTH}>
          <Text dimColor>
            ↻ {countdown}s · <Text color="cyan">q:</Text> quit · <Text color="cyan">r:</Text> refresh
          </Text>
        </Box>
      )}
    </Box>
  );
}

export function App({ mode, agentDirExists = true }: AppProps): React.ReactElement {
  if (!agentDirExists) {
    return <WelcomeApp />;
  }
  return <DashboardApp mode={mode} />;
}
