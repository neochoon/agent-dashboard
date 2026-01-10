export interface Commit {
  hash: string;
  message: string;
  timestamp: Date;
}

export interface GitStats {
  added: number;
  deleted: number;
}

export interface PlanStep {
  step: string;
  status: "done" | "in-progress" | "pending";
}

export interface Plan {
  goal: string;
  updatedAt?: string;
  steps: PlanStep[];
}

export interface Decision {
  timestamp: string;
  decision: string;
  reason?: string;
}

export interface PlanData {
  plan: Plan | null;
  decisions: Decision[];
  error?: string;
}

export interface TestFailure {
  file: string;
  name: string;
}

export interface TestResults {
  hash: string;
  timestamp: string;
  passed: number;
  failed: number;
  skipped: number;
  failures: TestFailure[];
}

export interface TestData {
  results: TestResults | null;
  isOutdated: boolean;
  commitsBehind: number;
  error?: string;
}
