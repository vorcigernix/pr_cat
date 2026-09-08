import { z } from 'zod';

export const DASHBOARD_TIME_RANGES = ['7d', '14d', '30d', '90d'] as const;
export type DashboardTimeRange = typeof DASHBOARD_TIME_RANGES[number];

export const dashboardFiltersSchema = z.object({
  teamId: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
  repositoryId: z.string().max(32).regex(/^(?:[1-9]\d*|demo-repo-[1-9]\d*)$/).refine(value => value.startsWith('demo-repo-') || Number.isSafeInteger(Number(value))).optional(),
  timeRange: z.enum(DASHBOARD_TIME_RANGES).default('14d'),
});
