"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Info, Eye, EyeSlash, CaretDown, CaretUp } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface ScoringLevel {
    level: string;
    points: number;
    description: string;
}

interface Criterion {
    id: number;
    criteriaName?: string;
    name?: string;
    weight: number;
    maxPoints?: number;
    description?: string;
    category?: string;
    scoringLogic?: string;
    scoringLevels?: ScoringLevel[];
}

interface ScoringSectionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    category: string;
    criteria: Criterion[];
    initialScores: Record<number, number>;
    initialNotes: Record<number, string>;
    onSave: (scores: Record<number, number>, notes: Record<number, string>) => void;
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    applicationData?: any;
}

// Generate scoring options based on max weight
function generateScoringOptions(maxWeight: number): { score: number; label: string; description: string }[] {
    // Create 3-4 options (High, Medium, Low or similar)
    if (maxWeight <= 5) {
        return [
            { score: maxWeight, label: 'High', description: 'Excellent - Fully meets criteria' },
            { score: Math.round(maxWeight * 0.6), label: 'Medium', description: 'Adequate - Partially meets criteria' },
            { score: Math.round(maxWeight * 0.2), label: 'Low', description: 'Limited - Barely meets criteria' },
            { score: 0, label: 'None', description: 'Does not meet criteria' }
        ];
    } else if (maxWeight <= 10) {
        return [
            { score: maxWeight, label: 'High', description: 'Excellent - Fully demonstrates capability' },
            { score: Math.round(maxWeight * 0.7), label: 'Medium-High', description: 'Good - Mostly meets criteria' },
            { score: Math.round(maxWeight * 0.5), label: 'Medium', description: 'Adequate - Partially meets criteria' },
            { score: Math.round(maxWeight * 0.2), label: 'Low', description: 'Limited - Minimal demonstration' },
            { score: 0, label: 'None', description: 'Does not meet criteria' }
        ];
    } else {
        return [
            { score: maxWeight, label: 'Excellent', description: 'Outstanding demonstration of criteria' },
            { score: Math.round(maxWeight * 0.8), label: 'Very Good', description: 'Strong evidence of meeting criteria' },
            { score: Math.round(maxWeight * 0.6), label: 'Good', description: 'Adequate evidence of criteria' },
            { score: Math.round(maxWeight * 0.4), label: 'Fair', description: 'Some evidence but gaps exist' },
            { score: Math.round(maxWeight * 0.2), label: 'Poor', description: 'Limited evidence' },
            { score: 0, label: 'None', description: 'No evidence of criteria' }
        ];
    }
}

