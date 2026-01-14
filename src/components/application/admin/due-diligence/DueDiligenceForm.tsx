"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    CheckCircle,
    Warning,
    CaretDown,
    Info,
    Circle,
    Phone,
    MapPin,
    ShieldCheck
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { saveDueDiligenceItem, saveDueDiligenceFinalDecision } from "@/lib/actions/due-diligence";
import { toast } from "sonner";
import { DueDiligenceItem } from "../../../../../db/schema";
import { FinalDecisionModal } from "./FinalDecisionModal";
import { FloppyDisk } from "@phosphor-icons/react";

interface ScoringCriterion {
    name: string;
    options: {
        score: number; // 0, 1, 3, 5
        label: string;
        description?: string;
    }[];
    guidelines: string;
}

interface ScoringCategory {
    title: string;
    criteria: ScoringCriterion[];
}

export type PhaseConfig = ScoringCategory[];

interface DueDiligenceFormProps {
    applicationId: number;
    phase: 'phase1' | 'phase2';
    config: PhaseConfig;
    existingItems: DueDiligenceItem[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onUpdate?: () => void;
}

export function DueDiligenceForm({
    applicationId,
    phase,
    config,
    existingItems,
    onUpdate
}: DueDiligenceFormProps) {
    const [saving, setSaving] = useState<string | null>(null); // criterion name being saved

    // Helper to find current score
    const getItem = (criterion: string) => existingItems.find(i =>
        i.phase === phase && i.criterion === criterion
    );

    const handleScoreSelect = async (category: string, criterion: string, score: number) => {
        setSaving(criterion);
        const item = getItem(criterion);

        try {
            const result = await saveDueDiligenceItem(
                applicationId,
                phase,
                category,
                criterion,
                score,
                item?.comments ?? undefined
            );

            if (result.success) {
                if (onUpdate) onUpdate();
            } else {
                toast.error("Failed to save score");
            }
        } finally {
            setSaving(null);
        }
    };

    const handleCommentBlur = async (category: string, criterion: string, comment: string) => {
        const item = getItem(criterion);
        // Only save if changed
        if (item?.comments === comment) return;

        setSaving(criterion);
        try {
            await saveDueDiligenceItem(
                applicationId,
                phase,
                category,
                criterion,
                item?.score || 0,
                comment
            );
            if (onUpdate) onUpdate();
        } finally {
            setSaving(null);
        }
    };

    // --- Final Decision Logic ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDecisionSaving, setIsDecisionSaving] = useState(false);

    const checkScoringCompletion = () => {
        const missingCriteria: string[] = [];
        config.forEach(category => {
            category.criteria.forEach(criterion => {
                const item = getItem(criterion.name);
                if (!item || item.score === null || item.score === undefined) {
                    missingCriteria.push(criterion.name);
                }
            });
        });

        if (missingCriteria.length > 0) {
            toast.error(
                <div>
                    <p className="font-bold mb-1">Incomplete Scoring</p>
                    <p className="text-xs">Please score all criteria before saving. Missing: {missingCriteria.join(", ")}</p>
                </div>,
                { duration: 5000 }
            );
            return false;
        }
        return true;
    };

    const handleOpenModal = () => {
        if (checkScoringCompletion()) {
            setIsModalOpen(true);
        }
    };

    const handleConfirmDecision = async (verdict: 'pass' | 'fail', reason: string) => {
        setIsDecisionSaving(true);
        try {
            const result = await saveDueDiligenceFinalDecision(applicationId, verdict, reason);
            if (result.success) {
                toast.success(result.message);
                setIsModalOpen(false);
                if (onUpdate) onUpdate();
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error("An error occurred while saving decision");
        } finally {
            setIsDecisionSaving(false);
        }
    };


    // Calculate total score for display
    const currentTotal = existingItems
        .filter(i => i.phase === phase)
        .reduce((sum, i) => sum + (i.score || 0), 0);

    // Calculate max possible score
    const totalCriteria = config.reduce((count, cat) => count + cat.criteria.length, 0);
    const maxScore = totalCriteria * 5;
    const progress = (currentTotal / maxScore) * 100;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Score Card */}
            <div className="sticky top-4 z-20 bg-white/80 backdrop-blur-md border border-slate-200 shadow-sm rounded-2xl p-4 flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${phase === 'phase1' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                        {phase === 'phase1' ? <Phone weight="duotone" className="w-6 h-6" /> : <MapPin weight="duotone" className="w-6 h-6" />}
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900">
                            {phase === 'phase1' ? "Phase 1: Phone / Desk" : "Phase 2: Physical Visit"}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                            {existingItems.filter(i => i.phase === phase).length} of {totalCriteria} criteria scored
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <div className="text-sm text-slate-500 font-medium">Total Score</div>
                        <div className="text-2xl font-bold text-slate-900">
                            {currentTotal} <span className="text-sm text-slate-400 font-normal">/ {maxScore}</span>
                        </div>
                    </div>
                    {/* Progress Circle */}
                    <div className="relative w-12 h-12 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="24" cy="24" r="20" stroke="#f1f5f9" strokeWidth="4" fill="none" />
                            <circle cx="24" cy="24" r="20" stroke="#3b82f6" strokeWidth="4" fill="none"
                                strokeDasharray={125.6}
                                strokeDashoffset={125.6 - (125.6 * progress / 100)}
                                className="transition-all duration-1000 ease-out"
                            />
                        </svg>
                        <span className="absolute text-[10px] font-bold text-slate-700">{Math.round(progress)}%</span>
                    </div>

                    <div className="h-8 w-px bg-slate-200" />

                    <Button
                        onClick={handleOpenModal}
                        className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-6 h-12 font-bold shadow-lg shadow-slate-200 transition-all hover:-translate-y-0.5 gap-2"
                    >
                        <FloppyDisk size={20} weight="bold" />
                        Save Score
                    </Button>
                </div>
            </div>

            <Accordion type="multiple" defaultValue={config.map((_, i) => `item-${i}`)} className="space-y-6">
                {config.map((category, idx) => (
                    <AccordionItem key={idx} value={`item-${idx}`} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <AccordionTrigger className="px-6 py-4 hover:bg-slate-50/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                                    <span className="font-bold text-sm">{idx + 1}</span>
                                </div>
                                <span className="font-semibold text-lg text-slate-800">{category.title}</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6 pt-2">
                            <div className="grid gap-8">
                                {category.criteria.map((criterion, cIdx) => {
                                    const currentItem = getItem(criterion.name);
                                    const currentScore = currentItem?.score;
                                    const isSaving = saving === criterion.name;

                                    return (
                                        <div key={cIdx} className="group border-b border-slate-100 last:border-0 pb-8 last:pb-0">
                                            <div className="flex flex-col md:flex-row gap-6">
                                                {/* Left: Criteria & Guidelines */}
                                                <div className="flex-1 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-semibold text-slate-900 text-base flex items-center gap-2">
                                                            {criterion.name}
                                                            {currentScore !== undefined && (
                                                                <CheckCircle weight="fill" className="w-5 h-5 text-green-500 animate-pulse-once" />
                                                            )}
                                                        </h4>
                                                    </div>

                                                    <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100">
                                                        <div className="flex items-start gap-2 text-indigo-600 mb-2">
                                                            <Info weight="duotone" className="w-4 h-4 mt-0.5 shrink-0" />
                                                            <span className="text-xs font-bold uppercase tracking-wide">Scorer Guidelines</span>
                                                        </div>
                                                        <p className="text-sm text-slate-600 leading-relaxed">
                                                            {criterion.guidelines}
                                                        </p>
                                                    </div>

                                                    <div className="pt-2">
                                                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 block">
                                                            Evaluator Comments
                                                        </label>
                                                        <Textarea
                                                            placeholder="Add specific observations or justification..."
                                                            className="min-h-[80px] resize-none bg-white border-slate-200 rounded-xl focus:ring-blue-500/20"
                                                            defaultValue={currentItem?.comments || ""}
                                                            onBlur={(e) => handleCommentBlur(category.title, criterion.name, e.target.value)}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Right: Scoring Options */}
                                                <div className="w-full md:w-[320px] bg-slate-50/50 rounded-2xl p-4 border border-slate-100/60 shrink-0">
                                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 block flex items-center justify-between">
                                                        Score
                                                        {isSaving && <span className="text-blue-600 animate-pulse">Saving...</span>}
                                                    </label>
                                                    <div className="grid gap-2">
                                                        {criterion.options.map((option) => (
                                                            <button
                                                                key={option.score}
                                                                onClick={() => handleScoreSelect(category.title, criterion.name, option.score)}
                                                                disabled={isSaving}
                                                                className={`
                                                                    relative flex items-center p-3 rounded-xl transition-all duration-200 border text-left group/btn
                                                                    ${currentScore === option.score
                                                                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200 scale-[1.02]'
                                                                        : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:shadow-sm'
                                                                    }
                                                                `}
                                                            >
                                                                <div className={`
                                                                    w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm mr-3 transition-colors
                                                                    ${currentScore === option.score ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover/btn:bg-blue-50 group-hover/btn:text-blue-600'}
                                                                `}>
                                                                    {option.score}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="font-semibold text-sm">{option.label}</div>
                                                                    {option.description && (
                                                                        <div className={`text-xs mt-0.5 ${currentScore === option.score ? 'text-blue-100' : 'text-slate-400'}`}>
                                                                            {option.description}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {currentScore === option.score && (
                                                                    <CheckCircle weight="fill" className="w-5 h-5 text-white ml-2" />
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>

            <FinalDecisionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleConfirmDecision}
                isSaving={isDecisionSaving}
            />
        </div>
    );
}
