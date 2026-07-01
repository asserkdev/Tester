import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Card } from '../components/common/Card';
import { useScanStore } from '../stores/scanStore';
import { Globe, Shield, Zap, Accessibility, Search, BarChart3, Clock, AlertTriangle } from 'lucide-react';

export function Home() {
  const navigate = useNavigate();
  const { createScan, isLoading, error } = useScanStore();
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');

  const validateUrl = (value: string): boolean => {
    try {
      const parsed = new URL(value);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        setUrlError('URL must start with http:// or https://');
        return false;
      }
      setUrlError('');
      return true;
    } catch {
      setUrlError('Please enter a valid URL');
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateUrl(url)) return;

    try {
      const scan = await createScan(url);
      navigate(`/scan/${scan.id}`);
    } catch (err) {
      console.error('Failed to create scan:', err);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-transparent to-secondary-500/10" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary-500/20 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl lg:text-6xl font-bold text-slate-900 dark:text-white leading-tight">
              Analyze Your Website with{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-secondary-500">
                L.A.I. Inspector
              </span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 dark:text-slate-400">
              Comprehensive automated analysis for bugs, security issues, performance problems,
              accessibility violations, and more. Professional-grade reports in minutes.
            </p>
            
            {/* URL Input Form */}
            <form onSubmit={handleSubmit} className="mt-10 max-w-xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    type="url"
                    placeholder="Enter website URL (e.g., https://example.com)"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      if (urlError) validateUrl(e.target.value);
                    }}
                    error={urlError}
                    icon={<Globe className="w-5 h-5" />}
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  isLoading={isLoading}
                  className="shrink-0"
                >
                  <Search className="w-5 h-5" />
                  Analyze
                </Button>
              </div>
              {error && (
                <p className="mt-3 text-sm text-red-500">{error}</p>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
              Comprehensive Analysis
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              100+ analyzers covering every aspect of your website
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Security Analysis"
              description="Detect vulnerabilities, check security headers, identify XSS risks, and more."
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="Performance"
              description="Core Web Vitals, page weight, bundle size, and loading optimization insights."
            />
            <FeatureCard
              icon={<Accessibility className="w-6 h-6" />}
              title="Accessibility"
              description="WCAG compliance checks, color contrast, keyboard navigation, and screen reader support."
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="SEO Analysis"
              description="Meta tags, Open Graph, sitemap, robots.txt, and search engine optimization."
            />
            <FeatureCard
              icon={<AlertTriangle className="w-6 h-6" />}
              title="Code Quality"
              description="HTML validation, CSS analysis, JavaScript checks, and duplicate detection."
            />
            <FeatureCard
              icon={<Clock className="w-6 h-6" />}
              title="Historical Tracking"
              description="Compare scans over time, track improvements, and monitor progress."
            />
          </div>
        </div>
      </section>

      {/* Recent Scans */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Quick Stats</h2>
            <Button variant="ghost" onClick={() => navigate('/history')}>
              View All
            </Button>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6">
            <StatCard label="Total Scans" value="1,234" trend="+12%" />
            <StatCard label="Issues Found" value="8,567" trend="+5%" />
            <StatCard label="Avg Score" value="78" trend="+3%" />
            <StatCard label="Time Saved" value="240h" trend="+15%" />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card hover className="group">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{description}</p>
        </div>
      </div>
    </Card>
  );
}

function StatCard({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <Card>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <div className="flex items-end justify-between mt-2">
        <p className="text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
        <span className="text-sm font-medium text-green-500">{trend}</span>
      </div>
    </Card>
  );
}
