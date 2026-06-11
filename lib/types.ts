import type { Tables, Enums } from "@/lib/database.types";

export type Role = Enums<"user_role">;
export type Profile = Tables<"profiles">;

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrator",
  operations: "Operations",
  dispatch: "Dispatch",
  driver: "Driver",
  finance: "Finance",
  client: "Client",
};
