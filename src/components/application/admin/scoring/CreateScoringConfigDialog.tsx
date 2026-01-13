"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {

  Save,

  Settings,

} from "lucide-react";
import { createScoringConfiguration } from "@/lib/actions/scoring";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { DEFAULT_BIRE_SCORING_CONFIG } from "@/lib/types/scoring";

interface CreateScoringConfigDialogProps {
  children: React.ReactNode;
}

export function CreateScoringConfigDialog({ children }: CreateScoringConfigDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [useDefaultConfig, setUseDefaultConfig] = useState(true);
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    version: "1.0",
    totalMaxScore: 100,
    passThreshold: 60,
  });

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a configuration name");
      return;
    }

    setIsCreating(true);
    try {
      let configToCreate;

      if (useDefaultConfig) {
        // Use default config but with custom name and description
        configToCreate = {
          ...DEFAULT_BIRE_SCORING_CONFIG,
          name: formData.name,
          description: formData.description || DEFAULT_BIRE_SCORING_CONFIG.description,
          version: formData.version,
          totalMaxScore: formData.totalMaxScore,
          passThreshold: formData.passThreshold,
        };
      } else {
        // Create minimal config - user can add criteria later
        configToCreate = {
          name: formData.name,
          description: formData.description,
          version: formData.version,
          totalMaxScore: formData.totalMaxScore,
          passThreshold: formData.passThreshold,
          criteria: []
        };
      }

      const result = await createScoringConfiguration(configToCreate);

      if (result.success) {
        toast.success("Scoring configuration created successfully!");
        setIsOpen(false);
        setFormData({
          name: "",
          description: "",
          version: "1.0",
          totalMaxScore: 100,
          passThreshold: 60,
        });
        router.refresh();
      } else {
        toast.error(result.error || "Failed to create scoring configuration");
      }
    } catch (error) {
      console.error("Error creating scoring configuration:", error);
      toast.error("An error occurred while creating configuration");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            Create Scoring Configuration
          </DialogTitle>
          <DialogDescription>
            Create a new scoring configuration to evaluate applications with custom criteria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Configuration Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., BIRE Programme v2.0"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  placeholder="1.0"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the purpose and focus of this scoring configuration..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalMaxScore">Maximum Score</Label>
                <Input
                  id="totalMaxScore"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.totalMaxScore}
                  onChange={(e) => setFormData({ ...formData, totalMaxScore: parseInt(e.target.value) || 100 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passThreshold">Pass Threshold (%)</Label>
                <Input
                  id="passThreshold"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.passThreshold}
                  onChange={(e) => setFormData({ ...formData, passThreshold: parseInt(e.target.value) || 60 })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Configuration Template */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Configuration Template</h3>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  id="useDefault"
                  name="configType"
                  checked={useDefaultConfig}
                  onChange={() => setUseDefaultConfig(true)}
                  className="h-4 w-4 text-blue-600"
                />
                <Label htmlFor="useDefault" className="cursor-pointer">
                  Use BIRE Default Template (Recommended)
                </Label>
              </div>

              {useDefaultConfig && (
                <div className="ml-7 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 mb-3">
                    This template includes the complete BIRE Programme scoring criteria for both Foundation and Acceleration tracks.
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="font-medium text-blue-900">Categories Included:</div>
                      <div className="text-blue-700">
                        • Commercial Viability (30pts)<br />
                        • Business Model (10pts)<br />
                        • Market Potential (30pts)<br />
                        • Social Impact (40pts)
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium text-blue-900">Features:</div>
                      <div className="text-blue-700">
                        • 11 Foundation criteria<br />
                        • 16 Acceleration criteria<br />
                        • Women/Youth/PWD focus<br />
                        • 70% pass threshold
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  id="useCustom"
                  name="configType"
                  checked={!useDefaultConfig}
                  onChange={() => setUseDefaultConfig(false)}
                  className="h-4 w-4 text-blue-600"
                />
                <Label htmlFor="useCustom" className="cursor-pointer">
                  Start with Empty Configuration
                </Label>
              </div>

              {!useDefaultConfig && (
                <div className="ml-7 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Create a blank configuration and add your own criteria after creation.
                    This gives you complete control over the evaluation structure.
                  </p>
                </div>
              )}
            </div>
          </div>

          {useDefaultConfig && (
            <>
              <Separator />

              {/* Preview of Default Config */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Template Preview</h3>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {Object.entries(
                    //eslint-disable-next-line @typescript-eslint/no-explicit-any
                    DEFAULT_BIRE_SCORING_CONFIG.criteria.reduce((acc: any, criteria: any) => {
                      if (!acc[criteria.category]) {
                        acc[criteria.category] = [];
                      }
                      acc[criteria.category].push(criteria);
                      return acc;
                    }, {})
                    //eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ).map(([category, categoryCriteria]: [string, any]) => {
                    //eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const categoryTotal = categoryCriteria.reduce((sum: number, c: any) => sum + c.maxPoints, 0);

                    return (
                      <div key={category} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm text-gray-900">{category}</h4>
                          <Badge variant="outline" className="text-xs">
                            {categoryTotal} pts
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          {/*eslint-disable-next-line @typescript-eslint/no-explicit-any*/}
                          {categoryCriteria.map((criteria: any) => (
                            <div key={criteria.name} className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">{criteria.name}</span>
                              <span className="font-medium text-gray-900">{criteria.maxPoints}pts</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {isCreating ? (
              <>
                <Settings className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Configuration
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 