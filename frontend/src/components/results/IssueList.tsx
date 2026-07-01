import { useState } from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Input } from '../common/Input';
import type { AnalyzerResult, Severity, AnalyzerCategory } from '../../types';

interface IssueListProps {
  results: AnalyzerResult[];
  onSelectIssue?: (result: AnalyzerResult) => void;
}

export function IssueList({ results, onSelectIssue }: IssueListProps) {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<Severity | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<AnalyzerCategory | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredResults = results.filter((result) => {
    if (search) {
      const searchLower = search.toLowerCase();
      if (!result.title.toLowerCase().includes(searchLower) &&
          !result.description.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    if (severityFilter && result.severity !== severityFilter) return false;
    if (categoryFilter && result.category !== categoryFilter) return false;
    return true;
  });

  const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search issues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<SearchIcon />}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            value={severityFilter || ''}
            onChange={(e) => setSeverityFilter(e.target.value as Severity || null)}
          >
            <option value="">All Severities</option>
            {severityOrder.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <select
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            value={categoryFilter || ''}
            onChange={(e) => setCategoryFilter(e.target.value as AnalyzerCategory || null)}
          >
            <option value="">All Categories</option>
            {Array.from(new Set(results.map((r) => r.category))).map((c) => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filteredResults.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-slate-400 dark:text-slate-500">No issues match your filters</p>
          </Card>
        ) : (
          filteredResults.map((result) => (
            <Card
              key={result.id}
              hover
              className={`cursor-pointer ${expandedId === result.id ? 'ring-2 ring-primary-500' : ''}`}
              onClick={() => {
                setExpandedId(expandedId === result.id ? null : result.id);
                onSelectIssue?.(result);
              }}
            >
              <div className="flex items-start gap-4">
                <Badge severity={result.severity} />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                    {result.title}
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {result.description}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {result.category}
                    </span>
                    {result.location?.url && (
                      <span className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[200px]">
                        {new URL(result.location.url).pathname}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {expandedId === result.id && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4 animate-slide-up">
                  {result.whyItMatters && (
                    <div>
                      <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Why It Matters
                      </h5>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {result.whyItMatters}
                      </p>
                    </div>
                  )}
                  {result.evidence && (
                    <div>
                      <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Evidence
                      </h5>
                      <pre className="text-xs bg-slate-100 dark:bg-slate-900 p-3 rounded-lg overflow-x-auto">
                        <code>{result.evidence}</code>
                      </pre>
                    </div>
                  )}
                  {result.recommendedFix && (
                    <div>
                      <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Recommended Fix
                      </h5>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {result.recommendedFix}
                      </p>
                    </div>
                  )}
                  {result.metadata?.wcagCriteria && result.metadata.wcagCriteria.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        WCAG Criteria
                      </h5>
                      <div className="flex gap-2">
                        {result.metadata.wcagCriteria.map((criterion) => (
                          <span
                            key={criterion}
                            className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs"
                          >
                            {criterion}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}
