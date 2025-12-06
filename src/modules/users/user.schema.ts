import { z } from "zod";

export const updateUserSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name cannot exceed 100 characters")
    .optional(),

  bio: z
    .string()
    .trim()
    .max(300, "Bio cannot be longer than 300 characters")
    .optional(),

  profileImage: z
    .string()
    .trim()
    .url("Profile image must be a valid URL")
    .optional(),

  travelInterests: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Interest cannot be empty")
        .max(50, "Interest too long")
    )
    .max(20, "Too many interests")
    .optional(),

  visitedCountries: z
    .array(
      z
        .string()
        .trim()
        .min(2, "Country name must have at least 2 characters")
        .max(60, "Country name too long")
    )
    .max(100, "Too many countries")
    .optional(),

  currentLocation: z
    .string()
    .trim()
    .min(2, "Location must be at least 2 characters")
    .max(100, "Location cannot exceed 100 characters")
    .optional()
});
export const changePasswordSchema = z
  .object({
    oldPassword: z
      .string()
      .min(6, "Old password must be at least 6 characters"),

    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(128, "New password too long")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  })
  .refine((data) => data.oldPassword !== data.newPassword, {
    message: "New password cannot be the same as old password",
    path: ["newPassword"]
  });
export const changeRoleSchema = z.object({
  role: z.enum(["USER", "ADMIN"]),
});