import { z } from "zod";

export const createPlanSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "Title must be at least 2 characters")
      .max(100, "Title cannot exceed 100 characters")
      .optional(),

    destination: z
      .string()
      .trim()
      .min(2, "Destination must be at least 2 characters"),

    startDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid start date format",
      }),

    endDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid end date format",
      }),

    budgetMin: z
      .number()
      .int()
      .nonnegative("Minimum budget cannot be negative")
      .optional(),

    budgetMax: z
      .number()
      .int()
      .nonnegative("Maximum budget cannot be negative")
      .optional(),

    travelType: z.enum(["SOLO", "FAMILY", "FRIENDS", "COUPLE", "GROUP"], {
      message: "Invalid travel type",
    }),

    description: z
      .string()
      .trim()
      .max(500, "Description cannot exceed 500 characters")
      .optional(),

    visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
  })


  .refine((data) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return end >= start;
  }, {
    message: "End date must be after or equal to start date",
    path: ["endDate"],
  })

  .refine((data) => {
    if (data.budgetMin != null && data.budgetMax != null) {
      return data.budgetMin <= data.budgetMax;
    }
    return true;
  }, {
    message: "Minimum budget cannot be greater than maximum budget",
    path: ["budgetMin"],
  });

  export const updatePlanSchema = createPlanSchema
  .partial()
  .refine(
    (data) => {
      
      if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        return end >= start;
      }
      return true;
    },
    {
      message: "End date must be after or equal to start date",
      path: ["endDate"],
    }
  )
  .refine(
    (data) => {
      if (data.budgetMin != null && data.budgetMax != null) {
        return data.budgetMin <= data.budgetMax;
      }
      return true;
    },
    {
      message: "Minimum budget cannot be greater than maximum budget",
      path: ["budgetMin"],
    }
  );
