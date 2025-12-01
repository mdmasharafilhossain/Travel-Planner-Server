import { z } from "zod";

export const updateUserSchema = z.object({
  fullName: z.string().optional(),
  bio: z.string().optional(),
  profileImage: z.string().optional(),
  travelInterests: z.array(z.string()).optional(),
  visitedCountries: z.array(z.string()).optional(),
  currentLocation: z.string().optional()
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(6),
  newPassword: z.string().min(6)
});
