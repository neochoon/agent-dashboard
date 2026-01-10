import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { GitPanel } from "./GitPanel.js";
import { PlanPanel } from "./PlanPanel.js";
import { TestPanel } from "./TestPanel.js";
import { GenericPanel } from "./GenericPanel.js";
import { WelcomePanel } from "./WelcomePanel.js";
import { getGitData, type GitData } from "../data/git.js";
import { getPlanDataWithConfig } from "../data/plan.js";
import { getTestData } from "../data/tests.js";
import { getCustomPanelData, type CustomPanelResult } from "../data/custom.js";
import { runTestCommand } from "../runner/command.js";
import { parseConfig, type Config, type CustomPanelConfig } from "../config/parser.js";
import type { PlanData, TestData, GenericPanelRenderer } from "../types/index.js";

interface AppProps {
  mode: "watch" | "once";
  agentDirExists?: boolean;
}

interface PanelCountdowns {
  git: number | null;
  plan: number | null;
  [key: string]: number | null; // custom panels
}

interface Hotkey {
  key: string;
  label: string;
  action: () => void;
}

// Generate hotkeys for manual panels
function generateHotkeys(
  config: Config,
  actions: {
    tests?: () => void;
    customPanels?: Record<string, () => void>;
  }
): Hotkey[] {
  const hotkeys: Hotkey[] = [];
  const usedKeys = new Set<string>(["r", "q"]); // reserved

  // Tests panel - manual by default
  if (config.panels.tests.enabled && config.panels.tests.interval === null && actions.tests) {
    const name = "tests";
    for (const char of name.toLowerCase()) {
      if (!usedKeys.has(char)) {
        usedKeys.add(char);
        hotkeys.push({
          key: char,
          label: "run tests",
          action: actions.tests,
        });
        break;
      }
    }
  }

  // Custom panels with manual interval
  if (config.customPanels && actions.customPanels) {
    for (const [name, panelConfig] of Object.entries(config.customPanels)) {
      if (panelConfig.enabled && panelConfig.interval === null && actions.customPanels[name]) {
        for (const char of name.toLowerCase()) {
          if (!usedKeys.has(char)) {
            usedKeys.add(char);
            hotkeys.push({
              key: char,
              label: `run ${name}`,
              action: actions.customPanels[name],
            });
            break;
          }
        }
      }
    }
  }

  return hotkeys;
}

function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function WelcomeApp(): React.ReactElement {
  return <WelcomePanel />;
}

