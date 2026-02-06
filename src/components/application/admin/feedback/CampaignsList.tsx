"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Loader2,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Play,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  getFeedbackCampaigns,
  sendCampaignBatch,
  retryFailedEmails,
  deleteCampaign,
  sendAllBatchesAutomatically,
} from "@/lib/actions/feedback-emails";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";

interface Campaign {
  id: number;
  name: string;
  subject: string | null;
  status: string;
  totalRecipients: number | null;
  sentCount: number | null;
  failedCount: number | null;
  batchSize: number | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

export function CampaignsList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingBatch, setSendingBatch] = useState<number | null>(null);
  const [retrying, setRetrying] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [autoSending, setAutoSending] = useState<number | null>(null);

  const loadCampaigns = async () => {
    setLoading(true);
    const result = await getFeedbackCampaigns();
    if (result.success && result.campaigns) {
      setCampaigns(result.campaigns);
    } else {
      toast.error("Failed to load campaigns");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleSendNextBatch = async (
    campaignId: number,
    batchSize: number,
    sentCount: number | null
  ) => {
    setSendingBatch(campaignId);
    const nextBatch = Math.floor((sentCount ?? 0) / batchSize) + 1;

    const result = await sendCampaignBatch(campaignId, nextBatch);
    if (result.success) {
      toast.success(result.message);
      await loadCampaigns();
    } else {
      toast.error(result.error || "Failed to send batch");
    }
    setSendingBatch(null);
  };

  const handleRetry = async (campaignId: number) => {
    setRetrying(campaignId);
    const result = await retryFailedEmails(campaignId);
    if (result.success) {
      toast.success(result.message);
      await loadCampaigns();
    } else {
      toast.error(result.error || "Failed to retry");
    }
    setRetrying(null);
  };

  const handleDelete = async (campaignId: number) => {
    const result = await deleteCampaign(campaignId);
    if (result.success) {
      toast.success("Campaign deleted");
      await loadCampaigns();
    } else {
      toast.error(result.error || "Failed to delete");
    }
    setDeleteId(null);
  };

  const handleAutoSendAll = async (campaignId: number) => {
    setAutoSending(campaignId);
    toast.info("Starting automatic batch sending...");
    
    const result = await sendAllBatchesAutomatically(campaignId);
    
    if (result.success) {
      toast.success(result.message || "All batches sent successfully!");
      await loadCampaigns();
    } else {
      toast.error(result.error || "Failed to send batches automatically");
    }
    setAutoSending(null);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<
      string,
      {
        variant: "default" | "secondary" | "destructive" | "outline";
        icon: React.ComponentType<{ className?: string }>;
      }
    > = {
      draft: { variant: "secondary", icon: Clock },
      sending: { variant: "default", icon: Send },
      completed: { variant: "outline", icon: CheckCircle },
      failed: { variant: "destructive", icon: XCircle },
    };

    const config = styles[status] || styles.draft;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#0B5FBA] mb-4" />
            <p className="text-gray-600">Loading campaigns...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="bg-gradient-to-br from-[#0B5FBA]/10 to-[#00D0AB]/10 p-6 rounded-full mb-4">
              <Mail className="h-12 w-12 text-[#0B5FBA]" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Campaigns Yet
            </h3>
            <p className="text-gray-600 max-w-md">
              Create your first feedback email campaign to start collecting
              responses from applicants.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {campaigns.map((campaign) => {
          const sentCount = campaign.sentCount ?? 0;
          const totalRecipients = campaign.totalRecipients ?? 0;
          const failedCount = campaign.failedCount ?? 0;
          const progress =
            totalRecipients > 0 ? (sentCount / totalRecipients) * 100 : 0;
          const batchSize = campaign.batchSize || 50;
          const nextBatchNumber =
            Math.floor(sentCount / batchSize) + 1;
          const totalBatches = Math.ceil(totalRecipients / batchSize);
          const canSendNext =
            sentCount < totalRecipients && campaign.status !== "completed";

          return (
            <Card
              key={campaign.id}
              className="border-0 shadow-lg overflow-hidden"
            >
              <div className="bg-gradient-to-r from-blue-50 to-emerald-50 px-6 py-4 border-b">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {campaign.name}
                      </h3>
                      {getStatusBadge(campaign.status)}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      {campaign.subject}
                    </p>
                    <p className="text-xs text-gray-500">
                      Created{" "}
                      {format(
                        new Date(campaign.createdAt),
                        "MMM d, yyyy 'at' h:mm a"
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <CardContent className="p-6">
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Sending Progress
                    </span>
                    <span className="text-sm text-gray-600">
                      {sentCount} / {totalRecipients} sent
                    </span>
                  </div>
                  <Progress value={progress} className="h-3" />
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <span>
                      Batch {Math.max(1, nextBatchNumber - 1)} of {totalBatches}
                    </span>
                    <span>{Math.round(progress)}% complete</span>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg text-center">
                    <div className="flex items-center justify-center mb-1">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                      <span className="text-xs text-green-700 font-medium">
                        Sent
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-green-900">
                      {sentCount}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg text-center">
                    <div className="flex items-center justify-center mb-1">
                      <XCircle className="h-4 w-4 text-red-600 mr-1" />
                      <span className="text-xs text-red-700 font-medium">
                        Failed
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-red-900">
                      {failedCount}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Clock className="h-4 w-4 text-blue-600 mr-1" />
                      <span className="text-xs text-blue-700 font-medium">
                        Pending
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-blue-900">
                      {totalRecipients - sentCount - failedCount}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  {canSendNext && (
                    <>
                      <Button
                        onClick={() => handleAutoSendAll(campaign.id)}
                        disabled={autoSending === campaign.id || sendingBatch === campaign.id}
                        className="bg-gradient-to-r from-[#0B5FBA] to-[#00D0AB] hover:from-[#0B5FBA]/90 hover:to-[#00D0AB]/90"
                      >
                        {autoSending === campaign.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Auto-Sending All Batches...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Send All Automatically ({totalRecipients - sentCount} emails)
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() =>
                          handleSendNextBatch(
                            campaign.id,
                            batchSize,
                            campaign.sentCount
                          )
                        }
                        disabled={sendingBatch === campaign.id || autoSending === campaign.id}
                        variant="outline"
                        className="border-[#0B5FBA] text-[#0B5FBA] hover:bg-[#0B5FBA]/5"
                      >
                        {sendingBatch === campaign.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Sending Batch {nextBatchNumber}...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Send Batch {nextBatchNumber} Only
                          </>
                        )}
                      </Button>
                    </>
                  )}

                  {failedCount > 0 && (
                    <Button
                      onClick={() => handleRetry(campaign.id)}
                      disabled={retrying === campaign.id || autoSending === campaign.id}
                      variant="outline"
                      className="border-orange-200 text-orange-700 hover:bg-orange-50"
                    >
                      {retrying === campaign.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Retrying...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Retry Failed ({failedCount})
                        </>
                      )}
                    </Button>
                  )}

                  <Button
                    onClick={() => setDeleteId(campaign.id)}
                    variant="outline"
                    className="border-red-200 text-red-700 hover:bg-red-50 ml-auto"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the campaign and all associated email
              records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
