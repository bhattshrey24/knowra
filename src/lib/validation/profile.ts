import { z } from "zod";

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Display name cannot be empty")
    .max(50, "Display name must be at most 50 characters"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
