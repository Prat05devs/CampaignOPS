import { OrganizationRole } from "@prisma/client";

export type AuthenticatedUser = {
  sub: string;
  email: string;
  organizationId: string;
  role: OrganizationRole;
};

