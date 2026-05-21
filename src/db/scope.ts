export interface DataScope {
  userId: string;
  workspaceId: string;
}

export const DEFAULT_DATA_SCOPE: DataScope = {
  userId: "local-user",
  workspaceId: "default-workspace",
};

export function withScope<T extends Record<string, unknown>>(values: T, scope?: DataScope): T & DataScope {
  return {
    ...values,
    userId: scope?.userId ?? DEFAULT_DATA_SCOPE.userId,
    workspaceId: scope?.workspaceId ?? DEFAULT_DATA_SCOPE.workspaceId,
  };
}
