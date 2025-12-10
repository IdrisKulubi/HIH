"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  XCircle,
  ArrowRight,
  Spinner,
  FileText,
  Target,
  MagnifyingGlass,
  Funnel
} from "@phosphor-icons/react";

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
}

const statusConfig = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-800", icon: FileText },
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-800", icon: CheckCircle },
  under_review: { label: "Under Review", color: "bg-amber-100 text-amber-800", icon: Clock },
  shortlisted: { label: "Shortlisted", color: "bg-green-100 text-green-800", icon: Star },
  scoring_phase: { label: "Scoring Phase", color: "bg-purple-100 text-purple-800", icon: Target },
  dragons_den: { label: "Dragon's Den", color: "bg-orange-100 text-orange-800", icon: Trophy },
  finalist: { label: "Finalist", color: "bg-emerald-100 text-emerald-800", icon: Trophy },
  approved: { label: "Approved", color: "bg-green-100 text-green-800", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800", icon: XCircle }
};

export function ApplicationStatusManager({ applications }: ApplicationStatusManagerProps) {
  const [selectedApplications, setSelectedApplications] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState<ApplicationStatus | "">("");
  const [bulkNotes, setBulkNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  const filteredApplications = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter((app) => {
      const id = String(app.id);
      const business = app.business?.name?.toLowerCase() || "";
      const first = app.business?.applicant?.firstName?.toLowerCase() || "";
      const last = app.business?.applicant?.lastName?.toLowerCase() || "";
      const email = app.business?.applicant?.email?.toLowerCase() || "";
      return (
        id.includes(q) ||
        business.includes(q) ||
        first.includes(q) ||
        last.includes(q) ||
        email.includes(q)
      );
    });
  }, [applications, query]);

  const handleSelectApplication = (applicationId: number, checked: boolean) => {
    if (checked) {
      setSelectedApplications(prev => [...prev, applicationId]);
    } else {
      setSelectedApplications(prev => prev.filter(id => id !== applicationId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedApplications(prev => Array.from(new Set([...prev, ...filteredApplications.map(app => app.id)])));
    } else {
      // Unselect only the currently filtered (visible) applications
      setSelectedApplications(prev => prev.filter(id => !filteredApplications.some(app => app.id === id)));
    }
  };

  const handleSingleStatusUpdate = async (applicationId: number, status: ApplicationStatus) => {
    startTransition(async () => {
      const result = await updateApplicationStatus(applicationId, status);
      if (result.success) {
        toast.success(`Application status updated to ${statusConfig[status].label}`);
        router.refresh();
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
        router.refresh();
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
        router.refresh();
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
        router.refresh();
      } else {
        toast.error(result.error || "Failed to move applications to scoring phase");
      }
    });
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} border-0 px-2 py-0.5 rounded-full font-normal`}>
        <Icon className="h-3.5 w-3.5 mr-1.5" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Bulk Actions */}
      {selectedApplications.length > 0 && (
        <Card className="border-0 shadow-md bg-white rounded-xl ring-1 ring-black/5">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-600" weight="fill" />
              Bulk Actions ({selectedApplications.length} selected)
            </CardTitle>
            <CardDescription className="text-gray-500">
              Perform actions on multiple applications at once
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-3">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50">
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
                      {isPending && <Spinner className="h-4 w-4 mr-2 animate-spin" />}
                      Update Status
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
                onClick={handleShortlistSelected}
                disabled={isPending}
                className="bg-green-600 hover:bg-green-700 text-white border-0"
              >
                {isPending && <Spinner className="h-4 w-4 mr-2 animate-spin" />}
                <Star className="h-4 w-4 mr-2" weight="fill" />
                Shortlist Selected
              </Button>

              <Button
                onClick={handleMoveToScoring}
                disabled={isPending}
                className="bg-purple-600 hover:bg-purple-700 text-white border-0"
              >
                {isPending && <Spinner className="h-4 w-4 mr-2 animate-spin" />}
                <Target className="h-4 w-4 mr-2" weight="fill" />
                Move to Scoring
              </Button>

              <Button
                variant="outline"
                onClick={() => setSelectedApplications([])}
                className="border-gray-200 text-gray-500 hover:text-gray-900"
              >
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Applications List */}
      <Card className="border-0 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] bg-white rounded-xl">
        <CardHeader className="border-b border-gray-100/50 pb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                Applications
                <span className="text-gray-400 font-normal text-sm ml-1">
                  ({filteredApplications.length}
                  {applications.length !== filteredApplications.length && (
                    <span> / {applications.length}</span>
                  )})
                </span>
              </CardTitle>
              <CardDescription>
                Manage application statuses and progression
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
              <Checkbox
                checked={
                  filteredApplications.length > 0 &&
                  filteredApplications.every(app => selectedApplications.includes(app.id))
                }
                onCheckedChange={handleSelectAll}
                className="data-[state=checked]:bg-blue-600 border-gray-300"
              />
              <Label className="text-xs font-medium text-gray-600 cursor-pointer">Select All</Label>
            </div>
          </div>
          <div className="mt-4">
            <div className="relative w-full max-w-md">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by business, applicant name, email, or ID"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 h-10 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {applications.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No applications found</p>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Funnel className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No applications match your search</p>
              </div>
            ) : (
              filteredApplications.map((application) => (
                <div
                  key={application.id}
                  className={`flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors ${selectedApplications.includes(application.id) ? "bg-blue-50/30" : ""
                    }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Checkbox
                      checked={selectedApplications.includes(application.id)}
                      onCheckedChange={(checked) => handleSelectApplication(application.id, checked as boolean)}
                      className="mt-1 data-[state=checked]:bg-blue-600 border-gray-300"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {application.business.name}
                        </h3>
                        {getStatusBadge(application.status)}
                      </div>
                      <div className="flex items-center text-sm text-gray-500 gap-2 truncate">
                        <span className="font-medium text-gray-700">
                          {application.business.applicant.firstName} {application.business.applicant.lastName}
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="truncate">{application.business.applicant.email}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Submitted: {new Date(application.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Select
                      value={application.status}
                      onValueChange={(value) => handleSingleStatusUpdate(application.id, value as ApplicationStatus)}
                      disabled={isPending}
                    >
                      <SelectTrigger className="w-[180px] h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusConfig).map(([status, config]) => (
                          <SelectItem key={status} value={status}>
                            <div className="flex items-center gap-2">
                              <config.icon className="h-3.5 w-3.5" />
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