function DashboardApp({ mode }: { mode: "watch" | "once" }): React.ReactElement {
  const { exit } = useApp();

  // Parse config once at startup
  const { config, warnings } = useMemo(() => parseConfig(), []);

  // Calculate interval in seconds for display
  const gitIntervalSeconds = config.panels.git.interval ? config.panels.git.interval / 1000 : null;
  const planIntervalSeconds = config.panels.plan.interval ? config.panels.plan.interval / 1000 : null;

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

  // Custom panel data
  const customPanelNames = useMemo(
    () => Object.keys(config.customPanels || {}),
    [config.customPanels]
  );

  const [customPanelData, setCustomPanelData] = useState<Record<string, CustomPanelResult>>(() => {
    const data: Record<string, CustomPanelResult> = {};
    if (config.customPanels) {
      for (const [name, panelConfig] of Object.entries(config.customPanels)) {
        if (panelConfig.enabled) {
          data[name] = getCustomPanelData(name, panelConfig);
        }
      }
    }
    return data;
  });

  const refreshCustomPanel = useCallback(
    (name: string) => {
      if (config.customPanels && config.customPanels[name]) {
        setCustomPanelData((prev) => ({
          ...prev,
          [name]: getCustomPanelData(name, config.customPanels![name]),
        }));
      }
    },
    [config.customPanels]
  );

  // Build custom panel refresh actions for hotkeys
  const customPanelActions = useMemo(() => {
    const actions: Record<string, () => void> = {};
    for (const name of customPanelNames) {
      actions[name] = () => refreshCustomPanel(name);
    }
    return actions;
  }, [customPanelNames, refreshCustomPanel]);

  // Per-panel countdowns
  const initialCountdowns = useMemo(() => {
    const countdowns: PanelCountdowns = {
      git: gitIntervalSeconds,
      plan: planIntervalSeconds,
    };
    if (config.customPanels) {
      for (const [name, panelConfig] of Object.entries(config.customPanels)) {
        countdowns[name] = panelConfig.interval ? panelConfig.interval / 1000 : null;
      }
    }
    return countdowns;
  }, [gitIntervalSeconds, planIntervalSeconds, config.customPanels]);

  const [countdowns, setCountdowns] = useState<PanelCountdowns>(initialCountdowns);

  const refreshAll = useCallback(() => {
    if (config.panels.git.enabled) {
      refreshGit();
      setCountdowns((prev) => ({ ...prev, git: gitIntervalSeconds }));
    }
    if (config.panels.plan.enabled) {
      refreshPlan();
      setCountdowns((prev) => ({ ...prev, plan: planIntervalSeconds }));
    }
    if (config.panels.tests.enabled) {
      refreshTest();
    }
    // Refresh custom panels
    for (const name of customPanelNames) {
      if (config.customPanels![name].enabled) {
        refreshCustomPanel(name);
        const interval = config.customPanels![name].interval;
        setCountdowns((prev) => ({
          ...prev,
          [name]: interval ? interval / 1000 : null,
        }));
      }
    }
  }, [
    refreshGit,
    refreshPlan,
    refreshTest,
    refreshCustomPanel,
    config,
    gitIntervalSeconds,
    planIntervalSeconds,
    customPanelNames,
  ]);

  // Generate hotkeys for manual panels
  const hotkeys = useMemo(
    () => generateHotkeys(config, { tests: refreshTest, customPanels: customPanelActions }),
    [config, refreshTest, customPanelActions]
  );

  // Per-panel refresh timers
  useEffect(() => {
    if (mode !== "watch") return;

    const timers: NodeJS.Timeout[] = [];

    // Git panel timer
    if (config.panels.git.enabled && config.panels.git.interval !== null) {
      timers.push(
        setInterval(() => {
          refreshGit();
          setCountdowns((prev) => ({ ...prev, git: gitIntervalSeconds }));
        }, config.panels.git.interval)
      );
    }

    // Plan panel timer
    if (config.panels.plan.enabled && config.panels.plan.interval !== null) {
      timers.push(
        setInterval(() => {
          refreshPlan();
          setCountdowns((prev) => ({ ...prev, plan: planIntervalSeconds }));
        }, config.panels.plan.interval)
      );
    }

    // Tests panel timer (null = manual, no timer)
    if (config.panels.tests.enabled && config.panels.tests.interval !== null) {
      timers.push(setInterval(refreshTest, config.panels.tests.interval));
    }

    // Custom panel timers
    if (config.customPanels) {
      for (const [name, panelConfig] of Object.entries(config.customPanels)) {
        if (panelConfig.enabled && panelConfig.interval !== null) {
          const intervalSeconds = panelConfig.interval / 1000;
          timers.push(
            setInterval(() => {
              refreshCustomPanel(name);
              setCountdowns((prev) => ({ ...prev, [name]: intervalSeconds }));
            }, panelConfig.interval)
          );
        }
      }
    }

    return () => timers.forEach((t) => clearInterval(t));
  }, [
    mode,
    config,
    refreshGit,
    refreshPlan,
    refreshTest,
    refreshCustomPanel,
    gitIntervalSeconds,
    planIntervalSeconds,
  ]);

  // Countdown ticker - decrements every second
  useEffect(() => {
    if (mode !== "watch") return;

    const tick = setInterval(() => {
      setCountdowns((prev) => {
        const next: PanelCountdowns = {
          git: prev.git !== null && prev.git > 1 ? prev.git - 1 : prev.git,
          plan: prev.plan !== null && prev.plan > 1 ? prev.plan - 1 : prev.plan,
        };
        // Decrement custom panel countdowns
        for (const name of customPanelNames) {
          next[name] = prev[name] !== null && prev[name]! > 1 ? prev[name]! - 1 : prev[name];
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [mode, customPanelNames]);

  // Keyboard shortcuts
  useInput(
    (input) => {
      if (input === "q") {
        exit();
      }
      if (input === "r") {
        refreshAll();
      }
      // Handle dynamic hotkeys
      for (const hotkey of hotkeys) {
        if (input === hotkey.key) {
          hotkey.action();
          break;
        }
      }
    },
    { isActive: mode === "watch" }
  );

  // Build status bar content
  const statusBarItems: string[] = [];
  for (const hotkey of hotkeys) {
    statusBarItems.push(`${hotkey.key}: ${hotkey.label}`);
  }
  statusBarItems.push("r: refresh");
  statusBarItems.push("q: quit");

  return (
    <Box flexDirection="column">
      {warnings.length > 0 && (
        <Box marginBottom={1}>
          <Text color="yellow">⚠ {warnings.join(", ")}</Text>
        </Box>
      )}
      {config.panelOrder.map((panelName, index) => {
        const isFirst = index === 0;

        // Git panel
        if (panelName === "git" && config.panels.git.enabled) {
          return (
            <Box key="git" marginTop={isFirst ? 0 : 1}>
              <GitPanel
                branch={gitData.branch}
                commits={gitData.commits}
                stats={gitData.stats}
                uncommitted={gitData.uncommitted}
                countdown={mode === "watch" ? countdowns.git : null}
                width={config.width}
              />
            </Box>
          );
        }

        // Plan panel
        if (panelName === "plan" && config.panels.plan.enabled) {
          return (
            <Box key="plan" marginTop={isFirst ? 0 : 1}>
              <PlanPanel
                plan={planData.plan}
                decisions={planData.decisions}
                error={planData.error}
                countdown={mode === "watch" ? countdowns.plan : null}
                width={config.width}
              />
            </Box>
          );
        }

        // Tests panel
        if (panelName === "tests" && config.panels.tests.enabled) {
          return (
            <Box key="tests" marginTop={isFirst ? 0 : 1}>
              <TestPanel
                results={testData.results}
                isOutdated={testData.isOutdated}
                commitsBehind={testData.commitsBehind}
                error={testData.error}
                width={config.width}
              />
            </Box>
          );
        }

        // Custom panel
        const customConfig = config.customPanels?.[panelName];
        if (customConfig && customConfig.enabled) {
          const result = customPanelData[panelName];
          if (!result) return null;

          const isManual = customConfig.interval === null;
          const relativeTime = isManual ? formatRelativeTime(result.timestamp) : undefined;
          const countdown = !isManual && mode === "watch" ? countdowns[panelName] : null;

          return (
            <Box key={panelName} marginTop={isFirst ? 0 : 1}>
              <GenericPanel
                data={result.data}
                renderer={customConfig.renderer}
                countdown={countdown}
                relativeTime={relativeTime}
                error={result.error}
                width={config.width}
              />
            </Box>
          );
        }

        return null;
      })}
      {mode === "watch" && (
        <Box marginTop={1} width={config.width}>
          <Text dimColor>
            {statusBarItems.map((item, index) => (
              <React.Fragment key={index}>
                {index > 0 && " · "}
                <Text color="cyan">{item.split(":")[0]}:</Text>
                {item.split(":").slice(1).join(":")}
              </React.Fragment>
            ))}
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