// Mapping of criteria keywords to application data fields
//eslint-disable-next-line @typescript-eslint/no-explicit-any
function getRelevantData(criteriaName: string, category: string, app: any): { label: string; value: string }[] {
    if (!app) return [];

    const name = criteriaName.toLowerCase();
    const cat = category.toLowerCase();
    const results: { label: string; value: string }[] = [];

    // Innovation / Climate
    if (name.includes('innovation') || name.includes('climate') || name.includes('adaptation') || cat.includes('innovation')) {
        if (app.business?.climateAdaptationContribution) results.push({ label: "Climate Contribution", value: app.business.climateAdaptationContribution });
        if (app.business?.problemSolved) results.push({ label: "Problem Solved", value: app.business.problemSolved });
        if (app.business?.businessModelUniquenessDescription) results.push({ label: "Uniqueness", value: app.business.businessModelUniquenessDescription });
    }

    // Market / Demand
    if (name.includes('market') || name.includes('demand') || name.includes('customer')) {
        if (app.business?.targetCustomers) results.push({ label: "Target Customers", value: app.business.targetCustomers });
        if (app.business?.marketSize) results.push({ label: "Market Size", value: app.business.marketSize });
        if (app.business?.competitiveAdvantage) results.push({ label: "Competitive Advantage", value: app.business.competitiveAdvantage });
    }

    // Business / Financial / Viability
    if (name.includes('business') || name.includes('viability') || name.includes('financial') || name.includes('revenue') || cat.includes('viability')) {
        if (app.business?.revenueLastTwoYears) results.push({ label: "Revenue (Last 2 Years)", value: `KES ${Number(app.business.revenueLastTwoYears).toLocaleString()}` });
        if (app.business?.unitPrice) results.push({ label: "Unit Price", value: `KES ${Number(app.business.unitPrice).toLocaleString()}` });
        if (app.revenues?.revenueLastYear) results.push({ label: "Revenue Last Year", value: `KES ${Number(app.revenues.revenueLastYear).toLocaleString()}` });
        if (app.business?.growthHistory || app.revenues?.growthHistory) results.push({ label: "Growth History", value: app.business?.growthHistory || app.revenues?.growthHistory });
    }

    // Management / Team / Capacity
    if (name.includes('management') || name.includes('capacity') || name.includes('team') || name.includes('entrepreneur')) {
        if (app.applicant?.highestEducation) results.push({ label: "Education", value: app.applicant.highestEducation });
        if (app.impactPotential?.fullTimeEmployeesTotal) results.push({ label: "Full-Time Employees", value: String(app.impactPotential.fullTimeEmployeesTotal) });
        if (app.business?.isRegistered !== undefined) results.push({ label: "Registered Business", value: app.business.isRegistered ? "Yes" : "No" });
    }

    // Social Impact / Environmental
    if (name.includes('social') || name.includes('environment') || name.includes('impact')) {
        if (app.socialImpact?.environmentalImpact) results.push({ label: "Environmental Impact", value: app.socialImpact.environmentalImpact });
        if (app.socialImpact?.socialImpactContribution) results.push({ label: "Social Impact", value: app.socialImpact.socialImpactContribution });
        if (app.impactPotential?.fullTimeEmployeesWomen) results.push({ label: "Women Employed", value: String(app.impactPotential.fullTimeEmployeesWomen) });
        if (app.impactPotential?.fullTimeEmployeesYouth) results.push({ label: "Youth Employed", value: String(app.impactPotential.fullTimeEmployeesYouth) });
    }

    // Sector / Alignment / Strategic
    if (name.includes('sector') || name.includes('alignment') || name.includes('strategic') || cat.includes('alignment')) {
        if (app.business?.sector) results.push({ label: "Sector", value: app.business.sector });
        if (app.business?.county) results.push({ label: "County", value: app.business.county });
        if (app.business?.description) results.push({ label: "Business Description", value: app.business.description });
    }

    // Organization / Partnerships
    if (name.includes('organization') || name.includes('partner') || name.includes('governance')) {
        if (app.business?.isRegistered !== undefined) results.push({ label: "Registered", value: app.business.isRegistered ? "Yes" : "No" });
        if (app.business?.registrationNumber) results.push({ label: "Registration Number", value: app.business.registrationNumber });
        if (app.business?.startDate) results.push({ label: "Founded", value: new Date(app.business.startDate).toLocaleDateString() });
    }

    // Fallback: show general info if no specific match
    if (results.length === 0) {
        if (app.business?.description) results.push({ label: "Business Description", value: app.business.description });
        if (app.business?.problemSolved) results.push({ label: "Problem Solved", value: app.business.problemSolved });
    }

    return results;
}

