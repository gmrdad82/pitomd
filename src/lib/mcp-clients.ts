export interface McpChip {
  name: string;
  door: string;
}

export const MCP_ROW_ONE: McpChip[] = [
  { name: "Claude Code", door: "HTTP + stdio" },
  { name: "Gemini CLI", door: "HTTP + stdio" },
  { name: "Codex CLI", door: "HTTP + stdio" },
  { name: "Cursor", door: "HTTP + stdio" },
];

export const MCP_ROW_TWO: McpChip[] = [
  { name: "VS Code Copilot", door: "HTTP + stdio" },
  { name: "Windsurf", door: "HTTP + stdio" },
  { name: "Zed", door: "HTTP + stdio" },
  { name: "Claude Desktop", door: "stdio" },
  { name: "ChatGPT", door: "via your tunnel" },
];

export const MCP_ALL: McpChip[] = [...MCP_ROW_ONE, ...MCP_ROW_TWO];
