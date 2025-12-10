"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  autoAssignApplications
} from "@/lib/actions/evaluator-assignments";
import {
  Users,
  UserCheck,
  Target,
  Lightning,
  Spinner,
  Gear,
  Medal,
  Clock,
  CheckCircle
} from "@phosphor-icons/react";

interface Application {
  id: number;
  status: string;
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

interface EvaluatorAssignmentManagerProps {
  applications: Application[];
}

const roleConfig = {
  technical_reviewer: {
    label: "Technical Reviewers",
    description: "Evaluate technical aspects and innovation",
    color: "bg-blue-100 text-blue-800",
    icon: Gear,
    validStatuses: ['scoring_phase']
  }
};

export function EvaluatorAssignmentManager({ applications }: EvaluatorAssignmentManagerProps) {
  const [selectedApplications, setSelectedApplications] = useState<number[]>([]);
  const [selectedRole, setSelectedRole] = useState<'technical_reviewer'>('technical_reviewer');
  const [evaluatorsPerApplication, setEvaluatorsPerApplication] = useState(2);
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const router = useRouter();

  // Filter applications by status for the selected role
  const eligibleApplications = applications.filter(app =>
    roleConfig[selectedRole].validStatuses.includes(app.status)
  );

  const handleSelectApplication = (applicationId: number, checked: boolean) => {
    if (checked) {
      setSelectedApplications(prev => [...prev, applicationId]);
    } else {
      setSelectedApplications(prev => prev.filter(id => id !== applicationId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedApplications(eligibleApplications.map(app => app.id));
    } else {
      setSelectedApplications([]);
    }
  };

  const handleAutoAssign = async () => {
    if (selectedApplications.length === 0) {
      toast.error("Please select applications to assign");
      return;
    }

    startTransition(async () => {
      const result = await autoAssignApplications(
        selectedApplications,
        selectedRole,
        evaluatorsPerApplication
      );

      if (result.success) {
        toast.success(
          `Successfully assigned ${result.applicationsAssigned} applications to ${selectedRole.replace('_', ' ')}s`
        );
        setSelectedApplications([]);
        setIsDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to assign applications");
      }
    });
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      scoring_phase: "bg-purple-100 text-purple-800",
      dragons_den: "bg-orange-100 text-orange-800",
      shortlisted: "bg-green-100 text-green-800"
    };

    return (
      <Badge className={`${statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"} border-0 px-2 py-0.5 rounded-full font-normal`}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const roleInfo = roleConfig[selectedRole];
  const RoleIcon = roleInfo.icon;

  return (
    <div className="space-y-6">
      {/* Role Selection */}
      <Card className="border-0 shadow-md bg-white rounded-xl ring-1 ring-black/5">
        <CardHeader className="pb-4 border-b border-gray-100">
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Users className="h-5 w-5 text-blue-600" weight="fill" />
            Evaluator Assignment Manager
          </CardTitle>
          <CardDescription className="text-gray-500">
            Assign applications to evaluators based on their role and current workload
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(roleConfig).map(([role, config]) => {
              const Icon = config.icon;
              const isSelected = selectedRole === role;
              const applicableApps = applications.filter(app =>
                config.validStatuses.includes(app.status)
              );

              return (
                <div
                  key={role}
                  className={`cursor-pointer transition-all duration-200 rounded-xl border p-4 ${isSelected
                    ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={() => setSelectedRole(role as any)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-lg shrink-0 ${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      <Icon className="h-6 w-6" weight={isSelected ? "fill" : "regular"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className={`font-semibold text-sm ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>{config.label}</h3>
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 text-blue-600" weight="fill" />
                        )}
                      </div>
                      <p className={`text-xs ${isSelected ? 'text-blue-700' : 'text-gray-500'} line-clamp-2 mb-2`}>{config.description}</p>
                      <Badge variant="secondary" className={`${isSelected ? 'bg-white text-blue-700' : 'bg-gray-100 text-gray-600'} text-[10px]`}>
                        {applicableApps.length} eligible
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Assignment Configuration */}
      <Card className="border-0 shadow-md bg-white rounded-xl ring-1 ring-black/5">
        <CardHeader className="pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-lg">
                <RoleIcon className="h-5 w-5 text-blue-600" weight="fill" />
              </div>
              <div>
                <CardTitle className="text-gray-900">Assign to {roleInfo.label}</CardTitle>
                <CardDescription>
                  {roleInfo.description} • {eligibleApplications.length} eligible applications
                </CardDescription>
              </div>
            </div>
            <Badge className={`${roleInfo.color} border-0 px-3 py-1 rounded-full`}>
              {selectedApplications.length} selected
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Assignment Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-gray-50/50 rounded-xl border border-gray-100">
            <div className="space-y-2">
              <Label htmlFor="evaluators-per-app" className="text-sm font-semibold text-gray-700">Evaluators per Application</Label>
              <Select
                value={evaluatorsPerApplication.toString()}
                onValueChange={(value) => setEvaluatorsPerApplication(parseInt(value))}
              >
                <SelectTrigger className="bg-white border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Evaluator</SelectItem>
                  <SelectItem value="2">2 Evaluators</SelectItem>
                  <SelectItem value="3">3 Evaluators</SelectItem>
                  <SelectItem value="4">4 Evaluators</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm border-0 transition-all"
                    disabled={selectedApplications.length === 0 || isPending}
                  >
                    <Lightning className="h-4 w-4 mr-2" weight="fill" />
                    Auto-Assign Selected
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Auto-Assignment</DialogTitle>
                    <DialogDescription>
                      This will assign {selectedApplications.length} applications to {roleInfo.label.toLowerCase()}
                      with {evaluatorsPerApplication} evaluator(s) per application.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <h4 className="font-semibold text-blue-900 mb-2 text-sm">Assignment Summary</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-blue-600" /> {selectedApplications.length} applications selected</li>
                        <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-blue-600" /> {evaluatorsPerApplication} evaluator(s) per application</li>
                        <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-blue-600" /> Role: {roleInfo.label}</li>
                        <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-blue-600" /> Load balancing will be applied automatically</li>
                      </ul>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAutoAssign} disabled={isPending} className="bg-blue-600 text-white hover:bg-blue-700">
                      {isPending && <Spinner className="h-4 w-4 mr-2 animate-spin" />}
                      Confirm Assignment
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Applications List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">
                Eligible Applications <span className="text-gray-400 font-normal">({eligibleApplications.length})</span>
              </h3>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedApplications.length === eligibleApplications.length && eligibleApplications.length > 0}
                  onCheckedChange={handleSelectAll}
                  className="data-[state=checked]:bg-blue-600"
                />
                <Label className="text-sm text-gray-600 cursor-pointer">Select All</Label>
              </div>
            </div>

            {eligibleApplications.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No applications eligible for {roleInfo.label.toLowerCase()}</p>
                <p className="text-sm mt-1 text-gray-400">
                  Applications must be in {roleInfo.validStatuses.join(' or ')} status
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {eligibleApplications.map((application) => (
                  <div
                    key={application.id}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${selectedApplications.includes(application.id)
                      ? "bg-blue-50/40 border-blue-200"
                      : "bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/50"
                      }`}
                  >
                    <div className="flex items-center gap-4 w-full">
                      <Checkbox
                        checked={selectedApplications.includes(application.id)}
                        onCheckedChange={(checked) => handleSelectApplication(application.id, checked as boolean)}
                        className="mt-0.5 data-[state=checked]:bg-blue-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-gray-900 truncate pr-4">
                            {application.business.name}
                          </h4>
                          {getStatusBadge(application.status)}
                        </div>
                        <div className="flex items-center text-sm text-gray-500 gap-2 truncate">
                          <span className="font-medium text-gray-700 truncate">
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
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
