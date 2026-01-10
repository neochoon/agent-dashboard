export interface CliOptions {
  mode: "watch" | "once";
}

// Dependency injection for testing
type ClearFn = () => void;
let clearFn: ClearFn = () => console.clear();

export function setClearFn(fn: ClearFn): void {
  clearFn = fn;
}

export function resetClearFn(): void {
  clearFn = () => console.clear();
}

export function clearScreen(): void {
  clearFn();
}

export function parseArgs(args: string[]): CliOptions {
  const hasOnce = args.includes("--once");
  const hasWatch = args.includes("--watch") || args.includes("-w");

  // --once takes precedence
  if (hasOnce) {
    return { mode: "once" };
  }

  // Default is watch mode
  return { mode: "watch" };
}
