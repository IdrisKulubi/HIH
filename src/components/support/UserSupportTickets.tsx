"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  MessageSquare, 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  User,
  Send,
  Paperclip,
  Eye,
  FileText
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { 
  getUserSupportTickets, 
  createSupportTicket, 
  addSupportResponse, 
  getSupportTicketById 
} from "@/lib/actions/support";
import { 
  createSupportTicketSchema, 
  
  type CreateSupportTicketData,
} from "@/lib/types/support";

// Configuration objects
const statusConfig = {
  open: { 
    label: "Open", 
    color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300", 
    icon: Clock 
  },
  in_progress: { 
    label: "In Progress", 
    color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300", 
    icon: AlertTriangle 
  },
  waiting_for_user: { 
    label: "Waiting for Response", 
    color: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300", 
    icon: User 
  },
  resolved: { 
    label: "Resolved", 
    color: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300", 
    icon: CheckCircle 
  },
  closed: { 
    label: "Closed", 
    color: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-300", 
    icon: CheckCircle 
  }
};

const priorityConfig = {
  low: { label: "Low", color: "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400" },
  medium: { label: "Medium", color: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950 dark:text-blue-400" },
  high: { label: "High", color: "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950 dark:text-orange-400" },
  urgent: { label: "Urgent", color: "bg-red-50 text-red-600 border-red-200 dark:bg-red-950 dark:text-red-400" }
};

const categoryConfig = {
  technical_issue: "Technical Issue",
  application_help: "Application Help",
  account_problem: "Account Problem",
  payment_issue: "Payment Issue", 
  feature_request: "Feature Request",
  bug_report: "Bug Report",
  general_inquiry: "General Inquiry",
  other: "Other"
};

// Ticket Detail Modal Component
interface TicketDetailModalProps {
  ticketId: number;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

function TicketDetailModal({ ticketId, isOpen, onClose, onUpdate }: TicketDetailModalProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const responseForm = useForm<{ message: string }>({
    defaultValues: {
      message: ""
    }
  });

  const fetchTicket = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getSupportTicketById(ticketId);
      if (result.success) {
        setTicket(result.data);
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
  }, [ticketId, onClose]);

  useEffect(() => {
    if (isOpen && ticketId) {
      fetchTicket();
    }
  }, [isOpen, ticketId, fetchTicket]);

  const handleAddResponse = async (formData: { message: string }) => {
    
    if (!formData.message.trim()) {
      toast.error("Please enter a message");
      return;
    }
    
    setSubmitting(true);
    try {
      console.error(" Calling addSupportResponse with:", {
        ticketId: ticketId,
        message: formData.message.trim(),
        isInternal: false,
        attachmentUrl: null
      });
      
      const result = await addSupportResponse({
        ticketId: ticketId,
        message: formData.message.trim(),
        isInternal: false,
        attachmentUrl: null
      });

      if (result.success) {
        toast.success("Response sent successfully");
        responseForm.reset();
        fetchTicket();
        onUpdate();
      } else {
        toast.error(result.message || "Failed to send response");
      }
    } catch (error) {
      console.error("💥 Error in user handleAddResponse:", error);
      toast.error("Failed to send response");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl sm:max-w-4xl w-[95vw] h-[85vh] p-0 gap-0 flex flex-col">
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

  // Filter out internal responses for users
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userVisibleResponses = ticket.responses?.filter((response: any) => !response.isInternal) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl sm:max-w-4xl w-[95vw] h-[85vh] p-0 gap-0 flex flex-col">
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
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 sm:p-6 space-y-6 pb-8">
              {/* Ticket Details */}
              <Card className="bg-card border-border">
                <CardHeader className="p-4">
                  <CardTitle className="text-base">Ticket Details</CardTitle>
                </CardHeader>
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
                      <span className="text-muted-foreground">Category</span>
                      <p className="font-medium text-foreground">
                        {categoryConfig[ticket.category as keyof typeof categoryConfig]}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Conversation */}
              <Card className="bg-card border-border">
                <CardHeader className="p-4">
                  <CardTitle className="text-base">Conversation</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {/* Messages */}
                  <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto pr-2">
                    {userVisibleResponses.length > 0 ? (
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (userVisibleResponses.map((response: any) => (
                        <div 
                          key={response.id} 
                          className={`p-4 rounded-lg border-l-4 ${
                            response.responderRole === 'admin' 
                              ? 'bg-primary/5 border-l-primary dark:bg-primary/10' 
                              : 'bg-muted/50 border-l-muted-foreground/30'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3 gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-foreground">
                                {response.responderRole === 'admin' ? 'Support Team' : 'You'}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {response.responderRole === 'admin' ? 'Support' : 'User'}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
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
                  {(ticket.status === 'open' || ticket.status === 'in_progress' || ticket.status === 'waiting_for_user') && (
                    <Form {...responseForm}>
                      <form onSubmit={responseForm.handleSubmit(handleAddResponse)} className="space-y-4">
                        <FormField
                          control={responseForm.control}
                          name="message"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Your Response</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Type your response here..."
                                  className="min-h-[100px] resize-none bg-background"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex justify-end">
                          <Button type="submit" disabled={submitting} size="sm">
                            <Send className="w-4 h-4 mr-2" />
                            {submitting ? "Sending..." : "Send Response"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  )}

                  {(ticket.status === 'resolved' || ticket.status === 'closed') && (
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        This ticket has been {ticket.status}. 
                        {ticket.status === 'resolved' && " If you need further assistance, please create a new ticket."}
                      </p>
                    </div>
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

// Main Component
export function UserSupportTickets() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const createTicketForm = useForm<CreateSupportTicketData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createSupportTicketSchema) as any,
    defaultValues: {
      category: "general_inquiry",
      priority: "medium",
      subject: "",
      description: ""
    }
  });

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const filters = statusFilter !== "all" ? { status: statusFilter } : {};
      
      const result = await getUserSupportTickets(filters);
      
      if (result.success && 'data' in result) {
        console.error(" Tickets loaded successfully:", {
          ticketCount: result.data?.tickets?.length || 0,
          hasData: !!result.data,
          hasTickets: !!result.data?.tickets
        });
        setTickets(result.data?.tickets || []);
      } else {
        toast.error(result.message || "Failed to load tickets");
      }
    } catch (error) {
      console.error("💥 Error in fetchTickets:", error);
      toast.error("Error loading tickets");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleCreateTicket = async (data: CreateSupportTicketData) => {
    
    if (!data.subject.trim() || !data.description.trim()) {
        console.error(" Missing required fields:", {
        hasSubject: !!data.subject.trim(),
        hasDescription: !!data.description.trim()
      });
      toast.error("Please fill in all required fields");
      return;
    }
    
    try {
      console.error(" Calling createSupportTicket with:", {
        category: data.category,
      });
      
      const result = await createSupportTicket({
        category: data.category,
        priority: data.priority,
        subject: data.subject.trim(),
        description: data.description.trim(),
        attachmentUrl: null
      });
      
      
      if (result.success) {
        toast.success("Support ticket created successfully!");
        createTicketForm.reset();
        setIsCreateModalOpen(false);
        fetchTickets();
      } else {
        toast.error(result.message || "Failed to create ticket");
      }
    } catch (error) {
      console.error("💥 Error in handleCreateTicket:", error);
      toast.error("Failed to create ticket");
    }
  };

  const getStatusCounts = () => {
    const counts = {
      all: tickets.length,
      open: tickets.filter(t => t.status === 'open').length,
      in_progress: tickets.filter(t => t.status === 'in_progress').length,
      waiting_for_user: tickets.filter(t => t.status === 'waiting_for_user').length,
      resolved: tickets.filter(t => t.status === 'resolved').length,
      closed: tickets.filter(t => t.status === 'closed').length,
    };
    return counts;
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Support Tickets</h2>
          <p className="text-muted-foreground">Manage your support requests and view responses</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              New Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Support Ticket</DialogTitle>
            </DialogHeader>
            <Form {...createTicketForm}>
              <form onSubmit={createTicketForm.handleSubmit(handleCreateTicket)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={createTicketForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(categoryConfig).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createTicketForm.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(priorityConfig).map(([value, config]) => (
                              <SelectItem key={value} value={value}>{config.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={createTicketForm.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input placeholder="Brief description of your issue..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createTicketForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Please provide detailed information about your issue..."
                          className="min-h-[120px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-col sm:flex-row gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    Create Ticket
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateModalOpen(false)}
                    className="flex-1 sm:flex-initial"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Filter Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="all" className="text-xs">
            All ({statusCounts.all})
          </TabsTrigger>
          <TabsTrigger value="open" className="text-xs">
            Open ({statusCounts.open})
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="text-xs">
            In Progress ({statusCounts.in_progress})
          </TabsTrigger>
          <TabsTrigger value="waiting_for_user" className="text-xs">
            Awaiting ({statusCounts.waiting_for_user})
          </TabsTrigger>
          <TabsTrigger value="resolved" className="text-xs">
            Resolved ({statusCounts.resolved})
          </TabsTrigger>
          <TabsTrigger value="closed" className="text-xs">
            Closed ({statusCounts.closed})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Tickets List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Loading tickets...</p>
            </div>
          </div>
        ) : tickets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Support Tickets</h3>
              <p className="text-muted-foreground text-center mb-4">
                {statusFilter === "all" 
                  ? "You haven't created any support tickets yet. Click 'New Ticket' to get started."
                  : `No tickets with status "${statusFilter}".`
                }
              </p>
              {statusFilter === "all" && (
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Ticket
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {tickets.map((ticket) => {
              const statusInfo = statusConfig[ticket.status as keyof typeof statusConfig];
              const priorityInfo = priorityConfig[ticket.priority as keyof typeof priorityConfig];
              const StatusIcon = statusInfo?.icon || Clock;

              return (
                <Card key={ticket.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-foreground truncate">
                            {ticket.ticketNumber}
                          </h3>
                          <Badge variant="outline" className={`${priorityInfo?.color} text-xs`}>
                            {priorityInfo?.label}
                          </Badge>
                          <Badge variant="outline" className={`${statusInfo?.color} text-xs`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusInfo?.label}
                          </Badge>
                        </div>
                        
                        <p className="text-sm font-medium text-foreground mb-1 truncate">
                          {ticket.subject}
                        </p>
                        
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {ticket.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {categoryConfig[ticket.category as keyof typeof categoryConfig]}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(ticket.createdAt), "MMM dd, yyyy")}
                          </span>
                          {ticket.responses && ticket.responses.length > 0 && (
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                              {ticket.responses.filter((r: any) => !r.isInternal).length} responses
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTicket(ticket.id)}
                        className="flex-shrink-0"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <TicketDetailModal
          ticketId={selectedTicket}
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onUpdate={fetchTickets}
        />
      )}
    </div>
  );
} 