/** Subscription plan module identifiers — shared between sidebar, subscription store, and plan cards. */
export const PLAN_MODULES = {
  TRAINING: "TRAINING",
  RENTAL: "RENTAL",
  EVENTS: "EVENTS",
  FINANCE: "FINANCE",
  OPERATIONS: "OPERATIONS",
  LEADS: "LEADS",
} as const;

export type PlanModuleName = (typeof PLAN_MODULES)[keyof typeof PLAN_MODULES];

/** Human-readable labels for each module. */
export const MODULE_LABELS: Record<PlanModuleName, string> = {
  TRAINING: "Training",
  RENTAL: "Rental",
  EVENTS: "Events",
  FINANCE: "Finance",
  OPERATIONS: "Operations",
  LEADS: "Leads",
};

/** Which sidebar nav section labels map to which module. */
export const SIDEBAR_MODULE_MAP: Record<string, PlanModuleName> = {
  Training: "TRAINING",
  Rental: "RENTAL",
  Events: "EVENTS",
  Finance: "FINANCE",
  Operations: "OPERATIONS",
  Leads: "LEADS",
};
