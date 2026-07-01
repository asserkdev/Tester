import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useScanStore } from '../stores/scanStore';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Loader2, Trash2, ExternalLink, Clock, Globe, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import type { ScanStatus } from '../types';

export function History() {
  const { scans, isLoading, error, fetchScans, deleteScan } = useScanStore();

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this scan?')) {
      await deleteScan(id);
    }
  };

  const statusConfig: Record<ScanStatus, { icon: React.ReactNode; color: string; label: string }> = {
    pending: { icon: <Clock className="w-4 h-4" />, color: 'text-yellow-500', label: 'Pending' },
    running: { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'text-blue-500', label: 'Running' },
    completed: { icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-500', label: 'Completed' },
    failed: { icon: <XCircle className="w-4 h-4" />, color: 'text-red-500', label: 'Failed' },
    cancelled: { icon: <AlertCircle className="w-4 h-4" />, color: 'text-slate-500', label: 'Cancelled' },
  };

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="text-center py-12">
          <XCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Error Loading Scans</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
          <Button onClick={() => fetchScans()}>Try Again</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Scan History</h1>
        <Button onClick={() => fetchScans()}>
          <Loader2 className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {isLoading && scans.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : scans.length === 0 ? (
        <Card className="text-center py-12">
          <Globe className="w-12 h-12 mx-auto text-slate-400 mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Scans Yet</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Start by analyzing your first website
          </p>
          <Link to="/">
            <Button>Start Scanning</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {scans.map((scan) => (
            <Link key={scan.id} to={`/results/${scan.id}`}>
              <Card hover className="group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`shrink-0 ${statusConfig[scan.status].color}`}>
                      {statusConfig[scan.status].icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <p className="font-medium text-slate-900 dark:text-white truncate">
                          {scan.url}
                        </p>
                        <Badge severity={scan.status === 'completed' ? 'low' : scan.status === 'failed' ? 'critical' : 'info'} />
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(scan.createdAt).toLocaleString()}
                        </span>
                        <span className="capitalize">{scan.options?.viewport || 'desktop'}</span>
                        {scan.statistics && (
                          <span>{scan.statistics.resourceCount} resources</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={scan.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <ExternalLink className="w-4 h-4 text-slate-400" />
                    </a>
                    <button
                      onClick={(e) => handleDelete(e, scan.id)}
                      className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
