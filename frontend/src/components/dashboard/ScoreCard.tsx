import { useMemo } from 'react';
import { Card } from '../common/Card';

interface ScoreCardProps {
  score: number;
  totalIssues: number;
  criticalCount: number;
  highCount: number;
}

export function ScoreCard({ score, totalIssues, criticalCount, highCount }: ScoreCardProps) {
  const scoreColor = useMemo(() => {
    if (score >= 90) return { bg: 'bg-green-500', text: 'text-green-500', label: 'Excellent' };
    if (score >= 70) return { bg: 'bg-yellow-500', text: 'text-yellow-500', label: 'Good' };
    if (score >= 50) return { bg: 'bg-orange-500', text: 'text-orange-500', label: 'Needs Work' };
    return { bg: 'bg-red-500', text: 'text-red-500', label: 'Critical' };
  }, [score]);

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-secondary-500/10" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Overall Score</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-5xl font-bold ${scoreColor.text}`}>{score}</span>
              <span className="text-2xl text-slate-400">/100</span>
            </div>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${scoreColor.bg} text-white`}>
              {scoreColor.label}
            </span>
          </div>
          <div className="relative w-32 h-32">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                className="text-slate-200 dark:text-slate-700"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                strokeDasharray={`${(score / 100) * 352} 352`}
                strokeLinecap="round"
                className={scoreColor.text}
              />
            </svg>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalIssues}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Issues</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-500">{criticalCount}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Critical</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-500">{highCount}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">High</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
