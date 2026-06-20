import { z } from "zod";

export const eventIntakeSchema = z.object({
  title: z.string().min(1),
  categoryId: z.string().min(1),
  subtype: z.string().min(1),
  scaleTierId: z.string().min(1),
  city: z.string().min(1),
  expectedPax: z.number().int().nonnegative(),
  budgetAmount: z.number().nonnegative(),
  objective: z.string().min(1)
});

export type EventIntakeInput = z.infer<typeof eventIntakeSchema>;

