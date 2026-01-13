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

// Mapping of criteria names to application data fields based on BIRE scoring criteria
//eslint-disable-next-line @typescript-eslint/no-explicit-any
function getRelevantData(criteriaName: string, category: string, app: any): { label: string; value: string }[] {
    if (!app) return [];

    const name = criteriaName.toLowerCase();
    const cat = category.toLowerCase();
    const results: { label: string; value: string }[] = [];
    const business = app.business;

    // === FOUNDATION TRACK: COMMERCIAL VIABILITY ===
    if (name.includes('proof of sales') || name.includes('revenue') && cat.includes('commercial')) {
        if (business?.revenueLastYear) results.push({ label: "Revenue (Last Year)", value: `KES ${Number(business.revenueLastYear).toLocaleString()}` });
        if (business?.salesEvidenceUrl) results.push({ label: "Sales Evidence", value: "Document uploaded ✓" });
    }

    if (name.includes('number of customers') || name.includes('customer')) {
        if (business?.customerCount) results.push({ label: "Customer Count", value: String(business.customerCount) });
    }

    if (name.includes('external fundraising') || name.includes('funding') && !name.includes('funds raised')) {
        if (business?.hasExternalFunding !== undefined) results.push({ label: "Has External Funding", value: business.hasExternalFunding ? "Yes" : "No" });
        if (business?.externalFundingDetails) results.push({ label: "Funding Details", value: business.externalFundingDetails });
    }

    // === FOUNDATION TRACK: BUSINESS MODEL ===
    if (name.includes('business model') && cat.includes('business model')) {
        if (business?.businessModelInnovation) results.push({ label: "Business Model Innovation", value: business.businessModelInnovation });
        if (business?.businessModelDescription) results.push({ label: "Model Description", value: business.businessModelDescription });
    }

    // === FOUNDATION TRACK: MARKET POTENTIAL ===
    if (name.includes('relative pricing') || name.includes('pricing')) {
        if (business?.relativePricing) results.push({ label: "Relative Pricing", value: business.relativePricing });
        if (business?.competitorOverview) results.push({ label: "Competitor Overview", value: business.competitorOverview });
    }

    if (name.includes('product differentiation') || name.includes('differentiation') && !name.includes('market')) {
        if (business?.productDifferentiation) results.push({ label: "Product Differentiation", value: business.productDifferentiation });
    }

    if (name.includes('threat of substitutes') || name.includes('substitutes')) {
        if (business?.threatOfSubstitutes) results.push({ label: "Threat of Substitutes", value: business.threatOfSubstitutes });
    }

    if (name.includes('ease of market entry') || name.includes('market entry')) {
        if (business?.easeOfMarketEntry) results.push({ label: "Ease of Market Entry", value: business.easeOfMarketEntry });
    }

    // === FOUNDATION TRACK: SOCIAL IMPACT ===
    if (name.includes('environmental impact') || (name.includes('environmental') && cat.includes('social'))) {
        if (business?.environmentalImpact) results.push({ label: "Environmental Impact Level", value: business.environmentalImpact });
        if (business?.environmentalImpactDescription) results.push({ label: "Environmental Impact Details", value: business.environmentalImpactDescription });
    }

    if (name.includes('special groups') || name.includes('women') || name.includes('youth') || name.includes('pwd')) {
        if (business?.fullTimeEmployeesTotal) results.push({ label: "Total Full-Time Employees", value: String(business.fullTimeEmployeesTotal) });
        if (business?.fullTimeEmployeesWomen) results.push({ label: "Women Employed", value: String(business.fullTimeEmployeesWomen) });
        if (business?.fullTimeEmployeesYouth) results.push({ label: "Youth Employed", value: String(business.fullTimeEmployeesYouth) });
        if (business?.fullTimeEmployeesPwd) results.push({ label: "PWD Employed", value: String(business.fullTimeEmployeesPwd) });
    }

    if (name.includes('business compliance') || name.includes('compliance')) {
        if (business?.businessCompliance) results.push({ label: "Compliance Status", value: business.businessCompliance });
        if (business?.complianceDocumentsUrl) results.push({ label: "Compliance Documents", value: "Document uploaded ✓" });
        if (business?.isRegistered !== undefined) results.push({ label: "Business Registered", value: business.isRegistered ? "Yes" : "No" });
    }

    // === ACCELERATION TRACK: REVENUES & GROWTH ===
    if (cat.includes('revenues') || cat.includes('growth')) {
        if (name.includes('revenue') && !name.includes('growth')) {
            if (business?.revenueLastYear) results.push({ label: "Revenue (Last Year)", value: `KES ${Number(business.revenueLastYear).toLocaleString()}` });
        }
        if (name.includes('years of operation') || name.includes('operational')) {
            if (business?.yearsOperational) results.push({ label: "Years Operational", value: String(business.yearsOperational) });
        }
        if (name.includes('future') || name.includes('potential sales growth')) {
            if (business?.futureSalesGrowth) results.push({ label: "Future Growth Potential", value: business.futureSalesGrowth });
            if (business?.futureSalesGrowthReason) results.push({ label: "Growth Reason", value: business.futureSalesGrowthReason });
        }
        if (name.includes('funds raised')) {
            if (business?.hasExternalFunding !== undefined) results.push({ label: "Has Raised Funds", value: business.hasExternalFunding ? "Yes" : "No" });
            if (business?.externalFundingDetails) results.push({ label: "Funding Details", value: business.externalFundingDetails });
        }
    }

    // === ACCELERATION TRACK: IMPACT POTENTIAL ===
    if (cat.includes('impact potential')) {
        if (name.includes('current') || name.includes('employed')) {
            if (business?.fullTimeEmployeesTotal) results.push({ label: "Total Employees", value: String(business.fullTimeEmployeesTotal) });
            if (business?.fullTimeEmployeesWomen) results.push({ label: "Women Employed", value: String(business.fullTimeEmployeesWomen) });
            if (business?.fullTimeEmployeesYouth) results.push({ label: "Youth Employed", value: String(business.fullTimeEmployeesYouth) });
            if (business?.fullTimeEmployeesPwd) results.push({ label: "PWD Employed", value: String(business.fullTimeEmployeesPwd) });
        }
        if (name.includes('potential') || name.includes('create new jobs')) {
            if (business?.jobCreationPotential) results.push({ label: "Job Creation Potential", value: business.jobCreationPotential });
            if (business?.projectedInclusion) results.push({ label: "Projected Inclusion", value: business.projectedInclusion });
        }
    }

    // === ACCELERATION TRACK: SCALABILITY ===
    if (cat.includes('scalability')) {
        if (name.includes('market differentiation')) {
            if (business?.marketDifferentiation) results.push({ label: "Market Differentiation", value: business.marketDifferentiation });
            if (business?.marketDifferentiationDescription) results.push({ label: "Differentiation Details", value: business.marketDifferentiationDescription });
        }
        if (name.includes('competitive advantage') && !name.includes('strength')) {
            if (business?.competitiveAdvantage) results.push({ label: "Competitive Advantage", value: business.competitiveAdvantage });
            if (business?.competitiveAdvantageSource) results.push({ label: "Advantage Source", value: business.competitiveAdvantageSource });
        }
        if (name.includes('offering focus')) {
            if (business?.scalabilityPlan) results.push({ label: "Scalability Plan", value: business.scalabilityPlan });
        }
        if (name.includes('sales') && name.includes('marketing')) {
            if (business?.salesMarketingIntegration) results.push({ label: "Sales/Marketing Integration", value: business.salesMarketingIntegration });
            if (business?.salesMarketingApproach) results.push({ label: "Approach", value: business.salesMarketingApproach });
        }
    }

    // === ACCELERATION TRACK: SOCIAL & ENVIRONMENTAL IMPACT ===
    if (cat.includes('social') && cat.includes('environmental')) {
        if (name.includes('social impact') || name.includes('household')) {
            if (business?.socialImpactContribution) results.push({ label: "Social Impact Level", value: business.socialImpactContribution });
            if (business?.socialImpactContributionDescription) results.push({ label: "Social Impact Details", value: business.socialImpactContributionDescription });
        }
        if (name.includes('supplier')) {
            if (business?.supplierInvolvement) results.push({ label: "Supplier Involvement", value: business.supplierInvolvement });
            if (business?.supplierSupportDescription) results.push({ label: "Supplier Support", value: business.supplierSupportDescription });
        }
        if (name.includes('environmental')) {
            if (business?.environmentalImpact) results.push({ label: "Environmental Impact", value: business.environmentalImpact });
            if (business?.environmentalImpactDescription) results.push({ label: "Environmental Details", value: business.environmentalImpactDescription });
        }
    }

    // === ACCELERATION TRACK: BUSINESS MODEL ===
    if (cat.includes('business model') && !cat.includes('commercial')) {
        if (name.includes('uniqueness')) {
            if (business?.businessModelUniqueness) results.push({ label: "Business Model Uniqueness", value: business.businessModelUniqueness });
            if (business?.businessModelUniquenessDescription) results.push({ label: "Uniqueness Details", value: business.businessModelUniquenessDescription });
        }
        if (name.includes('customer value') || name.includes('proposition')) {
            if (business?.customerValueProposition) results.push({ label: "Customer Value Proposition", value: business.customerValueProposition });
        }
        if (name.includes('competitive advantage strength') || (name.includes('strength') && name.includes('competitive'))) {
            if (business?.competitiveAdvantageStrength) results.push({ label: "Competitive Advantage Strength", value: business.competitiveAdvantageStrength });
            if (business?.competitiveAdvantageBarriers) results.push({ label: "Barriers to Competition", value: business.competitiveAdvantageBarriers });
        }
    }

    // Fallback: If no specific match found, show basic business info
    if (results.length === 0) {
        if (business?.description) results.push({ label: "Business Description", value: business.description });
        if (business?.problemSolved) results.push({ label: "Problem Solved", value: business.problemSolved });
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
