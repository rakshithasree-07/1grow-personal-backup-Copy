/** Business industry identifiers stored on a tenant (multi-select). */
export const INDUSTRIES = ["TRAINING", "RENTAL", "EVENT"] as const;

export type Industry = (typeof INDUSTRIES)[number];

/** Human-readable labels for each industry. */
export const INDUSTRY_LABELS: Record<Industry, string> = {
  TRAINING: "Training",
  RENTAL: "Rental",
  EVENT: "Events",
};

/** Which sidebar nav section labels map to which industry. */
export const INDUSTRY_NAV_MAP: Record<string, Industry> = {
  Training: "TRAINING",
  Rental: "RENTAL",
  Events: "EVENT",
};

export function isIndustryActive(
  industries: string[] | undefined,
  industry: Industry,
): boolean {
  return Array.isArray(industries) && industries.includes(industry);
}
