import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import { Pie, Doughnut, Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartDataLabels
);

interface StatChartProps {
  title: string;
  type?: 'pie' | 'doughnut' | 'bar';
  labels: string[];
  dataValues: number[];
  customColors?: string[];
  onSegmentClick?: (label: string, index: number) => void;
}

const DEFAULT_PALETTE = [
  '#ec4899', // Pink
  '#0ea5e9', // Sky Blue
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#64748b', // Slate
  '#ef4444', // Red
];

export const StatChart: React.FC<StatChartProps> = ({
  title,
  type = 'pie',
  labels,
  dataValues,
  customColors = DEFAULT_PALETTE,
  onSegmentClick,
}) => {
  const chartData = {
    labels,
    datasets: [
      {
        label: 'จำนวน',
        data: dataValues,
        backgroundColor: customColors,
        borderColor: '#0f172a',
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  };

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_: any, elements: any[]) => {
      if (elements && elements.length > 0 && onSegmentClick) {
        const index = elements[0].index;
        onSegmentClick(labels[index], index);
      }
    },
    plugins: {
      legend: {
        display: type !== 'bar',
        position: 'bottom',
        labels: {
          color: '#cbd5e1',
          font: {
            family: 'Prompt',
            size: 11,
          },
          padding: 12,
          boxWidth: 12,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#f8fafc',
        bodyColor: '#38bdf8',
        borderColor: 'rgba(59, 130, 246, 0.4)',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (context: any) => {
            const val = context.raw || 0;
            const total = dataValues.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
            return ` ${context.label}: ${val.toLocaleString('th-TH')} (${percentage}%)`;
          },
        },
      },
      datalabels: {
        color: '#ffffff',
        font: {
          family: 'Prompt',
          weight: 'bold',
          size: 13,
        },
        formatter: (value: any) => {
          if (value === 0) return '';
          return value;
        },
        display: (context: any) => context.dataset.data[context.dataIndex] > 0,
      },
    },
    scales:
      type === 'bar'
        ? {
            x: {
              ticks: { color: '#94a3b8', font: { family: 'Prompt', size: 10 } },
              grid: { color: 'rgba(51, 65, 85, 0.4)' },
            },
            y: {
              ticks: { color: '#94a3b8', font: { family: 'Prompt', size: 10 } },
              grid: { color: 'rgba(51, 65, 85, 0.4)' },
            },
          }
        : undefined,
  };

  return (
    <div className="glass-panel border border-slate-700/60 rounded-2xl p-4 lg:p-5 bg-slate-900/90 shadow-xl flex flex-col h-full">
      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
        <span>📊</span> {title}
      </h4>
      <div className="flex-1 min-h-[240px] relative flex items-center justify-center">
        {type === 'pie' && <Pie data={chartData} options={chartOptions} />}
        {type === 'doughnut' && <Doughnut data={chartData} options={chartOptions} />}
        {type === 'bar' && <Bar data={chartData} options={chartOptions} />}
      </div>
    </div>
  );
};
