/**
 * Action Response Types
 * Standardized response types for all server actions
 */

// Base response type for all actions
export interface ActionResponse<T = void> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// Pagination metadata
export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    pages: number;
}

// Paginated response type
export interface PaginatedResponse<T> extends ActionResponse<T[]> {
    pagination: PaginationMeta;
}

// Error codes for better error handling
export const ActionErrorCodes = {
    UNAUTHORIZED: "UNAUTHORIZED",
    NOT_FOUND: "NOT_FOUND",
    VALIDATION_ERROR: "VALIDATION_ERROR",
    DUPLICATE_ENTRY: "DUPLICATE_ENTRY",
    DATABASE_ERROR: "DATABASE_ERROR",
    UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

export type ActionErrorCode = (typeof ActionErrorCodes)[keyof typeof ActionErrorCodes];

export interface ActionError {
    code: ActionErrorCode;
    message: string;
    details?: Record<string, unknown>;
}

// Helper functions for creating responses
export function successResponse<T>(data: T, message?: string): ActionResponse<T> {
    return {
        success: true,
        data,
        message,
    };
}

export function errorResponse(error: string, code?: ActionErrorCode): ActionResponse<never> {
    return {
        success: false,
        error,
    };
}

export function paginatedResponse<T>(
    data: T[],
    pagination: PaginationMeta
): PaginatedResponse<T> {
    return {
        success: true,
        data,
        pagination,
    };
}
