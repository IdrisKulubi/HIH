"use client";

import { useState, useEffect, type ComponentType } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Mail,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  getCampaignDetails,
  retryFailedEmails,
} from "@/lib/actions/feedback-emails";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Email {
  id: number;
  recipientEmail: string;
  recipientName: string;
  status: string;
  batchNumber: number;
  sentAt: Date | null;
  failedAt: Date | null;
  errorMessage: string | null;
  retryCount: number | null;
}

type CampaignSummary = {
  id: number;
  name: string;
  sentCount: number | null;
  totalRecipients: number | null;
};

export function CampaignMonitor() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [emails, setEmails] = useState<Email[]>([]);
  const [filteredEmails, setFilteredEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [retrying, setRetrying] = useState(false);

  // Load campaigns on mount
  useEffect(() => {
    async function loadCampaigns() {
      const { getFeedbackCampaigns } = await import(
        "@/lib/actions/feedback-emails"
      );
      const result = await getFeedbackCampaigns();
      if (result.success && result.campaigns) {
        setCampaigns(result.campaigns);
        if (result.campaigns.length > 0) {
          setSelectedCampaignId(result.campaigns[0].id.toString());
        }
      }
    }
    loadCampaigns();
  }, []);

  // Load campaign details when selected
  useEffect(() => {
    if (!selectedCampaignId) return;

    async function loadDetails() {
      setLoading(true);
      const result = await getCampaignDetails(parseInt(selectedCampaignId));
      if (result.success && result.campaign) {
        setEmails(result.campaign.emails);
        setFilteredEmails(result.campaign.emails);
      } else {
        toast.error("Failed to load campaign details");
      }
      setLoading(false);
    }
    loadDetails();
  }, [selectedCampaignId]);

  // Filter emails
  useEffect(() => {
    let filtered = [...emails];

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((email) => email.status === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (email) =>
          email.recipientName.toLowerCase().includes(query) ||
          email.recipientEmail.toLowerCase().includes(query)
      );
    }

    setFilteredEmails(filtered);
  }, [emails, statusFilter, searchQuery]);

  const handleRetrySelected = async () => {
    if (!selectedCampaignId) return;

    setRetrying(true);
    const failedIds = filteredEmails
      .filter((email) => email.status === "failed")
      .map((email) => email.id);

    if (failedIds.length === 0) {
      toast.error("No failed emails to retry");
      setRetrying(false);
      return;
    }

    const result = await retryFailedEmails(
      parseInt(selectedCampaignId),
      failedIds
    );
    if (result.success) {
      toast.success(result.message);
      // Reload details
      const detailsResult = await getCampaignDetails(
        parseInt(selectedCampaignId)
      );
      if (detailsResult.success && detailsResult.campaign) {
        setEmails(detailsResult.campaign.emails);
      }
    } else {
      toast.error(result.error || "Failed to retry");
    }
    setRetrying(false);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<
      string,
      {
        variant: "default" | "secondary" | "destructive" | "outline";
        icon: ComponentType<{ className?: string }>;
        text: string;
      }
    > = {
      pending: { variant: "secondary", icon: Clock, text: "Pending" },
      sending: { variant: "default", icon: Mail, text: "Sending" },
      sent: { variant: "outline", icon: CheckCircle, text: "Sent" },
      failed: { variant: "destructive", icon: XCircle, text: "Failed" },
    };

    const config = styles[status] || styles.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  const selectedCampaign = campaigns.find(
    (c) => c.id.toString() === selectedCampaignId
  );

  const stats = {
    total: emails.length,
    sent: emails.filter((e) => e.status === "sent").length,
    failed: emails.filter((e) => e.status === "failed").length,
    pending: emails.filter((e) => e.status === "pending").length,
  };

  return (
    <div className="space-y-6 w-full">
      {/* Campaign Selector */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-emerald-50">
          <CardTitle>Campaign Monitor</CardTitle>
          <CardDescription>
            View detailed email delivery status and analytics
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Select Campaign
              </label>
              <Select
                value={selectedCampaignId}
                onValueChange={setSelectedCampaignId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a campaign to monitor" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign) => (
                    <SelectItem
                      key={campaign.id}
                      value={campaign.id.toString()}
                    >
                      {campaign.name} - {campaign.sentCount ?? 0}/
                      {campaign.totalRecipients ?? 0} sent
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCampaign && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg text-center">
                  <Users className="h-5 w-5 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-900">
                    {stats.total}
                  </div>
                  <div className="text-xs text-blue-700">Total Recipients</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg text-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-900">
                    {stats.sent}
                  </div>
                  <div className="text-xs text-green-700">
                    Successfully Sent
                  </div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg text-center">
                  <XCircle className="h-5 w-5 text-red-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-red-900">
                    {stats.failed}
                  </div>
                  <div className="text-xs text-red-700">Failed</div>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg text-center">
                  <Clock className="h-5 w-5 text-gray-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.pending}
                  </div>
                  <div className="text-xs text-gray-700">Pending</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Email List */}
      {selectedCampaignId && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-emerald-50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Email Delivery Status</CardTitle>
                <CardDescription>
                  Individual email tracking for {selectedCampaign?.name}
                </CardDescription>
              </div>
              {stats.failed > 0 && (
                <Button
                  onClick={handleRetrySelected}
                  disabled={retrying}
                  variant="outline"
                  className="border-orange-200 text-orange-700 hover:bg-orange-50"
                >
                  {retrying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry All Failed
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="sending">Sending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Email Table */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#0B5FBA]" />
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Mail className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="font-medium">No emails found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Retries</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmails.map((email) => (
                      <TableRow key={email.id}>
                        <TableCell className="font-medium">
                          {email.recipientName}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {email.recipientEmail}
                        </TableCell>
                        <TableCell>{getStatusBadge(email.status)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            Batch {email.batchNumber}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {email.sentAt
                            ? format(new Date(email.sentAt), "MMM d, h:mm a")
                            : email.failedAt
                              ? format(
                                  new Date(email.failedAt),
                                  "MMM d, h:mm a"
                                )
                              : "-"}
                        </TableCell>
                        <TableCell>
                          {(email.retryCount ?? 0) > 0 && (
                            <Badge variant="secondary">
                              {email.retryCount}x
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[320px] text-sm text-gray-600">
                          {email.errorMessage ? (
                            <span
                              title={email.errorMessage}
                              className="line-clamp-1"
                            >
                              {email.errorMessage}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}

            {/* Summary */}
            <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
              <div>
                Showing {filteredEmails.length} of {emails.length} emails
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                {stats.total > 0 && (
                  <span>
                    {Math.round((stats.sent / stats.total) * 100)}% delivery
                    rate
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
