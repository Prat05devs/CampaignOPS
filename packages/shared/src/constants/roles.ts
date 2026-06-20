export const MVP_ROLES = ["admin", "manager", "member"] as const;

export type MvpRole = (typeof MVP_ROLES)[number];

