"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle, Users, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface ReviewerDiagnostic {
  id: string;
  name: string;
  role: string;
  email: string;
  r1: {
    assigned: number;
    completed: number;
    pending: number;
  };
  r2: {
    assigned: number;
    completed: number;
    pending: number;
  };
}

interface PendingApplicationSnippet {
  id: number;
  businessName: string;
  assignedR1Id: string | null;
  assignedR1Name: string | null;
  r1Score: string | null;
  assignedR2Id: string | null;
  assignedR2Name: string | null;
  r2Score: string | null;
  status: string;
}

interface DuplicateGroup {
  key: string;
  duplicateType: "email" | "name";
  users: {
    userId: string;
    email: string;
    name: string;
    firstName: string;
    lastName: string;
    role: string;
    createdAt: string;
  }[];
}

interface AdminInfo {
  userId: string;
  email: string;
  name: string;
  createdAt: string;
}

interface DiagnosticsData {
  reviewers: ReviewerDiagnostic[];
  pendingApplications: PendingApplicationSnippet[];
  duplicates: DuplicateGroup[];
  admins: AdminInfo[];
  summary: {
    totalReviewers: number;
    totalPendingApplications: number;
    totalR1Pending: number;
    totalR2Pending: number;
    duplicateGroups: number;
  };
}

const REFRESH_INTERVAL = 2 * 60 * 1000; // 2 minutes

