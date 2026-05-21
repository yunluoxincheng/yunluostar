export interface SlashCommandDefinition {
  name: string;
  aliases?: string[];
  description: string;
  category: "session" | "model" | "memory" | "goals" | "reflection" | "system";
  usage: string;
  readOnly: boolean;
  requiresArgument: boolean;
}

const COMMANDS: SlashCommandDefinition[] = [
  {
    name: "/help",
    description: "command map",
    category: "system",
    usage: "/help",
    readOnly: true,
    requiresArgument: false,
  },
  {
    name: "/exit",
    aliases: ["/quit"],
    description: "leave the shell",
    category: "system",
    usage: "/exit",
    readOnly: true,
    requiresArgument: false,
  },
  {
    name: "/model",
    description: "provider and model",
    category: "model",
    usage: "/model",
    readOnly: true,
    requiresArgument: false,
  },
  {
    name: "/config",
    description: "effective runtime config",
    category: "system",
    usage: "/config",
    readOnly: true,
    requiresArgument: false,
  },
  {
    name: "/status",
    aliases: ["/runtime"],
    description: "runtime connection state",
    category: "system",
    usage: "/status",
    readOnly: true,
    requiresArgument: false,
  },
  {
    name: "/login",
    description: "save runtime auth token",
    category: "system",
    usage: "/login <token>",
    readOnly: false,
    requiresArgument: true,
  },
  {
    name: "/logout",
    description: "remove runtime auth token",
    category: "system",
    usage: "/logout",
    readOnly: false,
    requiresArgument: false,
  },
  {
    name: "/permissions",
    description: "local tool permission policy",
    category: "system",
    usage: "/permissions",
    readOnly: true,
    requiresArgument: false,
  },
  {
    name: "/approve",
    description: "approve pending tool request",
    category: "system",
    usage: "/approve <tool-id>",
    readOnly: false,
    requiresArgument: true,
  },
  {
    name: "/deny",
    description: "deny pending tool request",
    category: "system",
    usage: "/deny <tool-id>",
    readOnly: false,
    requiresArgument: true,
  },
  {
    name: "/session",
    description: "show or switch session",
    category: "session",
    usage: "/session <id>",
    readOnly: false,
    requiresArgument: true,
  },
  {
    name: "/memory",
    description: "recent semantic memories",
    category: "memory",
    usage: "/memory",
    readOnly: true,
    requiresArgument: false,
  },
  {
    name: "/self",
    description: "active self model",
    category: "memory",
    usage: "/self",
    readOnly: true,
    requiresArgument: false,
  },
  {
    name: "/goals",
    description: "active goals",
    category: "goals",
    usage: "/goals",
    readOnly: true,
    requiresArgument: false,
  },
  {
    name: "/reflections",
    description: "recent reflections",
    category: "reflection",
    usage: "/reflections",
    readOnly: true,
    requiresArgument: false,
  },
  {
    name: "/wm",
    description: "current working memory",
    category: "memory",
    usage: "/wm",
    readOnly: true,
    requiresArgument: false,
  },
];

export function getAllCommands(): readonly SlashCommandDefinition[] {
  return COMMANDS;
}

export function findCommand(name: string): SlashCommandDefinition | undefined {
  const lower = name.toLowerCase();
  return COMMANDS.find(
    (cmd) =>
      cmd.name === lower ||
      (cmd.aliases && cmd.aliases.some((a) => a === lower)),
  );
}

export function isKnownCommand(name: string): boolean {
  return findCommand(name) !== undefined;
}

export function suggestSimilar(
  input: string,
  maxResults = 3,
): SlashCommandDefinition[] {
  const lower = input.toLowerCase();
  const scored = COMMANDS.map((cmd) => {
    const names = [cmd.name, ...(cmd.aliases ?? [])];
    let bestScore = 0;
    for (const n of names) {
      if (n.startsWith(lower)) {
        bestScore = Math.max(bestScore, 10 - (n.length - lower.length));
      } else if (n.includes(lower.slice(1))) {
        bestScore = Math.max(bestScore, 3);
      }
    }
    if (cmd.description.toLowerCase().includes(lower.slice(1))) {
      bestScore = Math.max(bestScore, 1);
    }
    return { cmd, score: bestScore };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((s) => s.cmd);
  return scored;
}
