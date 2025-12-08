"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  updateApplicationStatus, 
  bulkUpdateApplicationStatus, 
  shortlistApplications, 
  moveToScoringPhase,
  type ApplicationStatus 
} from "@/lib/actions/application-status";
import { 
  CheckCircle, 
  Clock, 
  Users, 
  Trophy, 
  Star, 
  X, 
  ArrowRight,
  LoaderCircle,
  FileText,
  Target
} from "lucide-react";

interface Application {
  id: number;
  status: ApplicationStatus;
  business: {
    name: string;
    applicant: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  createdAt: Date;
}

interface ApplicationStatusManagerProps {
  applications: Application[];
  onRefresh?: () => void;
}

const statusConfig = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-800", icon: FileText },
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-800", icon: CheckCircle },
  under_review: { label: "Under Review", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  shortlisted: { label: "Shortlisted", color: "bg-green-100 text-green-800", icon: Star },
  scoring_phase: { label: "Scoring Phase", color: "bg-purple-100 text-purple-800", icon: Target },
  dragons_den: { label: "Dragon's Den", color: "bg-orange-100 text-orange-800", icon: Trophy },
  finalist: { label: "Finalist", color: "bg-emerald-100 text-emerald-800", icon: Trophy },
  approved: { label: "Approved", color: "bg-green-100 text-green-800", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800", icon: X }
};

export function ApplicationStatusManager({ applications, onRefresh }: ApplicationStatusManagerProps) {
  const [selectedApplications, setSelectedApplications] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState<ApplicationStatus | "">("");
  const [bulkNotes, setBulkNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSelectApplication = (applicationId: number, checked: boolean) => {
    if (checked) {
      setSelectedApplications(prev => [...prev, applicationId]);
    } else {
      setSelectedApplications(prev => prev.filter(id => id !== applicationId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedApplications(applications.map(app => app.id));
    } else {
      setSelectedApplications([]);
    }
  };

  const handleSingleStatusUpdate = async (applicationId: number, status: ApplicationStatus) => {
    startTransition(async () => {
      const result = await updateApplicationStatus(applicationId, status);
      if (result.success) {
        toast.success(`Application status updated to ${statusConfig[status].label}`);
        onRefresh?.();
      } else {
        toast.error(result.error || "Failed to update status");
      }
    });
  };

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus || selectedApplications.length === 0) {
      toast.error("Please select applications and a status");
      return;
    }

    startTransition(async () => {
      const updates = selectedApplications.map(applicationId => ({
        applicationId,
        status: bulkStatus as ApplicationStatus,
        notes: bulkNotes || undefined
      }));

      const result = await bulkUpdateApplicationStatus(updates);
      if (result.success) {
        toast.success(`Updated ${result.count} applications to ${statusConfig[bulkStatus as ApplicationStatus].label}`);
        setSelectedApplications([]);
        setBulkStatus("");
        setBulkNotes("");
        setIsDialogOpen(false);
        onRefresh?.();
      } else {
        toast.error(result.error || "Failed to update statuses");
      }
    });
  };

  const handleShortlistSelected = async () => {
    if (selectedApplications.length === 0) {
      toast.error("Please select applications to shortlist");
      return;
    }

    startTransition(async () => {
      const result = await shortlistApplications(selectedApplications, bulkNotes || undefined);
      if (result.success) {
        toast.success(`Shortlisted ${result.count} applications`);
        setSelectedApplications([]);
        setBulkNotes("");
        setIsDialogOpen(false);
        onRefresh?.();
      } else {
        toast.error(result.error || "Failed to shortlist applications");
      }
    });
  };

  const handleMoveToScoring = async () => {
    if (selectedApplications.length === 0) {
      toast.error("Please select applications to move to scoring phase");
      return;
    }

    startTransition(async () => {
      const result = await moveToScoringPhase(selectedApplications, bulkNotes || undefined);
      if (result.success) {
        toast.success(`Moved ${result.count} applications to scoring phase`);
        setSelectedApplications([]);
        setBulkNotes("");
        setIsDialogOpen(false);
        onRefresh?.();
      } else {
        toast.error(result.error || "Failed to move applications to scoring phase");
      }
    });
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} border-0`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Bulk Actions */}
      {selectedApplications.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-blue-900">
              Bulk Actions ({selectedApplications.length} selected)
            </CardTitle>
            <CardDescription className="text-blue-700">
              Perform actions on multiple applications at once
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Change Status
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Bulk Status Update</DialogTitle>
                    <DialogDescription>
                      Update the status of {selectedApplications.length} selected applications
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="bulk-status">New Status</Label>
                      <Select value={bulkStatus} onValueChange={(value) => setBulkStatus(value as ApplicationStatus)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select new status" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusConfig).map(([status, config]) => (
                            <SelectItem key={status} value={status}>
                              <div className="flex items-center gap-2">
                                <config.icon className="h-4 w-4" />
                                {config.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="bulk-notes">Notes (Optional)</Label>
                      <Textarea
                        id="bulk-notes"
                        placeholder="Add notes about this status change..."
                        value={bulkNotes}
                        onChange={(e) => setBulkNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleBulkStatusUpdate} disabled={isPending || !bulkStatus}>
                      {isPending && <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />}
                      Update Status
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button 
                onClick={handleShortlistSelected}
                disabled={isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {isPending && <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />}
                <Star className="h-4 w-4 mr-2" />
                Shortlist Selected
              </Button>

              <Button 
                onClick={handleMoveToScoring}
                disabled={isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isPending && <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />}
                <Target className="h-4 w-4 mr-2" />
                Move to Scoring
              </Button>

              <Button 
                variant="outline" 
                onClick={() => setSelectedApplications([])}
                className="border-gray-300"
              >
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Applications List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Applications ({applications.length})</CardTitle>
              <CardDescription>
                Manage application statuses and progression
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedApplications.length === applications.length && applications.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <Label className="text-sm text-gray-600">Select All</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {applications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No applications found</p>
              </div>
            ) : (
              applications.map((application) => (
                <div
                  key={application.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={selectedApplications.includes(application.id)}
                      onCheckedChange={(checked) => handleSelectApplication(application.id, checked as boolean)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-medium text-gray-900">
                          {application.business.name}
                        </h3>
                        {getStatusBadge(application.status)}
                      </div>
                      <p className="text-sm text-gray-600">
                        {application.business.applicant.firstName} {application.business.applicant.lastName} • {application.business.applicant.email}
                      </p>
                      <p className="text-xs text-gray-500">
                        Submitted: {new Date(application.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={application.status}
                      onValueChange={(value) => handleSingleStatusUpdate(application.id, value as ApplicationStatus)}
                      disabled={isPending}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusConfig).map(([status, config]) => (
                          <SelectItem key={status} value={status}>
                            <div className="flex items-center gap-2">
                              <config.icon className="h-4 w-4" />
                              {config.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 