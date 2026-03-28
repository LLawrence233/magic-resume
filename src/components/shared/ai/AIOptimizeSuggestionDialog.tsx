"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  User,
  GraduationCap,
  Briefcase,
  FolderKanban,
  Wrench,
  MessageSquareQuote,
  Layout,
  TrendingUp,
  CheckCircle2,
  Lightbulb,
  Target,
  Award,
  ArrowUp,
  ArrowDown,
  Minus,
  History,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/compat/client";
import { useAIConfigStore } from "@/store/useAIConfigStore";

interface Suggestion {
  category: string;
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  example?: string;
}

interface OptimizeResult {
  score: number;
  suggestions: Suggestion[];
  strengths: string[];
  summary: string;
}

interface HistoryRecord {
  id: string;
  timestamp: number;
  score: number;
  result: OptimizeResult;
}

interface AIOptimizeSuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumeData: Record<string, unknown>;
}

const categoryConfig: Record<string, { icon: typeof User; color: string; bgColor: string; labelKey: string }> = {
  basic: { icon: User, color: "text-blue-500", bgColor: "bg-blue-500/10", labelKey: "category.basic" },
  education: { icon: GraduationCap, color: "text-emerald-500", bgColor: "bg-emerald-500/10", labelKey: "category.education" },
  experience: { icon: Briefcase, color: "text-violet-500", bgColor: "bg-violet-500/10", labelKey: "category.experience" },
  project: { icon: FolderKanban, color: "text-orange-500", bgColor: "bg-orange-500/10", labelKey: "category.project" },
  skills: { icon: Wrench, color: "text-cyan-500", bgColor: "bg-cyan-500/10", labelKey: "category.skills" },
  evaluation: { icon: MessageSquareQuote, color: "text-pink-500", bgColor: "bg-pink-500/10", labelKey: "category.evaluation" },
  overall: { icon: Layout, color: "text-slate-500", bgColor: "bg-slate-500/10", labelKey: "category.overall" },
};

const priorityConfig: Record<string, { color: string; bgColor: string; borderColor: string; labelKey: string }> = {
  high: {
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    borderColor: "border-l-red-500",
    labelKey: "priority.high",
  },
  medium: {
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-l-amber-500",
    labelKey: "priority.medium",
  },
  low: {
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    borderColor: "border-l-emerald-500",
    labelKey: "priority.low",
  },
};

const HISTORY_STORAGE_KEY = "ai-optimize-history";

