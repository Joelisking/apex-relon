'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  BrainCircuit,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Briefcase,
} from 'lucide-react';
import {
  DashboardMetrics,
  Lead,
  Client,
  PipelineStage,
} from '@/lib/types';
import { REVENUE_DATA } from '@/lib/constants';
import {
  dashboardApi,
  ExecutiveSummaryResponse,
} from '@/lib/api/dashboard';
import StatCard from './StatCard';
import { useCurrency } from '@/lib/context/currency-context';

const COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884d8',
  '#ff6b6b',
];

interface DashboardClientProps {
  leads: Lead[];
  clients: Client[];
}

const DashboardClient: React.FC<DashboardClientProps> = ({
  leads,
  clients,
}) => {
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiData, setAiData] =
    useState<ExecutiveSummaryResponse | null>(null);

  // Calculate Real Metrics
  const { metrics, conversionRateNum } = useMemo(() => {
    const totalRevenue = clients.reduce(
      (acc, c) => acc + (c.totalRevenue || c.lifetimeRevenue || 0),
      0,
    );
    const pipelineValue = leads.reduce(
      (acc, l) => acc + (l.expectedValue || 0),
      0,
    );

    // Win Rate Calc (Mock logic based on "Won" vs "Lost")
    const wonLeads = leads.filter(
      (l) => l.stage === PipelineStage.WON,
    );
    const won = wonLeads.length;

    // Conversion Rate (Won / Total Leads)
    const conversionRateNum =
      leads.length > 0 ? Math.round((won / leads.length) * 100) : 0;

    const metrics: DashboardMetrics = {
      totalRevenue,
      pipelineValue,
      activeClients: clients.length,
      activeLeads: leads.length,
      conversionRate: `${conversionRateNum}%`,
      avgDealSize:
        leads.length > 0
          ? Math.round(pipelineValue / leads.length)
          : 0,
    };

    return { metrics, conversionRateNum };
  }, [leads, clients]);

  // Additional computed values for dashboard display
  const activeProjects = useMemo(() => {
    return clients.reduce(
      (acc, c) => acc + (c.projects?.length || 0),
      0,
    );
  }, [clients]);

  const winRate = useMemo(() => {
    const wonLeads = leads.filter(
      (l) => l.stage === PipelineStage.WON,
    );
    const lostLeads = leads.filter(
      (l) => l.stage === PipelineStage.LOST,
    );
    const totalFinished = wonLeads.length + lostLeads.length;
    return totalFinished > 0
      ? Math.round((wonLeads.length / totalFinished) * 100)
      : 68;
  }, [leads]);

  const avgProjectValue = useMemo(() => {
    const totalRevenue = clients.reduce(
      (acc, c) => acc + (c.totalRevenue || c.lifetimeRevenue || 0),
      0,
    );
    return activeProjects > 0
      ? Math.round(totalRevenue / activeProjects)
      : 0;
  }, [clients, activeProjects]);

  const revenueByService = useMemo(() => {
    const wonLeads = leads.filter(
      (l) => l.stage === PipelineStage.WON,
    );
    const serviceRevenueMap: { [key: string]: number } = {};
    wonLeads.forEach((l) => {
      const type = l.jobType?.name || 'Other';
      serviceRevenueMap[type] =
        (serviceRevenueMap[type] || 0) + (l.expectedValue || 0);
    });
    return Object.keys(serviceRevenueMap).map((name) => ({
      name,
      value: serviceRevenueMap[name],
    }));
  }, [leads]);

  // Dynamic Pipeline Data
  const pipelineData = useMemo(() => {
    const counts: { [key: string]: number } = {};
    Object.values(PipelineStage).forEach(
      (stage) => (counts[stage] = 0),
    );
    leads.forEach((l) => {
      if (counts[l.stage] !== undefined) counts[l.stage]++;
    });
    return Object.keys(counts)
      .map((name) => ({ name, value: counts[name] }))
      .filter((d) => d.value > 0);
  }, [leads]);

  const { fmt, fmtFull } = useCurrency();

  const handleGenerateInsight = async () => {
    setLoadingAI(true);
    try {
      const result = await dashboardApi.getExecutiveSummary();
      setAiData(result);
    } catch (error) {
      console.error('Failed to generate executive summary:', error);
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Stats Cards - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={fmtFull(metrics.totalRevenue)}
          icon={DollarSign}
          trend="+12% vs last month"
          trendUp={true}
        />
        <StatCard
          title="Active Projects"
          value={activeProjects.toString()}
          icon={Briefcase}
          trend="Current Load"
          trendUp={true}
        />
        <StatCard
          title="Win Rate"
          value={`${winRate}%`}
          icon={CheckCircle}
          trend="+5% vs target"
          trendUp={true}
        />
        <StatCard
          title="Pipeline Value"
          value={`${fmt(metrics.pipelineValue)}`}
          icon={TrendingUp}
          trend="Forecast"
          trendUp={true}
        />
      </div>

      {/* Top Stats Cards - Row 2 (New Metrics) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Avg Project Value"
          value={fmtFull(avgProjectValue)}
          icon={Briefcase}
          trend="Based on closed deals"
          trendUp={true}
        />
        <StatCard
          title="Lead Conversion Rate"
          value={metrics.conversionRate}
          icon={TrendingUp}
          trend="Lead to Won"
          trendUp={conversionRateNum > 20}
        />
        <StatCard
          title="Avg Deal Size"
          value={fmtFull(metrics.avgDealSize)}
          icon={DollarSign}
          trend="Across Pipeline"
          trendUp={true}
        />
      </div>

      {/* AI Executive Summary Section */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-6 border border-blue-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <BrainCircuit className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">
              AI Executive Brief
            </h2>
          </div>
          <button
            onClick={handleGenerateInsight}
            disabled={loadingAI}
            className="px-4 py-2 bg-white border border-indigo-200 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors flex items-center space-x-2 disabled:opacity-50">
            {loadingAI ? (
              <span>Analyzing...</span>
            ) : (
              <span>Generate Report</span>
            )}
          </button>
        </div>

        {aiData ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <p className="text-gray-700 leading-relaxed bg-white/60 p-4 rounded-lg border border-blue-100/50">
              {aiData.summary.overview}
            </p>
            {aiData.summary.whatNeedsAttention.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {aiData.summary.whatNeedsAttention.map(
                  (item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center space-x-2 bg-red-50 text-red-700 px-3 py-2 rounded border border-red-100">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span className="text-sm font-medium">
                        {item}
                      </span>
                    </div>
                  ),
                )}
              </div>
            )}
            {aiData.summary.keyInsights.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {aiData.summary.keyInsights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="flex items-start space-x-2 bg-indigo-50 text-indigo-800 px-3 py-2 rounded border border-indigo-100">
                    <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="text-sm">{insight}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>
              Click &quot;Generate Report&quot; to analyze real-time
              business performance.
            </p>
          </div>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Trend */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">
            Revenue Trend (6 Months)
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={REVENUE_DATA}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#E5E7EB"
                />
                <XAxis dataKey="name" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  cursor={{ fill: '#F3F4F6' }}
                />
                <Bar
                  dataKey="revenue"
                  fill="#4F46E5"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">
            Pipeline by Stage
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pipelineData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value">
                  {pipelineData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center space-x-4 mt-4 flex-wrap gap-y-2">
            {pipelineData.map((entry, index) => (
              <div
                key={index}
                className="flex items-center text-xs text-gray-600">
                <div
                  className="w-3 h-3 rounded-full mr-1"
                  style={{
                    backgroundColor: COLORS[index % COLORS.length],
                  }}></div>
                {entry.name}
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by Project Type */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">
            Revenue by Project Type
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={revenueByService}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#E5E7EB"
                />
                <XAxis type="number" stroke="#6B7280" />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#6B7280"
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  cursor={{ fill: '#F3F4F6' }}
                />
                <Bar
                  dataKey="value"
                  fill="#10B981"
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardClient;
