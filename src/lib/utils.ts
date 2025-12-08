import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { z } from "zod";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatZodErrors = (errors: z.ZodIssue[]): string => {
  const errorMessages = errors.map((issue) => {
    const fieldName = issue.path.join(" ");
    return `* ${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}: ${
      issue.message
    }`;
  });
  return `Please correct the following issues:\n${errorMessages.join("\n")}`;
};

export const safeToDate = (date: string | Date | undefined | null): Date | null => {
  if (!date) return null;
  
  try {
    const d = new Date(date);
    // Check if the date is valid
    if (isNaN(d.getTime())) {
      return null;
    }
    return d;
  } catch (error) {
    console.error("Failed to convert to Date:", error);
    return null;
  }
};



/**
 * Safely converts a value to a Date object
 * @param value - The value to convert (string, Date, or other)
 * @returns Date object or null if conversion fails
 */


/**
 * Generates a random 6-digit verification code.
 * @returns A string representing the 6-digit code.
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}