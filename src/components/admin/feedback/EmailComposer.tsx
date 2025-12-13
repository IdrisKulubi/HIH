"use client";

import React from "react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Eye,
  Send,
  Loader2,
  Users,
  Mail,
  Link as LinkIcon,
  Type,
  Sparkles,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  createFeedbackCampaign,
  getApplicantsForFeedback,
} from "@/lib/actions/feedback-emails";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const campaignSchema = z.object({
  name: z.string().min(3, "Campaign name must be at least 3 characters"),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  emailBody: z.string().min(20, "Email body must be at least 20 characters"),
  feedbackFormUrl: z.string().url("Must be a valid URL"),
  linkDisplayText: z.string().min(3, "Link text must be at least 3 characters"),
  batchSize: z.number().min(1).max(50),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

interface EmailComposerProps {
  onCampaignCreated?: () => void;
}

export function EmailComposer({ onCampaignCreated }: EmailComposerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [recipients, setRecipients] = useState<
    Array<{ userId: string; email: string; name: string }>
  >([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [loadingRecipients, setLoadingRecipients] = useState(true);
  const [recipientSearch, setRecipientSearch] = useState("");

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: "",
      subject: "We'd love your feedback on the BIRE Program",
      emailBody:
        "Thank you for participating in the BIRE Program. Your experience and insights are invaluable to us as we work to improve the program for future applicants.\n\nWe've prepared a short feedback form that should take only 5-10 minutes to complete. Your responses will help us understand what worked well and what we can improve.\n\nYour feedback is completely anonymous and will be used solely to enhance the program experience.",
      feedbackFormUrl: "",
      linkDisplayText: "Share Your Feedback",
      batchSize: 5,
    },
  });

  // Load recipients on mount
  useEffect(() => {
    async function loadRecipients() {
      const result = await getApplicantsForFeedback();
      if (result.success && result.recipients) {
        setRecipients(result.recipients);
      } else {
        toast.error("Failed to load recipients");
      }
      setLoadingRecipients(false);
    }
    loadRecipients();
  }, []);

  // Handle select all
  useEffect(() => {
    if (selectAll) {
      setSelectedRecipients(recipients.map((r) => r.email));
    } else if (
      selectedRecipients.length === recipients.length &&
      recipients.length > 0
    ) {
      setSelectedRecipients([]);
    }
  }, [selectAll, recipients, selectedRecipients.length]);

  const toggleRecipient = (email: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const onSubmit = async (data: CampaignFormData) => {
    if (selectedRecipients.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    setIsLoading(true);
    try {
      const selectedRecipientsData = recipients.filter((r) =>
        selectedRecipients.includes(r.email)
      );

      const result = await createFeedbackCampaign({
        ...data,
        recipients: selectedRecipientsData,
      });

      if (result.success) {
        toast.success(
          `Campaign created! ${selectedRecipientsData.length} emails queued for sending.`
        );
        form.reset();
        setSelectedRecipients([]);
        onCampaignCreated?.();
      } else {
        toast.error(result.error || "Failed to create campaign");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const watchedValues = form.watch();

  // Filter recipients by search query
  const filteredRecipients = recipientSearch
    ? recipients.filter((r) => {
      const q = recipientSearch.toLowerCase().trim();
      return (
        r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
      );
    })
    : recipients;

  return (
    <div className="space-y-6">
      {/* Composer Form */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-[#0B5FBA]/10 to-[#00D0AB]/10">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-[#0B5FBA]/10 to-[#00D0AB]/10 p-2 rounded-lg">
              <Mail className="h-5 w-5 text-[#0B5FBA]" />
            </div>
            <div>
              <CardTitle>Compose Feedback Email</CardTitle>
              <CardDescription>
                Create a new feedback request campaign
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Campaign Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <Type className="h-4 w-4 text-[#0B5FBA]" />
                Campaign Name
              </Label>
              <Input
                id="name"
                placeholder="2024 Post-Program Feedback"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            {/* Email Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#0B5FBA]" />
                Email Subject
              </Label>
              <Input
                id="subject"
                placeholder="Your feedback matters to us"
                {...form.register("subject")}
              />
              {form.formState.errors.subject && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.subject.message}
                </p>
              )}
            </div>

            {/* Email Body */}
            <div className="space-y-2">
              <Label htmlFor="emailBody" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#0B5FBA]" />
                Email Message
              </Label>
              <Textarea
                id="emailBody"
                placeholder="Compose your message here..."
                rows={8}
                {...form.register("emailBody")}
                className="resize-none"
              />
              {form.formState.errors.emailBody && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.emailBody.message}
                </p>
              )}
              <p className="text-xs text-gray-500">
                This message will appear before the feedback form button
              </p>
            </div>

            <Separator />

            {/* Feedback Form URL */}
            <div className="space-y-2">
              <Label
                htmlFor="feedbackFormUrl"
                className="flex items-center gap-2"
              >
                <LinkIcon className="h-4 w-4 text-[#0B5FBA]" />
                Feedback Form URL
              </Label>
              <Input
                id="feedbackFormUrl"
                type="url"
                placeholder="https://forms.google.com/your-form"
                {...form.register("feedbackFormUrl")}
              />
              {form.formState.errors.feedbackFormUrl && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.feedbackFormUrl.message}
                </p>
              )}
            </div>

            {/* Link Display Text */}
            <div className="space-y-2">
              <Label htmlFor="linkDisplayText">Button Text</Label>
              <Input
                id="linkDisplayText"
                placeholder="Share Your Feedback"
                {...form.register("linkDisplayText")}
              />
              {form.formState.errors.linkDisplayText && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.linkDisplayText.message}
                </p>
              )}
            </div>

            {/* Batch Size */}
            <div className="space-y-2">
              <Label htmlFor="batchSize">Batch Size (emails per batch)</Label>
              <Input
                id="batchSize"
                type="number"
                min="1"
                max="50"
                {...form.register("batchSize", { valueAsNumber: true })}
              />
              <p className="text-xs text-gray-500">
                Emails will be sent in batches of this size to avoid rate limits
              </p>
            </div>

            <Separator />

            {/* Recipients Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#0B5FBA]" />
                  Recipients ({selectedRecipients.length} selected)
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectAll(!selectAll)}
                >
                  {selectAll || selectedRecipients.length === recipients.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
              </div>

              {/* Search Recipients */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search recipients by name or email..."
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {loadingRecipients ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#0B5FBA]" />
                </div>
              ) : recipients.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>No applicants found</p>
                </div>
              ) : filteredRecipients.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Search className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>No recipients match your search</p>
                  <p className="text-xs mt-1">Try a different search term</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px] rounded-md border p-4">
                  <div className="space-y-3">
                    {filteredRecipients.map((recipient, index) => (
                      <div
                        key={`recipient-${index}-${recipient.email}`}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Checkbox
                          id={`checkbox-${index}`}
                          checked={selectedRecipients.includes(recipient.email)}
                          onCheckedChange={() =>
                            toggleRecipient(recipient.email)
                          }
                        />
                        <label
                          htmlFor={`checkbox-${index}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="font-medium text-gray-900">
                            {recipient.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {recipient.email}
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-2" />
                {showPreview ? "Hide" : "Show"} Preview
              </Button>
              <Button
                type="submit"
                disabled={isLoading || selectedRecipients.length === 0}
                className="flex-1 bg-gradient-to-r from-[#0B5FBA] to-[#00D0AB] hover:from-[#0B5FBA]/90 hover:to-[#00D0AB]/90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Create Campaign
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Preview Panel - Only show when preview is toggled */}
      {showPreview && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-emerald-50">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-2 rounded-lg">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Email Preview</CardTitle>
                <CardDescription>
                  How your email will appear to recipients
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 bg-gray-50">
              {/* Email Preview */}
              <div className="bg-white rounded-lg shadow-md max-w-2xl mx-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#0B5FBA] to-[#00D0AB] p-8 text-center rounded-t-lg">
                  <h2 className="text-2xl font-bold text-white">
                    BIRE Program
                  </h2>
                  <p className="text-blue-100 mt-1">
                    In-Country Program Feedback
                  </p>
                </div>

                {/* Content */}
                <div className="p-8">
                  <p className="text-lg font-semibold text-gray-900 mb-4">
                    Hello [Recipient Name],
                  </p>

                  <div className="text-gray-700 whitespace-pre-line leading-relaxed mb-6">
                    {watchedValues.emailBody ||
                      "Your email message will appear here..."}
                  </div>

                  {/* Button */}
                  <div className="text-center my-8">
                    <div className="inline-block bg-[#0B5FBA] text-white px-8 py-3 rounded-lg font-semibold">
                      {watchedValues.linkDisplayText || "Share Your Feedback"}
                    </div>
                  </div>

                  <p className="text-sm text-gray-500 italic text-center">
                    Your responses are anonymous and will help us improve the
                    program for future participants.
                  </p>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 p-6 text-center rounded-b-lg border-t">
                  <p className="text-sm text-gray-600">
                    BIRE Program - In-Country Program
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    © {new Date().getFullYear()} BIRE Program
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-[#0B5FBA]">
                    {selectedRecipients.length}
                  </div>
                  <div className="text-sm text-gray-600">Recipients</div>
                </div>
                <div className="bg-white p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-[#00D0AB]">
                    {Math.ceil(
                      selectedRecipients.length / (watchedValues.batchSize || 5)
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Batches</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
