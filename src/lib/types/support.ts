import { z } from "zod";

// Support ticket creation schema
export const createSupportTicketSchema = z.object({
  category: z.enum([
    "technical_issue",
    "application_help", 
    "account_problem",
    "payment_issue",
    "feature_request",
    "bug_report",
    "general_inquiry",
    "other"
  ]),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000, "Description must be less than 2000 characters"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  attachmentUrl: z.string().url().optional().nullable()
});

// Add response schema
export const addResponseSchema = z.object({
  ticketId: z.number().positive(),
  message: z.string().min(1, "Message cannot be empty").max(2000, "Message must be less than 2000 characters"),
  attachmentUrl: z.string().url().optional().nullable(),
  isInternal: z.boolean().default(false)
});

// Update ticket status schema
export const updateTicketStatusSchema = z.object({
  ticketId: z.number().positive(),
  status: z.enum(["open", "in_progress", "waiting_for_user", "resolved", "closed"]),
  resolutionNotes: z.string().optional().nullable(),
  assignedTo: z.string().optional().nullable()
});

// Type definitions
export type CreateSupportTicketData = z.infer<typeof createSupportTicketSchema>;
export type AddResponseData = z.infer<typeof addResponseSchema>;
export type UpdateTicketStatusData = z.infer<typeof updateTicketStatusSchema>;

// Support ticket filters interface
export interface SupportTicketFilters {
  status?: string;
  category?: string;
  priority?: string;
  assignedTo?: string;
  search?: string;
  page?: number;
  limit?: number;
  userId?: string; // For filtering user's own tickets
}

// Support ticket interface
export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  category: string;
  priority: string;
  status: string;
  subject: string;
  description: string;
  attachmentUrl?: string;
  assignedTo?: string;
  resolutionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    name?: string;
    email: string;
  };
  responses?: SupportResponse[];
}

// Support response interface
export interface SupportResponse {
  id: string;
  ticketId: string;
  userId: string;
  message: string;
  isInternal: boolean;
  attachmentUrl?: string;
  createdAt: Date;
  user?: {
    name?: string;
    email: string;
  };
}

// Support stats interface
export interface SupportStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  avgResolutionTime: number;
  ticketsByCategory: { category: string; count: number }[];
  ticketsByPriority: { priority: string; count: number }[];
} 