export function ScoringSectionModal({
    open,
    onOpenChange,
    category,
    criteria,
    initialScores,
    initialNotes,
    onSave,
    applicationData
}: ScoringSectionModalProps) {
    const [scores, setScores] = useState<Record<number, number>>(initialScores);
    const [notes, setNotes] = useState<Record<number, string>>(initialNotes);
    const [expandedData, setExpandedData] = useState<Record<number, boolean>>({});

    useEffect(() => {
        if (open) {
            setScores(initialScores);
            setNotes(initialNotes);
            setExpandedData({});
        }
    }, [open, initialScores, initialNotes]);

    const handleScoreSelect = (id: number, score: number) => {
        setScores(prev => ({ ...prev, [id]: score }));
    };

    const handleNoteChange = (id: number, val: string) => {
        setNotes(prev => ({ ...prev, [id]: val }));
    };

    const toggleDataView = (id: number) => {
        setExpandedData(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const currentTotal = criteria.reduce((sum, c) => sum + (scores[c.id] || 0), 0);
    const maxTotal = criteria.reduce((sum, c) => sum + c.weight, 0);
    const completedCount = criteria.filter(c => scores[c.id] !== undefined && scores[c.id] > 0).length;

    const handleSave = () => {
        onSave(scores, notes);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto flex flex-col p-0 gap-0 rounded-2xl">
                <div className="p-6 border-b border-gray-100 bg-white/50 backdrop-blur-xl sticky top-0 z-10">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle className="text-xl font-bold text-gray-900">{category}</DialogTitle>
                                <DialogDescription className="text-gray-500 mt-1">
                                    Select the appropriate score for each criterion. Click on an option to assign the score.
                                </DialogDescription>
                            </div>
                            <Badge variant="secondary" className="text-lg px-3 py-1 font-mono bg-blue-50 text-blue-700 border-blue-100">
                                {currentTotal} <span className="text-gray-400 text-sm mx-1">/</span> {maxTotal}
                            </Badge>
                        </div>
                        <div className="mt-2 text-sm text-gray-500">
                            {completedCount}/{criteria.length} criteria scored
                        </div>
                    </DialogHeader>
                </div>

                <div className="flex-1 p-6 space-y-6 bg-gray-50/50">
                    {criteria.map((c) => {
                        const criterionName = c.criteriaName || c.name || '';
                        const relevantData = getRelevantData(criterionName, category, applicationData);
                        const isExpanded = expandedData[c.id];
                        // Use scoringLevels from config if available, otherwise generate generic options
                        const options = c.scoringLevels
                            ? c.scoringLevels.map(sl => ({ score: sl.points, label: sl.level, description: sl.description }))
                            : generateScoringOptions(c.weight || c.maxPoints || 10);
                        const currentScore = scores[c.id];
                        const isScored = currentScore !== undefined;

                        return (
                            <div key={c.id} className={cn(
                                "bg-white p-5 rounded-xl border shadow-sm transition-all",
                                isScored ? "border-green-200 bg-green-50/30" : "border-gray-100 hover:shadow-md"
                            )}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="space-y-1 flex-1">
                                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                            {criterionName}
                                            {isScored && <CheckCircle weight="fill" className="w-5 h-5 text-green-500" />}
                                        </h4>
                                        {c.description && (
                                            <p className="text-sm text-gray-500 mt-1">{c.description}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {relevantData.length > 0 && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => toggleDataView(c.id)}
                                                className={cn("text-xs gap-1", isExpanded && "bg-blue-50 border-blue-200 text-blue-700")}
                                            >
                                                {isExpanded ? <EyeSlash size={14} /> : <Eye size={14} />}
                                                {isExpanded ? "Hide Data" : "View Data"}
                                                {isExpanded ? <CaretUp size={12} /> : <CaretDown size={12} />}
                                            </Button>
                                        )}
                                        <Badge variant={isScored ? "default" : "outline"} className={cn("font-mono text-xs", isScored && "bg-green-600")}>
                                            {currentScore || 0} / {c.weight}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Applicant Data Panel */}
                                {isExpanded && relevantData.length > 0 && (
                                    <div className="mb-4 p-4 bg-blue-50/50 border border-blue-100 rounded-lg space-y-3 animate-in slide-in-from-top-2 duration-200">
                                        <Label className="text-xs font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-1">
                                            <Eye size={12} /> Applicant&apos;s Submission
                                        </Label>
                                        <div className="grid gap-3">
                                            {relevantData.map((item, idx) => (
                                                <div key={idx} className="bg-white p-3 rounded-lg border border-blue-100">
                                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{item.label}</p>
                                                    <p className="text-sm text-gray-900 leading-relaxed">{item.value || <span className="italic text-gray-400">N/A</span>}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Scoring Options - Clickable Buttons */}
                                <div className="space-y-2 mb-4">
                                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        Select Score
                                    </Label>
                                    <div className="grid gap-2">
                                        {options.map((option) => (
                                            <button
                                                key={option.score}
                                                type="button"
                                                onClick={() => handleScoreSelect(c.id, option.score)}
                                                className={cn(
                                                    "relative flex items-center p-3 rounded-xl transition-all duration-200 border text-left group/btn",
                                                    currentScore === option.score
                                                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200 scale-[1.01]'
                                                        : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:shadow-sm'
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm mr-3 transition-colors",
                                                    currentScore === option.score
                                                        ? 'bg-white/20 text-white'
                                                        : 'bg-gray-100 text-gray-600 group-hover/btn:bg-blue-50 group-hover/btn:text-blue-600'
                                                )}>
                                                    {option.score}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-semibold text-sm">{option.label}</div>
                                                    <div className={cn(
                                                        "text-xs mt-0.5",
                                                        currentScore === option.score ? 'text-blue-100' : 'text-gray-400'
                                                    )}>
                                                        {option.description}
                                                    </div>
                                                </div>
                                                {currentScore === option.score && (
                                                    <CheckCircle weight="fill" className="w-5 h-5 text-white ml-2" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Comments */}
                                <div className="space-y-2">
                                    <Label htmlFor={`note-${c.id}`} className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                        Comments (Optional)
                                    </Label>
                                    <Textarea
                                        id={`note-${c.id}`}
                                        placeholder="Add observations..."
                                        className="resize-none h-20 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                                        value={notes[c.id] || ""}
                                        onChange={(e) => handleNoteChange(c.id, e.target.value)}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-gray-100 bg-white sticky bottom-0 z-10 flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Save Section
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
