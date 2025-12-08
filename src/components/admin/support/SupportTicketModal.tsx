"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { 
  MessageSquare, 
  User, 
  Paperclip, 
  Send,
  Settings,
  Clock,
  CheckCircle,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp
} from "lucide-react";

import {
  Dialog,
  DialogContent,
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  getSupportTicketById, 
  addSupportResponse, 
  updateSupportTicketStatus 
} from "@/lib/actions/support";


const responseFormSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(2000, "Message must be less than 2000 characters"),
  isInternal: z.boolean().default(false),
});

const statusUpdateFormSchema = z.object({
  status: z.enum(["open", "in_progress", "waiting_for_user", "resolved", "closed"]),
  resolutionNotes: z.string().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
});

type ResponseFormData = z.infer<typeof responseFormSchema>;
type StatusUpdateFormData = z.infer<typeof statusUpdateFormSchema>;

interface SupportTicketModalProps {
  ticketId: number;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const statusConfig = {
  open: { 
    label: "Open", 
    color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800", 
    icon: Clock 
  },
  in_progress: { 
    label: "In Progress", 
    color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800", 
    icon: AlertTriangle 
  },
  waiting_for_user: { 
    label: "Waiting for User", 
    color: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800", 
    icon: User 
  },
  resolved: { 
    label: "Resolved", 
    color: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800", 
    icon: CheckCircle 
  },
  closed: { 
    label: "Closed", 
    color: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-300 dark:border-gray-800", 
    icon: CheckCircle 
  }
};

const priorityConfig = {
  low: { 
    label: "Low", 
    color: "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700" 
  },
  medium: { 
    label: "Medium", 
    color: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800" 
  },
  high: { 
    label: "High", 
    color: "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800" 
  },
  urgent: { 
    label: "Urgent", 
    color: "bg-red-50 text-red-600 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800" 
  }
};

export function SupportTicketModal({ ticketId, isOpen, onClose, onUpdate }: SupportTicketModalProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [showTicketDetails, setShowTicketDetails] = useState(true);

  const responseForm = useForm<ResponseFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(responseFormSchema) as any,
    defaultValues: {
      message: "",
      isInternal: false
    }
  });

  const statusForm = useForm<StatusUpdateFormData>({
    resolver: zodResolver(statusUpdateFormSchema),
    defaultValues: {
      status: "open",
      resolutionNotes: "",
      assignedTo: ""
    }
  });

  const fetchTicket = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getSupportTicketById(ticketId);
      if (result.success) {
        setTicket(result.data);
        statusForm.reset({
          status: result.data?.status as "open" | "in_progress" | "waiting_for_user" | "resolved" | "closed" || "open",
          assignedTo: result.data?.assignedTo || "",
          resolutionNotes: result.data?.resolutionNotes || ""
        });
      } else {
        toast.error("Failed to load ticket");
        onClose();
      }
    } catch (error) {
      console.error("Error fetching ticket:", error);
      toast.error("Error loading ticket");
      onClose();
    } finally {
      setLoading(false);
    }
  }, [ticketId, statusForm, onClose]);

  useEffect(() => {
    if (isOpen && ticketId) {
      fetchTicket();
    }
  }, [isOpen, ticketId, fetchTicket]);

  const handleAddResponse = async (data: ResponseFormData) => {
    setSubmitting(true);
    try {
      console.error("📤 Calling addSupportResponse with:", {
        ticketId,
        message: data.message,
        isInternal: data.isInternal,
        attachmentUrl: null
      });
      
      const result = await addSupportResponse({
        ticketId,
        message: data.message,
        isInternal: data.isInternal,
        attachmentUrl: null
      });


      if (result.success) {
        toast.success("Response added successfully");
        responseForm.reset();
        fetchTicket();
        onUpdate();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("💥 Error in handleAddResponse:", error);
      toast.error("Failed to add response");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (data: StatusUpdateFormData) => {
    setSubmitting(true);
    try {
      console.error(" Calling updateSupportTicketStatus with:", {
        ticketId,
        status: data.status,
        resolutionNotes: data.resolutionNotes || null,
        assignedTo: data.assignedTo || null
      });
      
      const result = await updateSupportTicketStatus({
        ticketId,
        status: data.status,
        resolutionNotes: data.resolutionNotes || null,
        assignedTo: data.assignedTo || null
      });


      if (result.success) {
        toast.success("Ticket status updated successfully");
        setShowStatusUpdate(false);
        fetchTicket();
        onUpdate();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("💥 Error in handleStatusUpdate:", error);
      toast.error("Failed to update status");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl sm:max-w-4xl w-[95vw] h-[95vh] p-0 gap-0 flex flex-col">
          <div className="flex items-center justify-center flex-1">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Loading ticket...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!ticket) return null;

  const statusInfo = statusConfig[ticket.status as keyof typeof statusConfig];
  const priorityInfo = priorityConfig[ticket.priority as keyof typeof priorityConfig];
  const StatusIcon = statusInfo?.icon || Clock;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl sm:max-w-4xl w-[95vw] h-[95vh] p-0 gap-0 flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 p-4 sm:p-6 border-b border-border bg-card">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg sm:text-xl font-semibold text-foreground truncate">
                  {ticket.ticketNumber}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ticket.subject}</p>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="outline" className={`${priorityInfo?.color} text-xs`}>
                    {priorityInfo?.label}
                  </Badge>
                  <Badge variant="outline" className={`${statusInfo?.color} text-xs`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusInfo?.label}
                  </Badge>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 sm:p-6 space-y-6 pb-8">
              {/* User Info - Mobile First */}
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{ticket.userName}</p>
                      <p className="text-sm text-muted-foreground truncate">{ticket.userEmail}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ticket Details - Collapsible on Mobile */}
              <Card className="bg-card border-border">
                <CardHeader className="p-4 pb-2">
                  <Button
                    variant="ghost"
                    onClick={() => setShowTicketDetails(!showTicketDetails)}
                    className="w-full justify-between p-0 h-auto font-medium"
                  >
                    Ticket Details
                    {showTicketDetails ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </CardHeader>
                {showTicketDetails && (
                  <CardContent className="p-4 pt-0 space-y-4">
                    <div>
                      <h4 className="font-medium text-sm text-foreground mb-2">Description</h4>
                      <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 whitespace-pre-wrap">
                        {ticket.description}
                      </div>
                    </div>
                    
                    {ticket.attachmentUrl && (
                      <div>
                        <h4 className="font-medium text-sm text-foreground mb-2">Attachment</h4>
                        <a 
                          href={ticket.attachmentUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                        >
                          <Paperclip className="w-4 h-4" />
                          View Attachment
                        </a>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <span className="text-muted-foreground">Created</span>
                        <p className="font-medium text-foreground">
                          {format(new Date(ticket.createdAt), "MMM dd, yyyy 'at' HH:mm")}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground">Updated</span>
                        <p className="font-medium text-foreground">
                          {format(new Date(ticket.updatedAt), "MMM dd, yyyy 'at' HH:mm")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>

                             {/* Conversation */}
               <Card className="bg-card border-border">
                 <CardHeader className="p-4 pb-2">
                   <CardTitle className="text-base">Conversation</CardTitle>
                 </CardHeader>
                 <CardContent className="p-4 pt-2">
                   {/* Conversation Messages */}
                   <div className="space-y-4 mb-6 max-h-[60vh] overflow-y-auto pr-2">
                     {ticket.responses && ticket.responses.length > 0 ? (
                       // eslint-disable-next-line @typescript-eslint/no-explicit-any
                       (ticket.responses.map((response: any) => (
                         <div 
                           key={response.id} 
                           className={`p-4 rounded-lg border-l-4 ${
                             response.responderRole === 'admin' 
                               ? 'bg-primary/5 border-l-primary dark:bg-primary/10' 
                               : 'bg-muted/50 border-l-muted-foreground/30'
                           }`}
                         >
                           <div className="flex items-center justify-between mb-3 gap-2">
                             <div className="flex items-center gap-2 min-w-0 flex-1">
                               <span className="font-medium text-sm text-foreground truncate">
                                 {response.responderName}
                               </span>
                               <Badge variant="secondary" className="text-xs flex-shrink-0">
                                 {response.responderRole}
                               </Badge>
                               {response.isInternal && (
                                 <Badge variant="destructive" className="text-xs flex-shrink-0">
                                   Internal
                                 </Badge>
                               )}
                             </div>
                             <span className="text-xs text-muted-foreground flex-shrink-0">
                               {format(new Date(response.createdAt), "MMM dd, HH:mm")}
                             </span>
                           </div>
                           <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed break-words">
                             {response.message}
                           </div>
                         </div>
                       )))
                     ) : (
                       <div className="text-center py-8">
                         <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                         <p className="text-sm text-muted-foreground">No responses yet</p>
                       </div>
                     )}
                   </div>

                  <Separator className="mb-6" />

                  {/* Add Response Form */}
                  <Form {...responseForm}>
                    <form onSubmit={responseForm.handleSubmit(handleAddResponse)} className="space-y-4">
                      <FormField
                        control={responseForm.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea
                                placeholder="Type your response..."
                                className="min-h-[100px] resize-none bg-background"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <FormField
                          control={responseForm.control}
                          name="isInternal"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal cursor-pointer">
                                Internal note (not visible to user)
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                        
                        <Button type="submit" disabled={submitting} size="sm" className="w-full sm:w-auto">
                          <Send className="w-4 h-4 mr-2" />
                          {submitting ? "Sending..." : "Send"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Ticket Management */}
              <Card className="bg-card border-border">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    <CardTitle className="text-base">Ticket Management</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowStatusUpdate(!showStatusUpdate)}
                  >
                    {showStatusUpdate ? "Cancel Update" : "Update Status"}
                  </Button>

                  {showStatusUpdate && (
                    <Form {...statusForm}>
                      <form onSubmit={statusForm.handleSubmit(handleStatusUpdate)} className="space-y-4">
                        <FormField
                          control={statusForm.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">Status</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-background">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="open">Open</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="waiting_for_user">Waiting for User</SelectItem>
                                  <SelectItem value="resolved">Resolved</SelectItem>
                                  <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {(statusForm.watch("status") === "resolved" || statusForm.watch("status") === "closed") && (
                          <FormField
                            control={statusForm.control}
                            name="resolutionNotes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm">Resolution Notes</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Describe how this issue was resolved..."
                                    className="min-h-[80px] bg-background resize-none"
                                    {...field}
                                    value={field.value || ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button type="submit" disabled={submitting} size="sm" className="flex-1">
                            {submitting ? "Updating..." : "Update Status"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowStatusUpdate(false)}
                            className="flex-1 sm:flex-initial"
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </Form>
                  )}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
} 