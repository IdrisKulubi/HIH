import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Clock, CheckCircle, AlertTriangle, UserX } from "lucide-react";
import { getSupportStats } from "@/lib/actions/support";

export async function SupportStatsCards() {
  const result = await getSupportStats();
  
  if (!result.success) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Failed to load support statistics</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = result.data;

  const statsCards = [
    {
      title: "Total Tickets",
      value: stats?.totalTickets || 0,
      icon: MessageSquare,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Open Tickets",
      value: stats?.openTickets || 0,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "In Progress",
      value: stats?.inProgressTickets || 0,
      icon: AlertTriangle,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    {
      title: "Resolved",
      value: stats?.resolvedTickets || 0,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Unassigned",
      value: stats?.unassignedTickets || 0,
      icon: UserX,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {statsCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.title === "Open Tickets" && stat.value > 0 && (
                <Badge variant="destructive" className="mt-1 text-xs">
                  Needs Attention
                </Badge>
              )}
              {stat.title === "Unassigned" && stat.value > 0 && (
                <Badge variant="outline" className="mt-1 text-xs">
                  Assign Now
                </Badge>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
} 