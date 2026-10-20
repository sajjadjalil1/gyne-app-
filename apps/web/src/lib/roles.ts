import type { Role } from "@gyne/db";

/** Who may do what on the dashboard. The server enforces this; the UI only hides what a role cannot use. */
export const CLINICAL: Role[] = ["DOCTOR", "NURSE"];
export const PRESCRIBERS: Role[] = ["DOCTOR"];
export const FRONT_DESK: Role[] = ["DOCTOR", "NURSE", "RECEPTION"];

/** Where each staff role lands after login or when it opens a page it may not see. */
export const homeFor = (role: Role) => (role === "RECEPTION" ? "/doctor/appointments" : "/doctor");
