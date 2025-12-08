"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  BarChart3,
  PieChart as PieChartIcon,
  Users,
  Building2,
  Globe,
  TrendingUp,
} from "lucide-react";

interface EnhancedAnalyticsChartsProps {
  data: {
    totalApplications: number;
    evaluatedApplications: number;
    evaluationRate: number;
    statusDistribution: Record<string, number>;
    countryDistribution: Record<string, number>;
    genderDistribution: Record<string, number>;
    sectorDistribution: Record<string, number>;
    averageScore?: number;
    maxScore?: number;
  };
}

// Color palettes for different chart types
const COLORS = {
  primary: [
    "#3B82F6",
    "#8B5CF6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#6366F1",
    "#14B8A6",
    "#F97316",
  ],
  gender: {
    male: "#3B82F6",
    female: "#EC4899",
    other: "#8B5CF6",
  },
  sector: {
    "food-security": "#10B981",
    infrastructure: "#F59E0B",
    other: "#8B5CF6",
  },
  status: {
    draft: "#6B7280",
    submitted: "#3B82F6",
    under_review: "#F59E0B",
    approved: "#10B981",
    rejected: "#EF4444",
    shortlisted: "#8B5CF6",
    scoring_phase: "#14B8A6",
    dragons_den: "#F97316",
    finalist: "#6366F1",
  },
};

export function EnhancedAnalyticsCharts({
  data,
}: EnhancedAnalyticsChartsProps) {
  // Transform data for charts
  const statusChartData = Object.entries(data.statusDistribution).map(
    ([status, count]) => ({
      name: status.replace("_", " ").toUpperCase(),
      value: count,
      color:
        COLORS.status[status as keyof typeof COLORS.status] ||
        COLORS.primary[0],
      percentage:
        data.totalApplications > 0
          ? Math.round((count / data.totalApplications) * 100)
          : 0,
    })
  );

  const countryChartData = Object.entries(data.countryDistribution).map(
    ([country, count], index) => ({
      name: country.toUpperCase(),
      value: count,
      color: COLORS.primary[index % COLORS.primary.length],
      percentage:
        data.totalApplications > 0
          ? Math.round((count / data.totalApplications) * 100)
          : 0,
    })
  );

  const genderChartData = Object.entries(data.genderDistribution).map(
    ([gender, count]) => ({
      name: gender.charAt(0).toUpperCase() + gender.slice(1),
      value: count,
      color:
        COLORS.gender[gender as keyof typeof COLORS.gender] ||
        COLORS.primary[0],
      percentage:
        data.totalApplications > 0
          ? Math.round((count / data.totalApplications) * 100)
          : 0,
    })
  );

  const sectorChartData = Object.entries(data.sectorDistribution).map(
    ([sector, count]) => ({
      name: sector.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      value: count,
      color:
        COLORS.sector[sector as keyof typeof COLORS.sector] ||
        COLORS.primary[0],
      percentage:
        data.totalApplications > 0
          ? Math.round((count / data.totalApplications) * 100)
          : 0,
    })
  );

  // Custom tooltip for better UX
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{`${label}`}</p>
          <p className="text-blue-600">
            <span className="font-medium">Applications: </span>
            {`${payload[0].value}`}
          </p>
          {payload[0].payload.percentage && (
            <p className="text-gray-600 text-sm">
              {`${payload[0].payload.percentage}% of total`}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{payload[0].name}</p>
          <p className="text-blue-600">
            <span className="font-medium">Count: </span>
            {payload[0].value}
          </p>
          <p className="text-gray-600 text-sm">
            {payload[0].payload.percentage}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Applications</p>
                <p className="text-2xl font-bold text-blue-600">
                  {data.totalApplications}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Evaluated</p>
                <p className="text-2xl font-bold text-green-600">
                  {data.evaluatedApplications}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Evaluation Rate</p>
                <p className="text-2xl font-bold text-purple-600">
                  {data.evaluationRate}%
                </p>
              </div>
              <PieChartIcon className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Score</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {data.averageScore?.toFixed(1) ?? "N/A"}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                /{data.maxScore || 100}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Charts with Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="geography">Geography</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Application Status Bar Chart */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Application Status Distribution
                </CardTitle>
                <CardDescription>
                  Current status of all applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={statusChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Application Status Pie Chart */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-purple-600" />
                  Status Distribution
                </CardTitle>
                <CardDescription>
                  Proportional view of application statuses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, payload }) =>
                        `${name} (${payload.percentage}%)`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Demographics Tab */}
        <TabsContent value="demographics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gender Distribution Pie Chart */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-pink-600" />
                  Gender Distribution
                </CardTitle>
                <CardDescription>Applicant gender breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {genderChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={genderChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, payload }) =>
                          `${name} (${payload.percentage}%)`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {genderChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-500">
                    <div className="text-center">
                      <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No gender data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gender Distribution Bar Chart */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-pink-600" />
                  Gender Comparison
                </CardTitle>
                <CardDescription>
                  Side-by-side gender comparison
                </CardDescription>
              </CardHeader>
              <CardContent>
                {genderChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={genderChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {genderChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-500">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No gender data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Business Tab */}
        <TabsContent value="business" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sector Distribution Pie Chart */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-green-600" />
                  Sector Distribution
                </CardTitle>
                <CardDescription>Business sector breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {sectorChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={sectorChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, payload }) =>
                          `${name} (${payload.percentage}%)`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {sectorChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-500">
                    <div className="text-center">
                      <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No sector data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sector Distribution Bar Chart */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  Sector Comparison
                </CardTitle>
                <CardDescription>
                  Side-by-side sector comparison
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sectorChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={sectorChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {sectorChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-500">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No sector data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Geography Tab */}
        <TabsContent value="geography" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Country Distribution Bar Chart */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-600" />
                  Country Distribution
                </CardTitle>
                <CardDescription>Applications by country</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={countryChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {countryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Country Distribution Pie Chart */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-blue-600" />
                  Geographic Distribution
                </CardTitle>
                <CardDescription>Proportional country view</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={countryChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name} (${value})`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {countryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
