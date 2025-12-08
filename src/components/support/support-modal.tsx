"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, MessageSquare, FileText } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createSupportTicket } from "@/lib/actions/support";
import { createSupportTicketSchema, type CreateSupportTicketData } from "@/lib/types/support";

// Use imported schema and type
type SupportTicketFormData = CreateSupportTicketData;

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: string;
  defaultSubject?: string;
  context?: string; // Additional context about where the support request came from
}

const categoryOptions = [
  { value: "technical_issue", label: "Technical Issue", description: "Bugs, errors, or technical problems" },
  { value: "application_help", label: "Application Help", description: "Help with your application process" },
  { value: "account_problem", label: "Account Problem", description: "Login, profile, or account issues" },
  { value: "payment_issue", label: "Payment Issue", description: "Billing or payment related problems" },
  { value: "feature_request", label: "Feature Request", description: "Suggest new features or improvements" },
  { value: "bug_report", label: "Bug Report", description: "Report software bugs or glitches" },
  { value: "general_inquiry", label: "General Inquiry", description: "General questions or information" },
  { value: "other", label: "Other", description: "Other issues not listed above" }
];

const priorityOptions = [
  { value: "low", label: "Low", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  { value: "medium", label: "Medium", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  { value: "high", label: "High", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  { value: "urgent", label: "Urgent", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" }
];

export function SupportModal({ 
  isOpen, 
  onClose, 
  defaultCategory, 
  defaultSubject, 
  context 
}: SupportModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SupportTicketFormData>({
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createSupportTicketSchema) as any,
    defaultValues: {
      //eslint-disable-next-line @typescript-eslint/no-explicit-any
      category: defaultCategory as any || undefined,
      subject: defaultSubject || "",
      description: context ? `Context: ${context}\n\nIssue Description:\n` : "",
      priority: "medium",
      attachmentUrl: null
    }
  });

  const handleSubmit = async (data: SupportTicketFormData) => {
    setIsSubmitting(true);
    
    try {
      const result = await createSupportTicket({
        ...data,
        attachmentUrl: data.attachmentUrl || null
      });

      if (result.success) {
        toast.success(
          `Support ticket created successfully! Ticket #${result.ticket?.ticketNumber}`,
          {
            description: "We'll get back to you as soon as possible.",
            duration: 5000
          }
        );
        form.reset();
        onClose();
      } else {
        toast.error("Failed to create support ticket", {
          description: result.message
        });
      }
    } catch (error) {
      console.error("Error creating support ticket:", error);
      toast.error("An unexpected error occurred", {
        description: "Please try again or contact support directly."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategory = form.watch("category");
  const selectedPriority = form.watch("priority");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg font-medium text-gray-900 dark:text-gray-100">
            <MessageSquare className="h-4 w-4" />
            Contact Support
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
            Submit a support ticket and we&apos;ll help you resolve your issue.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Category Selection */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Category *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700">
                      {categoryOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="py-2">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">{option.label}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {option.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Priority Selection */}
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Priority</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700">
                      {priorityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <Badge variant="secondary" className={option.color}>
                            {option.label}
                          </Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Subject */}
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Subject *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Brief description of your issue"
                      className="h-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please describe your issue in detail..."
                      className="min-h-[100px] resize-none bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Attachment URL */}
            <FormField
              control={form.control}
              name="attachmentUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Attachment URL (Optional)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="https://drive.google.com/file/d/..."
                        className="h-10 pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                        {...field}
                        value={field.value || ""}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Summary Card */}
            {selectedCategory && (
              <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3">
                <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-2">
                  Summary
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Category:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {categoryOptions.find(opt => opt.value === selectedCategory)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Priority:</span>
                    <Badge variant="secondary" className={priorityOptions.find(opt => opt.value === selectedPriority)?.color}>
                      {priorityOptions.find(opt => opt.value === selectedPriority)?.label}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Ticket"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 