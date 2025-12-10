import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  Plus,

  CheckCircle,
  BarChart3,
  Target,

  Zap,
  RefreshCw
} from "lucide-react";
import { getScoringConfigurations, getActiveScoringConfiguration } from "@/lib/actions/scoring";
import { ScoringConfigCard } from "@/components/admin/scoring/ScoringConfigCard";
import { CreateScoringConfigDialog } from "@/components/admin/scoring/CreateScoringConfigDialog";
import { ReEvaluationDialog } from "@/components/admin/scoring/ReEvaluationDialog";
import { InitializeDefaultConfigButton } from "@/components/admin/scoring/InitializeDefaultConfigButton";

async function ScoringConfigsSection() {
  const configsResult = await getScoringConfigurations();
  const activeConfigResult = await getActiveScoringConfiguration();

  const configs = configsResult.success ? configsResult.data : [];
  const activeConfig = activeConfigResult.success ? activeConfigResult.data : null;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Configurations</p>
                <p className="text-2xl font-bold text-blue-900">{configs?.length || 0}</p>
              </div>
              <Settings className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Active Configuration</p>
                <p className="text-2xl font-bold text-green-900">{activeConfig ? '1' : '0'}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Pass Threshold</p>
                <p className="text-2xl font-bold text-purple-900">60%</p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">Max Score</p>
                <p className="text-2xl font-bold text-amber-900">100</p>
              </div>
              <BarChart3 className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <CreateScoringConfigDialog>
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            <Plus className="h-4 w-4 mr-2" />
            Create New Configuration
          </Button>
        </CreateScoringConfigDialog>

        {activeConfig && (
          <ReEvaluationDialog configId={activeConfig.id}>
            <Button variant="outline" className="border-green-200 text-green-700 hover:bg-green-50">
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-evaluate Applications
            </Button>
          </ReEvaluationDialog>
        )}

        <InitializeDefaultConfigButton />
      </div>

      {/* Active Configuration Highlight */}
      {activeConfig && (
        <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg text-green-900">Active Configuration</CardTitle>
                  <CardDescription className="text-green-700">
                    Currently being used for evaluations
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-200">
                Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h3 className="font-semibold text-green-900">{activeConfig.name}</h3>
              <p className="text-sm text-green-700">{activeConfig.description}</p>
              <div className="flex gap-4 text-sm text-green-600">
                {/* <span>Version: {activeConfig.version}</span> */}
                {/* <span>•</span> */}
                <span>Criteria: {activeConfig.criteria.length}</span>
                {/* <span>•</span> */}
                {/* <span>Max Score: {activeConfig.totalMaxScore}</span> */}
                {/* <span>•</span> */}
                {/* <span>Pass: {activeConfig.passThreshold}%</span> */}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configurations List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">All Configurations</h2>
          <Badge variant="outline" className="text-gray-600">
            {configs?.length || 0} total
          </Badge>
        </div>

        {configs?.length === 0 ? (
          <Card className="border-dashed border-2 border-gray-200">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Settings className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Scoring Configurations</h3>
              <p className="text-gray-500 text-center mb-6 max-w-md">
                Create your first scoring configuration to start evaluating applications with customized criteria.
              </p>
              <div className="flex gap-3">
                <CreateScoringConfigDialog>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Configuration
                  </Button>
                </CreateScoringConfigDialog>
                <InitializeDefaultConfigButton />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {configs?.map((config) => (
              <ScoringConfigCard
                key={config.id}
                config={config}
                isActive={config.id === activeConfig?.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScoringManagementPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Scoring Management
            </h1>
            <p className="text-gray-600 text-lg">
              Configure evaluation criteria and manage application scoring
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 border">
            <Zap className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Dynamic Evaluation</span>
          </div>
        </div>

        <Separator />

        {/* Content */}
        <Suspense fallback={
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-16 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="animate-pulse">
              <CardContent className="p-8">
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        }>
          <ScoringConfigsSection />
        </Suspense>
      </div>
    </div>
  );
} 