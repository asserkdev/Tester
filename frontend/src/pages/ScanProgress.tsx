import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useScanStore } from '../stores/scanStore';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Loader2, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

export function ScanProgress() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentScan, fetchScan, error } = useScanStore();
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Initializing scan...');

  useEffect(() => {
    if (!id) return;
    
    const interval = setInterval(async () => {
      await fetchScan(id);
    }, 2000);

    return () => clearInterval(interval);
  }, [id, fetchScan]);

  useEffect(() => {
    if (!currentScan) return;

    switch (currentScan.status) {
      case 'pending':
        setProgress(0);
        setCurrentStep('Waiting in queue...');
        break;
      case 'running':
        setProgress(50);
        setCurrentStep('Running analyzers...');
        break;
      case 'completed':
        setProgress(100);
        setCurrentStep('Scan complete!');
        setTimeout(() => navigate(`/results/${id}`), 1500);
        break;
      case 'failed':
        setProgress(0);
        setCurrentStep(`Failed: ${currentScan.error}`);
        break;
      case 'cancelled':
        setProgress(0);
        setCurrentStep('Scan cancelled');
        break;
    }
  }, [currentScan, navigate, id]);

  if (error) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <Card className="max-w-md w-full text-center p-8">
          <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Error Starting Scan
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
          <Button onClick={() => navigate('/')}>Go Back</Button>
        </Card>
      </div>
    );
  }

  const statusIcon = {
    pending: <Clock className="w-6 h-6 animate-pulse" />,
    running: <Loader2 className="w-6 h-6 animate-spin" />,
    completed: <CheckCircle className="w-6 h-6" />,
    failed: <XCircle className="w-6 h-6" />,
    cancelled: <AlertCircle className="w-6 h-6" />,
  };

  const statusColor = {
    pending: 'text-yellow-500',
    running: 'text-blue-500',
    completed: 'text-green-500',
    failed: 'text-red-500',
    cancelled: 'text-slate-500',
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
      <Card className="max-w-lg w-full p-8">
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 ${statusColor[currentScan?.status || 'pending']} mb-6`}>
            {statusIcon[currentScan?.status || 'pending']}
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {currentScan?.status === 'completed' ? 'Scan Complete!' : 
             currentScan?.status === 'failed' ? 'Scan Failed' :
             'Scanning in Progress'}
          </h2>
          
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            {currentStep}
          </p>

          {currentScan?.status !== 'failed' && currentScan?.status !== 'cancelled' && (
            <div className="mb-6">
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {progress}% complete
              </p>
            </div>
          )}

          {currentScan && (
            <div className="text-left bg-slate-50 dark:bg-slate-900 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 dark:text-slate-400">URL</p>
                  <p className="font-medium text-slate-900 dark:text-white truncate">{currentScan.url}</p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Status</p>
                  <p className={`font-medium capitalize ${statusColor[currentScan.status]}`}>
                    {currentScan.status}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Viewport</p>
                  <p className="font-medium text-slate-900 dark:text-white capitalize">
                    {currentScan.options?.viewport || 'desktop'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Started</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {currentScan.startedAt ? new Date(currentScan.startedAt).toLocaleTimeString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentScan?.status === 'failed' || currentScan?.status === 'cancelled' ? (
            <Button onClick={() => navigate('/')}>Go Back</Button>
          ) : (
            <Button variant="secondary" onClick={() => navigate('/')}>
              Cancel
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
