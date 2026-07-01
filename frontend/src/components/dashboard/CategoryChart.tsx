import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardHeader, CardTitle } from '../common/Card';
import type { AnalyzerCategory } from '../../types';

interface CategoryChartProps {
  data: Record<AnalyzerCategory, number>;
}

const CATEGORY_COLORS: Record<string, string> = {
  architecture: '#6366f1',
  html: '#f59e0b',
  css: '#10b981',
  javascript: '#f97316',
  links: '#8b5cf6',
  images: '#ec4899',
  resources: '#14b8a6',
  console: '#ef4444',
  performance: '#3b82f6',
  seo: '#22c55e',
  accessibility: '#a855f7',
  security: '#dc2626',
  network: '#06b6d4',
  pwa: '#84cc16',
  storage: '#f43f5e',
  api: '#0ea5e9',
  responsive: '#d946ef',
  'cross-browser': '#8b5cf6',
  forms: '#14b8a6',
  navigation: '#f97316',
  metadata: '#eab308',
  social: '#06b6d4',
  technology: '#64748b',
  privacy: '#dc2626',
};

export function CategoryChart({ data }: CategoryChartProps) {
  const chartData = Object.entries(data)
    .filter(([, count]) => count > 0)
    .map(([category, count]) => ({
      name: category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' '),
      category,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Issues by Category</CardTitle>
        </CardHeader>
        <div className="h-64 flex items-center justify-center">
          <p className="text-slate-400 dark:text-slate-500">No issues found</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Issues by Category</CardTitle>
      </CardHeader>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <XAxis type="number" stroke="#94a3b8" fontSize={12} />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#94a3b8"
              fontSize={12}
              width={100}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '8px 12px',
              }}
              formatter={(value: number) => [`${value} issues`, 'Count']}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CATEGORY_COLORS[entry.category] || '#6366f1'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