export const AIOptimizeSuggestionDialog = ({
  open,
  onOpenChange,
  resumeData,
}: AIOptimizeSuggestionDialogProps) => {
  const t = useTranslations();
  const { selectedModel, ...config } = useAIConfigStore();

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // 加载历史记录
  useEffect(() => {
    if (open) {
      try {
        const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (stored) {
          setHistory(JSON.parse(stored));
        }
      } catch {
        // ignore
      }
    }
  }, [open]);

  // 重置状态
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setResult(null);
        setError(null);
        setShowHistory(false);
      }, 300);
    }
  }, [open]);

  // 保存结果到历史
  const saveToHistory = (result: OptimizeResult) => {
    const newRecord: HistoryRecord = {
      id: `history-${Date.now()}`,
      timestamp: Date.now(),
      score: result.score,
      result,
    };
    const newHistory = [newRecord, ...history].slice(0, 10); // 保留最近10条
    setHistory(newHistory);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
  };

  // 清除历史
  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  };

  // 计算分数变化
  const scoreChange = useMemo(() => {
    if (!result || history.length === 0) return null;
    const lastScore = history[0]?.score;
    if (lastScore === undefined) return null;
    return result.score - lastScore;
  }, [result, history]);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setShowHistory(false);

    try {
      const apiKey =
        selectedModel === "doubao"
          ? config.doubaoApiKey
          : selectedModel === "openai"
            ? config.openaiApiKey
            : selectedModel === "gemini"
              ? config.geminiApiKey
              : selectedModel === "zhipu"
                ? config.zhipuApiKey
                : config.deepseekApiKey;

      const modelId =
        selectedModel === "doubao"
          ? config.doubaoModelId
          : selectedModel === "openai"
            ? config.openaiModelId
            : selectedModel === "gemini"
              ? config.geminiModelId
              : selectedModel === "zhipu"
                ? config.zhipuModelId
                : undefined;

      if (!apiKey) {
        setError(t("optimizeSuggestion.error.noApiKey"));
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/resume/optimize-suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeData,
          modelType: selectedModel,
          apiKey,
          modelId,
          apiEndpoint: selectedModel === "openai" ? config.openaiApiEndpoint : undefined,
          locale: typeof window !== "undefined" ? document.documentElement.lang : "zh",
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || t("optimizeSuggestion.error.unknown"));
        setIsLoading(false);
        return;
      }

      setResult(data.data);
      saveToHistory(data.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("optimizeSuggestion.error.unknown")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreConfig = (score: number) => {
    if (score >= 80) return {
      color: "text-emerald-500",
      gradient: "from-emerald-500 via-green-500 to-teal-500",
      bgGradient: "from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50",
      ringColor: "stroke-emerald-500",
      label: t("optimizeSuggestion.scoreLevel.excellent"),
    };
    if (score >= 60) return {
      color: "text-amber-500",
      gradient: "from-amber-500 via-yellow-500 to-orange-500",
      bgGradient: "from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50",
      ringColor: "stroke-amber-500",
      label: t("optimizeSuggestion.scoreLevel.good"),
    };
    return {
      color: "text-red-500",
      gradient: "from-red-500 via-rose-500 to-orange-500",
      bgGradient: "from-red-50 to-rose-50 dark:from-red-950/50 dark:to-rose-950/50",
      ringColor: "stroke-red-500",
      label: t("optimizeSuggestion.scoreLevel.needsWork"),
    };
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2.5 text-lg">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            {t("optimizeSuggestion.title")}
          </DialogTitle>
          <DialogDescription className="ml-11">
            {t("optimizeSuggestion.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto max-h-[calc(90vh-140px)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-slate-400 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 dark:[&::-webkit-scrollbar-thumb]:hover:bg-slate-500">
          <div className="p-6">
            {/* 初始状态 */}
            {!isLoading && !result && !error && !showHistory && (
              <div className="flex flex-col items-center justify-center py-8 space-y-6">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative"
                >
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Target className="h-12 w-12 text-primary" />
                  </div>
                  <motion.div
                    className="absolute -top-1 -right-1"
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Sparkles className="h-6 w-6 text-amber-500" />
                  </motion.div>
                </motion.div>
                <div className="text-center space-y-2">
                  <p className="text-muted-foreground max-w-sm">
                    {t("optimizeSuggestion.hint")}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleAnalyze} size="lg" className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    {t("optimizeSuggestion.analyze")}
                  </Button>
                  {history.length > 0 && (
                    <Button variant="outline" size="lg" onClick={() => setShowHistory(true)}>
                      <History className="h-4 w-4 mr-2" />
                      {t("optimizeSuggestion.viewHistory")}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* 历史记录 */}
            {showHistory && !result && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium flex items-center gap-2">
                    <History className="h-4 w-4" />
                    {t("optimizeSuggestion.history")}
                  </h3>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                      {t("common.back")}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearHistory} className="text-red-500 hover:text-red-600">
                      <Trash2 className="h-4 w-4 mr-1" />
                      {t("common.clear")}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {history.map((record) => (
                    <div
                      key={record.id}
                      className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => {
                        setResult(record.result);
                        setShowHistory(false);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {formatDate(record.timestamp)}
                        </span>
                        <Badge variant="outline" className={getScoreConfig(record.score).color}>
                          {record.score}分
                        </Badge>
                      </div>
                      <p className="text-sm mt-1 line-clamp-1">{record.result.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 加载状态 */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <div className="relative">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="h-14 w-14 text-primary" />
                  </motion.div>
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.2, 1] }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    <Sparkles className="h-5 w-5 text-primary" />
                  </motion.div>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-muted-foreground">
                    {t("optimizeSuggestion.analyzing")}
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    {t("optimizeSuggestion.analyzingHint")}
                  </p>
                </div>
              </div>
            )}

            {/* 错误状态 */}
            {error && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
                <p className="text-red-500 text-center max-w-sm">{error}</p>
                <Button variant="outline" onClick={handleAnalyze}>
                  {t("optimizeSuggestion.retry")}
                </Button>
              </div>
            )}

            {/* 结果展示 */}
            {result && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* 评分展示 */}
                <div className={cn(
                  "relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br",
                  getScoreConfig(result.score).bgGradient
                )}>
                  <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                    <Award className="w-full h-full" />
                  </div>
                  <div className="flex items-center gap-6">
                    {/* 圆环评分 */}
                    <div className="relative shrink-0">
                      <svg className="w-28 h-28 transform -rotate-90">
                        <circle
                          cx="56"
                          cy="56"
                          r="48"
                          stroke="currentColor"
                          strokeWidth="6"
                          fill="none"
                          className="text-black/5 dark:text-white/5"
                        />
                        <motion.circle
                          cx="56"
                          cy="56"
                          r="48"
                          stroke="currentColor"
                          strokeWidth="6"
                          fill="none"
                          strokeLinecap="round"
                          initial={{ strokeDashoffset: 301.44 }}
                          animate={{ strokeDashoffset: 301.44 - (301.44 * result.score) / 100 }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          strokeDasharray={301.44}
                          className={getScoreConfig(result.score).ringColor}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", delay: 0.5 }}
                          className={cn("text-4xl font-bold", getScoreConfig(result.score).color)}
                        >
                          {result.score}
                        </motion.span>
                        <span className="text-xs text-muted-foreground">
                          {t("optimizeSuggestion.scoreLabel")}
                        </span>
                      </div>
                    </div>

                    {/* 评分信息 */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className={cn("bg-gradient-to-r text-white border-0", getScoreConfig(result.score).gradient)}>
                          {getScoreConfig(result.score).label}
                        </Badge>
                        {scoreChange !== null && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className={cn(
                                    "flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full",
                                    scoreChange > 0 ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" :
                                    scoreChange < 0 ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                                    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                  )}
                                >
                                  {scoreChange > 0 ? <ArrowUp className="h-3 w-3" /> :
                                   scoreChange < 0 ? <ArrowDown className="h-3 w-3" /> :
                                   <Minus className="h-3 w-3" />}
                                  {Math.abs(scoreChange)}
                                </motion.div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {t("optimizeSuggestion.scoreChange", { change: scoreChange > 0 ? `+${scoreChange}` : scoreChange })}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {result.summary}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 亮点 */}
                {result.strengths && result.strengths.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <div className="p-1 rounded-md bg-emerald-500/10">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      {t("optimizeSuggestion.strengths")}
                    </h4>
                    <div className="grid gap-2">
                      {result.strengths.map((strength, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30"
                        >
                          <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-sm text-emerald-700 dark:text-emerald-300">{strength}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 建议列表 */}
                {result.suggestions && result.suggestions.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <div className="p-1 rounded-md bg-amber-500/10">
                        <Lightbulb className="h-4 w-4" />
                      </div>
                      {t("optimizeSuggestion.suggestions")}
                      <Badge variant="secondary" className="ml-auto">
                        {result.suggestions.length}
                      </Badge>
                    </h4>
                    <div className="space-y-2">
                      {result.suggestions.map((suggestion, index) => {
                        const isExpanded = expandedSuggestion === `suggestion-${index}`;
                        const priority = priorityConfig[suggestion.priority] || priorityConfig.medium;
                        const category = categoryConfig[suggestion.category] || categoryConfig.overall;
                        const CategoryIcon = category.icon;

                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.08 }}
                            className={cn(
                              "rounded-xl border overflow-hidden transition-all duration-200",
                              isExpanded ? "border-primary/30 shadow-sm" : "border-border hover:border-primary/20"
                            )}
                          >
                            <div
                              className={cn(
                                "p-3.5 cursor-pointer flex items-start gap-3 border-l-4",
                                priority.bgColor,
                                priority.borderColor
                              )}
                              onClick={() =>
                                setExpandedSuggestion(isExpanded ? null : `suggestion-${index}`)
                              }
                            >
                              <div className={cn("p-1.5 rounded-lg shrink-0", category.bgColor)}>
                                <CategoryIcon className={cn("h-4 w-4", category.color)} />
                              </div>
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium text-sm">{suggestion.title}</p>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-[10px] px-1.5 py-0 h-4 font-normal",
                                      priority.color,
                                      "border-current/30"
                                    )}
                                  >
                                    {t(`optimizeSuggestion.${priority.labelKey}`)}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                  {suggestion.description}
                                </p>
                              </div>
                              <motion.div
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                                className="shrink-0"
                              >
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              </motion.div>
                            </div>
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="p-4 bg-muted/30 border-t space-y-2">
                                    {suggestion.example && (
                                      <>
                                        <p className="text-xs font-medium text-muted-foreground">
                                          {t("optimizeSuggestion.example")}
                                        </p>
                                        <div className="text-sm whitespace-pre-wrap bg-background p-3 rounded-lg border font-mono text-xs leading-relaxed">
                                          {suggestion.example}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 底部操作 */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleAnalyze}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {t("optimizeSuggestion.reAnalyze")}
                  </Button>
                  {history.length > 0 && (
                    <Button
                      variant="ghost"
                      onClick={() => setShowHistory(true)}
                    >
                      <History className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AIOptimizeSuggestionDialog;
