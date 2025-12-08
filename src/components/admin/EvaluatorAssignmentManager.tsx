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
  Zap, 
  LoaderCircle,
  Settings,
  Award,
  Clock
} from "lucide-react";

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
    icon: Settings,
    validStatuses: ['scoring_phase']
  },
  jury_member: {
    label: "Jury Members", 
    description: "Assess business viability and impact",
    color: "bg-purple-100 text-purple-800",
    icon: Award,
    validStatuses: ['scoring_phase']
  },
  dragons_den_judge: {
    label: "Dragon's Den Judges",
    description: "Final evaluation and investment decisions",
    color: "bg-orange-100 text-orange-800", 
    icon: Target,
    validStatuses: ['dragons_den']
  }
};

export function EvaluatorAssignmentManager({ applications }: EvaluatorAssignmentManagerProps) {
  const [selectedApplications, setSelectedApplications] = useState<number[]>([]);
  const [selectedRole, setSelectedRole] = useState<'technical_reviewer' | 'jury_member' | 'dragons_den_judge'>('technical_reviewer');
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
      <Badge className={`${statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"} border-0`}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const roleInfo = roleConfig[selectedRole];
  const RoleIcon = roleInfo.icon;

  return (
    <div className="space-y-6">
      {/* Role Selection */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-blue-900">
            <Users className="h-6 w-6" />
            Evaluator Assignment Manager
          </CardTitle>
          <CardDescription className="text-blue-700">
            Assign applications to evaluators based on their role and current workload
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(roleConfig).map(([role, config]) => {
              const Icon = config.icon;
              const isSelected = selectedRole === role;
              const applicableApps = applications.filter(app => 
                config.validStatuses.includes(app.status)
              );

              return (
                <Card 
                  key={role}
                  className={`cursor-pointer transition-all duration-200 ${
                    isSelected 
                      ? 'ring-2 ring-blue-500 bg-white shadow-lg' 
                      : 'hover:shadow-md hover:bg-gray-50'
                  }`}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={() => setSelectedRole(role as any)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${config.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{config.label}</h3>
                        <p className="text-sm text-gray-600">{applicableApps.length} eligible</p>
                      </div>
                      {isSelected && (
                        <UserCheck className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{config.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Assignment Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RoleIcon className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle>Assign to {roleInfo.label}</CardTitle>
                <CardDescription>
                  {roleInfo.description} • {eligibleApplications.length} eligible applications
                </CardDescription>
              </div>
            </div>
            <Badge className={`${roleInfo.color} border-0`}>
              {selectedApplications.length} selected
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Assignment Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="evaluators-per-app">Evaluators per Application</Label>
              <Select 
                value={evaluatorsPerApplication.toString()} 
                onValueChange={(value) => setEvaluatorsPerApplication(parseInt(value))}
              >
                <SelectTrigger>
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
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    disabled={selectedApplications.length === 0 || isPending}
                  >
                    <Zap className="h-4 w-4 mr-2" />
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
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Assignment Summary</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• {selectedApplications.length} applications selected</li>
                        <li>• {evaluatorsPerApplication} evaluator(s) per application</li>
                        <li>• Role: {roleInfo.label}</li>
                        <li>• Load balancing will be applied automatically</li>
                      </ul>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAutoAssign} disabled={isPending}>
                      {isPending && <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />}
                      Confirm Assignment
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Applications List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Eligible Applications ({eligibleApplications.length})
              </h3>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedApplications.length === eligibleApplications.length && eligibleApplications.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <Label className="text-sm text-gray-600">Select All</Label>
              </div>
            </div>

            {eligibleApplications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No applications eligible for {roleInfo.label.toLowerCase()}</p>
                <p className="text-sm mt-1">
                  Applications must be in {roleInfo.validStatuses.join(' or ')} status
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {eligibleApplications.map((application) => (
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
                          <h4 className="font-medium text-gray-900">
                            {application.business.name}
                          </h4>
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
