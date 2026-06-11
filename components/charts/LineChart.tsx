"use client";

/**
 * components/charts/LineChart.tsx
 * Premium time-series chart with gradient fill, cross-hair tooltip, and staggered animation.
 */

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface TimeSeriesPoint {
  date: string;
  Positif: number;
  Netral: number;
  Negatif: number;
}

interface Props {
  timeSeries: TimeSeriesPoint[];
  theme?: "dark" | "light";
}

export default function LineChart({ timeSeries, theme = "dark" }: Props) {
  const tickColor   = theme === "dark" ? "#64748b" : "#94a3b8";
  const gridColor   = theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)";
  const borderColor = theme === "dark" ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  const ttBg        = theme === "dark" ? "rgba(15,23,42,0.97)" : "rgba(255,255,255,0.98)";
  const ttTitle     = theme === "dark" ? "#e2e8f0" : "#0f172a";
  const ttBody      = theme === "dark" ? "#94a3b8" : "#475569";
  const ttBorder    = theme === "dark" ? "rgba(100,116,139,0.4)" : "#e2e8f0";
  const ptBorder    = theme === "dark" ? "#0f172a" : "#f8fafc";
  const MAX_POINTS = 50;
  const raw =
    timeSeries.length > MAX_POINTS
      ? timeSeries.filter((_, i) => i % Math.ceil(timeSeries.length / MAX_POINTS) === 0)
      : timeSeries;

  const labels = raw.map((d) => d.date);

  // Show friendly label in tooltip - abbreviated dates already come from API
  const totalPerDate = raw.map((d) => d.Positif + d.Netral + d.Negatif);
  const maxTotal = Math.max(...totalPerDate, 1);

  const makeGradient = (ctx: any, colorTop: string, colorBot: string) => {
    const chart = ctx.chart;
    const { ctx: canvas, chartArea } = chart;
    if (!chartArea) return colorTop;
    const gradient = canvas.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, colorTop);
    gradient.addColorStop(1, colorBot);
    return gradient;
  };

  const chartData = {
    labels,
    datasets: [
      {
        label: "😊 Positif",
        data: raw.map((d) => d.Positif),
        borderColor: "rgba(52, 211, 153, 1)",
        backgroundColor: (ctx: any) => makeGradient(ctx, "rgba(52, 211, 153, 0.35)", "rgba(52, 211, 153, 0.02)"),
        fill: true,
        tension: 0.45,
        pointRadius: raw.length <= 20 ? 4 : 2,
        pointHoverRadius: 7,
        pointBackgroundColor: "rgba(52, 211, 153, 1)",
        pointBorderColor: ptBorder,
        pointBorderWidth: 2,
        borderWidth: 2.5,
        order: 3,
      },
      {
        label: "😐 Netral",
        data: raw.map((d) => d.Netral),
        borderColor: "rgba(251, 191, 36, 1)",
        backgroundColor: (ctx: any) => makeGradient(ctx, "rgba(251, 191, 36, 0.28)", "rgba(251, 191, 36, 0.02)"),
        fill: true,
        tension: 0.45,
        pointRadius: raw.length <= 20 ? 4 : 2,
        pointHoverRadius: 7,
        pointBackgroundColor: "rgba(251, 191, 36, 1)",
        pointBorderColor: ptBorder,
        pointBorderWidth: 2,
        borderWidth: 2.5,
        order: 2,
      },
      {
        label: "😞 Negatif",
        data: raw.map((d) => d.Negatif),
        borderColor: "rgba(248, 113, 113, 1)",
        backgroundColor: (ctx: any) => makeGradient(ctx, "rgba(248, 113, 113, 0.28)", "rgba(248, 113, 113, 0.02)"),
        fill: true,
        tension: 0.45,
        pointRadius: raw.length <= 20 ? 4 : 2,
        pointHoverRadius: 7,
        pointBackgroundColor: "rgba(248, 113, 113, 1)",
        pointBorderColor: ptBorder,
        pointBorderWidth: 2,
        borderWidth: 2.5,
        order: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top" as const,
        align: "end" as const,
        labels: {
          color: tickColor,
          font: { size: 12, weight: 600 },
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 12,
        },
      },
      tooltip: {
        backgroundColor: ttBg,
        titleColor: ttTitle,
        titleFont: { size: 13, weight: "bold" as const },
        bodyColor: ttBody,
        bodyFont: { size: 12 },
        borderColor: ttBorder,
        borderWidth: 1,
        padding: 14,
        cornerRadius: 10,
        callbacks: {
          title: (items: any[]) => `📅 ${items[0]?.label}`,
          label: (ctx: any) => {
            const total = totalPerDate[ctx.dataIndex] ?? 1;
            const val = ctx.parsed.y;
            const pct = total > 0 ? ((val / total) * 100).toFixed(1) : "0";
            const icons = ["😊", "😐", "😞"];
            const icon = icons[ctx.datasetIndex] ?? "";
            return `  ${icon} ${ctx.dataset.label.slice(3)}: ${val.toLocaleString("id-ID")} komentar (${pct}%)`;
          },
          afterBody: (items: any[]) => {
            const total = totalPerDate[items[0]?.dataIndex] ?? 0;
            return [``, `  📊 Total hari ini: ${total.toLocaleString("id-ID")} komentar`];
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: tickColor,
          font: { size: 10 },
          maxTicksLimit: 10,
          maxRotation: 30,
        },
        grid: {
          color: gridColor,
          lineWidth: 1,
        },
        border: { color: borderColor },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: tickColor,
          font: { size: 10 },
          callback: (v: any) => v.toLocaleString("id-ID"),
        },
        grid: {
          color: gridColor,
          lineWidth: 1,
        },
        border: { color: borderColor, dash: [4, 4] },
      },
    },
    animation: {
      duration: 1600,
      easing: "easeOutQuart" as const,
    },
  };

  if (raw.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
        Tidak ada data deret waktu
      </div>
    );
  }

  return (
    <div className="h-72">
      <Line data={chartData} options={options} />
    </div>
  );
}
