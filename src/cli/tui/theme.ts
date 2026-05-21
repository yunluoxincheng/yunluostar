export const theme = {
  frame: "#5b6472",
  quiet: "#7f8896",
  title: "#e6f1ff",
  accent: "cyan",
  memory: "green",
  self: "magenta",
  goal: "yellow",
  world: "blue",
  error: "red",
  success: "green",
  warning: "yellow",
} as const;

export const CATEGORY_COLORS: Record<string, string> = {
  system: theme.accent,
  session: theme.goal,
  model: theme.accent,
  memory: theme.memory,
  goals: theme.goal,
  reflection: theme.world,
};
