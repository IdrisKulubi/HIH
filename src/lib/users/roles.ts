export const USER_MANAGEMENT_ROLES = [
  "applicant",
  "admin",
  "technical_reviewer",
  "reviewer_1",
  "reviewer_2",
  "oversight",
  "a2f_officer",
  "a2f_committee",
  "mentor",
  "bds_edo",
  "investment_analyst",
  "mel",
  "redo",
] as const;

export type UserManagementRole = (typeof USER_MANAGEMENT_ROLES)[number];

export interface UserListItem {
  id: string;
  email: string;
  name: string | null;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: Date;
}
