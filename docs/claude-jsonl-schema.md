# Claude Code JSONL Schema

Claude Code stores session data in JSONL (JSON Lines) format. Each line is a valid JSON object.

## File Locations

```
~/.claude/projects/{encoded-path}/
├── {session-id}.jsonl              # Main session
└── {session-id}/
    └── subagents/
        └── {subagent-id}.jsonl     # Subagent sessions
```

- `{encoded-path}`: Project path with `/` replaced by `-` (e.g., `-Users-neo-myproject`)
- `{session-id}`: UUID format (e.g., `521e822b-39cb-49ef-8bbf-16926f1def86`)

## Schema

Main session and subagent files use the **same schema**.

### Entry Types

Each line is one of three entry types:

```typescript
type JsonlEntry = UserEntry | AssistantEntry | SystemEntry;
```

---

### 1. UserEntry

User message or tool result.

```typescript
interface UserEntry {
  type: "user";
  timestamp: string;              // ISO 8601 (e.g., "2025-01-15T10:30:00.000Z")
  message: {
    role: "user";
    content: string | ContentBlock[];
  };
  toolUseResult?: {
    newTodos?: TodoItem[];        // Updated todo list after TodoWrite
  };
}

interface TodoItem {
  content: string;                // Task description
  status: "pending" | "in_progress" | "completed";
  activeForm: string;             // Present tense form (e.g., "Running tests")
}
```

---

### 2. AssistantEntry

Claude's response including text and tool calls.

```typescript
interface AssistantEntry {
  type: "assistant";
  timestamp: string;
  message: {
    content: ContentBlock[];
    usage?: TokenUsage;
  };
}

interface ContentBlock {
  type: "text" | "tool_use";

  // For type: "text"
  text?: string;

  // For type: "tool_use"
  id?: string;                    // Tool call ID
  name?: string;                  // Tool name (Read, Edit, Bash, etc.)
  input?: ToolInput;
}

interface ToolInput {
  command?: string;               // Bash command
  file_path?: string;             // Read/Edit/Write target
  pattern?: string;               // Glob/Grep pattern
  query?: string;                 // WebSearch query
  // ... other tool-specific fields
}

interface TokenUsage {
  input_tokens?: number;
  cache_read_input_tokens?: number;
  output_tokens?: number;
}
```

---

### 3. SystemEntry

System events (session start, init, summary, etc.)

```typescript
interface SystemEntry {
  type: "system";
  timestamp: string;
  subtype?: string;               // "init", "summary", etc.
}
```

---

## Tool Names

Common tool names found in `AssistantEntry.message.content[].name`:

| Tool | Description |
|------|-------------|
| `Read` | Read file content |
| `Edit` | Edit file (find & replace) |
| `Write` | Create/overwrite file |
| `Bash` | Execute shell command |
| `Glob` | Find files by pattern |
| `Grep` | Search file contents |
| `WebFetch` | Fetch URL content |
| `WebSearch` | Web search |
| `Task` | Spawn subagent |
| `TodoWrite` | Update todo list |
| `AskUserQuestion` | Ask user for input |

---

## Example

```jsonl
{"type":"system","subtype":"init","timestamp":"2025-01-15T10:00:00.000Z"}
{"type":"user","message":{"role":"user","content":"Fix the bug in auth.ts"},"timestamp":"2025-01-15T10:00:01.000Z"}
{"type":"assistant","message":{"content":[{"type":"text","text":"I'll look at auth.ts first."},{"type":"tool_use","id":"t1","name":"Read","input":{"file_path":"/src/auth.ts"}}],"usage":{"input_tokens":1500,"output_tokens":50}},"timestamp":"2025-01-15T10:00:02.000Z"}
{"type":"user","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"t1","content":"...file contents..."}]},"timestamp":"2025-01-15T10:00:03.000Z"}
```

---

## Notes

- Files are append-only during a session
- Lines are ordered chronologically by `timestamp`
- Total tokens = sum of all `usage.input_tokens + cache_read_input_tokens + output_tokens`
- Subagent tokens should be added to parent session total for accurate count
