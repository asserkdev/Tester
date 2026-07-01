import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useScanStore } from '../stores/scanStore';
import { ScoreCard } from '../components/dashboard/ScoreCard';
import { SeverityChart } from '../components/dashboard/SeverityChart';
import { CategoryChart } from '../components/dashboard/CategoryChart';
import { IssueList } from '../components/results/IssueList';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Download, ArrowLeft, RefreshCw, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import type { Severity, AnalyzerCategory } from '../types';

export function Results() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentScan, results, stats, score, fetchScan, fetchResults, isLoading } = useScanStore();
  const [, setSelectedResult] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchScan(id);
      fetchResults(id);
    }
  }, [id, fetchScan, fetchResults]);

  const handleExport = (format: 'json' | 'csv') => {
    const data = format === 'json' 
      ? JSON.stringify({ scan: currentScan, results, stats, score }, null, 2)
      : resultsToCSV(results);
    
    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scan-${id}-${new Date().toISOString().split('T')[0]}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const criticalCount = stats?.bySeverity?.critical || 0;
  const highCount = stats?.bySeverity?.high || 0;
  const totalIssues = stats?.total || 0;

  if (isLoading && !currentScan) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Scan Results</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {currentScan?.url}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => id && fetchResults(id)}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <div className="relative group">
            <Button variant="secondary">
              <Download className="w-4 h-4" />
              Export
            </Button>
            <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                onClick={() => handleExport('json')}
              >
                Export as JSON
              </button>
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                onClick={() => handleExport('csv')}
              >
                Export as CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <Card className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {currentScan?.status === 'completed' ? (
              <CheckCircle className="w-8 h-8 text-green-500" />
            ) : (
              <XCircle className="w-8 h-8 text-red-500" />
            )}
            <div>
              <p className="font-medium text-slate-900 dark:text-white">
                {currentScan?.status === 'completed' ? 'Scan Completed Successfully' : 'Scan Failed'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {currentScan?.completedAt 
                  ? `Completed on ${new Date(currentScan.completedAt).toLocaleString()}`
                  : currentScan?.error || 'Unknown error'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge severity={currentScan?.status === 'completed' ? 'low' : 'critical'} />
            <a
              href={currentScan?.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </a>
          </div>
        </div>
      </Card>

      {/* Score Cards */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <ScoreCard
          score={score}
          totalIssues={totalIssues}
          criticalCount={criticalCount}
          highCount={highCount}
        />
        <SeverityChart data={(stats?.bySeverity as Record<Severity, number>) || {}} />
        <CategoryChart data={(stats?.byCategory as Record<AnalyzerCategory, number>) || {}} />
      </div>

      {/* Results List */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Issues ({results.length})
        </h2>
        <IssueList
          results={results}
          onSelectIssue={(result) => setSelectedResult(result.id)}
        />
      </div>
    </div>
  );
}

function resultsToCSV(results: any[]): string {
  const headers = [
    'ID', 'Severity', 'Category', 'Title', 'Description', 
    'URL', 'Why It Matters', 'Recommended Fix', 'Created At'
  ];
  
  const rows = results.map((r) => [
    r.id,
    r.severity,
    r.category,
    `"${r.title.replace(/"/g, '""')}"`,
    `"${r.description.replace(/"/g, '""')}"`,
    r.location?.url || '',
    `"${(r.whyItMatters || '').replace(/"/g, '""')}"`,
    `"${(r.recommendedFix || '').replace(/"/g, '""')}"`,
    r.createdAt,
  ]);
  
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