export default function ReviewerDiagnosticsPage() {
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nextRefresh, setNextRefresh] = useState<number>(REFRESH_INTERVAL / 1000);
  const [previousPendingCount, setPreviousPendingCount] = useState<number | null>(null);

  const fetchData = useCallback(async (showToast = false) => {
    try {
      setLoading(true);
      const response = await fetch("/api/reviewer-diagnostics");
      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }
      const result = await response.json();
      
      if (result.success) {
        // Check if pending count changed
        if (previousPendingCount !== null && data) {
          const newPendingCount = result.data.summary.totalPendingApplications;
          if (newPendingCount !== previousPendingCount) {
            const diff = previousPendingCount - newPendingCount;
            if (diff > 0) {
              toast.success(`${diff} application(s) completed since last refresh!`, {
                description: `Pending: ${previousPendingCount} → ${newPendingCount}`,
              });
            } else if (diff < 0) {
              toast.info(`${Math.abs(diff)} new pending application(s)`, {
                description: `Pending: ${previousPendingCount} → ${newPendingCount}`,
              });
            }
          } else if (showToast) {
            toast.info("No changes since last refresh");
          }
        }
        
        setPreviousPendingCount(result.data.summary.totalPendingApplications);
        setData(result.data);
        setLastUpdated(new Date());
        setError(null);
      } else {
        throw new Error(result.error || "Unknown error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
      toast.error("Failed to refresh data");
    } finally {
      setLoading(false);
    }
  }, [previousPendingCount, data]);

  // Initial fetch
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(true);
    }, REFRESH_INTERVAL);

    // Countdown timer
    const countdownInterval = setInterval(() => {
      setNextRefresh((prev) => {
        if (prev <= 1) {
          return REFRESH_INTERVAL / 1000;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(countdownInterval);
    };
  }, [fetchData]);

  const handleManualRefresh = () => {
    setNextRefresh(REFRESH_INTERVAL / 1000);
    fetchData(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (error && !data) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Error Loading Data</CardTitle>
            <CardDescription className="text-red-600">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleManualRefresh} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reviewer Diagnostics</h1>
          <p className="text-muted-foreground">
            Live dashboard for reviewer assignments and pending applications
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            <Clock className="inline h-4 w-4 mr-1" />
            Next refresh: {formatTime(nextRefresh)}
          </div>
          <Button
            onClick={handleManualRefresh}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Now
          </Button>
        </div>
      </div>

      {lastUpdated && (
        <p className="text-sm text-muted-foreground mb-4">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Reviewers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                <Users className="mr-2 h-5 w-5 text-blue-500" />
                18
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-700">
                Total Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-700 flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                {data.summary.totalPendingApplications}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                R1 Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{data.summary.totalR1Pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                R2 Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{data.summary.totalR2Pending}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Note about numbers */}
      {data && (
        <p className="text-xs text-muted-foreground mb-4">
          Note: R1 + R2 may exceed Total Pending because some applications are awaiting both reviews.
        </p>
      )}

      {/* Duplicate Warning */}
      {data && data.duplicates.length > 0 && (
        <Card className="mb-6 border-yellow-300 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800 flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Duplicate Reviewers Detected ({data.duplicates.length} groups)
            </CardTitle>
            <CardDescription className="text-yellow-700">
              The following reviewers appear to have duplicate accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.duplicates.map((group, idx) => (
              <div key={idx} className="mb-4 p-4 bg-white rounded-lg border border-yellow-200">
                <h4 className="font-semibold text-yellow-800 mb-2">
                  &quot;{group.key}&quot; ({group.users.length} accounts)
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.users.map((user, userIdx) => (
                      <TableRow key={userIdx}>
                        <TableCell className="font-mono text-sm">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.role}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{user.userId.slice(0, 8)}...</TableCell>
                        <TableCell>{new Date(user.createdAt).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Reviewer Stats Table */}
      {data && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Reviewer Statistics</CardTitle>
            <CardDescription>
              Assignment and completion stats for all reviewers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-center">R1 Assigned</TableHead>
                  <TableHead className="text-center">R1 Completed</TableHead>
                  <TableHead className="text-center">R1 Pending</TableHead>
                  <TableHead className="text-center">R2 Assigned</TableHead>
                  <TableHead className="text-center">R2 Completed</TableHead>
                  <TableHead className="text-center">R2 Pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.reviewers.map((reviewer) => (
                  <TableRow key={reviewer.id}>
                    <TableCell className="font-medium">{reviewer.name}</TableCell>
                    <TableCell>
                      <Badge variant={reviewer.role === "reviewer_1" ? "default" : "secondary"}>
                        {reviewer.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {reviewer.email}
                    </TableCell>
                    <TableCell className="text-center">{reviewer.r1.assigned}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-green-600">{reviewer.r1.completed}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      {reviewer.r1.pending > 0 ? (
                        <Badge variant="destructive">{reviewer.r1.pending}</Badge>
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">{reviewer.r2.assigned}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-green-600">{reviewer.r2.completed}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      {reviewer.r2.pending > 0 ? (
                        <Badge variant="destructive">{reviewer.r2.pending}</Badge>
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pending Applications Table */}
      {data && data.pendingApplications.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5 text-orange-500" />
              Pending Applications ({data.pendingApplications.length})
            </CardTitle>
            <CardDescription>
              Applications awaiting reviewer scores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>App ID</TableHead>
                  <TableHead>Business Name</TableHead>
                  <TableHead>R1 Assigned</TableHead>
                  <TableHead>R1 Score</TableHead>
                  <TableHead>R2 Assigned</TableHead>
                  <TableHead>R2 Score</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.pendingApplications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-mono">{app.id}</TableCell>
                    <TableCell className="font-medium">{app.businessName}</TableCell>
                    <TableCell>
                      {app.assignedR1Name || (
                        <span className="text-muted-foreground">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {app.r1Score ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          {app.r1Score}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {app.assignedR2Name || (
                        <span className="text-muted-foreground">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {app.r2Score ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          {app.r2Score}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{app.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Admin List */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle>System Admins</CardTitle>
            <CardDescription>
              Administrators who can create/manage reviewers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Account Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.admins.map((admin) => (
                  <TableRow key={admin.userId}>
                    <TableCell className="font-medium">{admin.name}</TableCell>
                    <TableCell className="text-muted-foreground">{admin.email}</TableCell>
                    <TableCell>{new Date(admin.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

     
    </div>
  );
}
