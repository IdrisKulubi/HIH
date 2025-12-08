"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Send, BarChart3, Sparkles } from "lucide-react";
import { EmailComposer } from "./EmailComposer";
import { CampaignMonitor } from "./CampaignMonitor";
import { CampaignsList } from "./CampaignsList";

export function FeedbackEmailSystem() {
  const [activeTab, setActiveTab] = useState("compose");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCampaignCreated = () => {
    setActiveTab("campaigns");
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6 w-full max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-[#0B5FBA]/10 to-[#00D0AB]/10 p-3 rounded-xl">
              <Mail className="h-8 w-8 text-[#0B5FBA]" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-[#0B5FBA] to-[#00D0AB] bg-clip-text text-transparent">
                Feedback Email Campaigns
              </h1>
              <p className="text-gray-600 text-lg mt-1">
                Send feedback requests to applicants in organized batches
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Banner */}
      <Card className="border-0 bg-gradient-to-r from-[#0B5FBA]/5 via-[#0B5FBA]/5 to-[#00D0AB]/5">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <Send className="h-5 w-5 text-[#0B5FBA]" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Batch Sending</h3>
                <p className="text-sm text-gray-600">Emails sent in batches of 5 automatically</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <BarChart3 className="h-5 w-5 text-[#00D0AB]" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Real-time Tracking</h3>
                <p className="text-sm text-gray-600">Monitor delivery status and responses</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <Sparkles className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Smart Retry</h3>
                <p className="text-sm text-gray-600">Automatically retry failed deliveries</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px] bg-white shadow-sm border">
          <TabsTrigger 
            value="compose" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#0B5FBA] data-[state=active]:to-[#00D0AB] data-[state=active]:text-white"
          >
            <Mail className="h-4 w-4 mr-2" />
            Compose
          </TabsTrigger>
          <TabsTrigger 
            value="campaigns"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#0B5FBA] data-[state=active]:to-[#00D0AB] data-[state=active]:text-white"
          >
            <Send className="h-4 w-4 mr-2" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger 
            value="monitor"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#0B5FBA] data-[state=active]:to-[#00D0AB] data-[state=active]:text-white"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Monitor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-6">
          <EmailComposer onCampaignCreated={handleCampaignCreated} />
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <CampaignsList key={refreshKey} />
        </TabsContent>

        <TabsContent value="monitor" className="space-y-6">
          <CampaignMonitor />
        </TabsContent>
      </Tabs>
    </div>
  );
}
