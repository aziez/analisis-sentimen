"use client";

/**
 * components/charts/BarChart.tsx
 * Premium horizontal bar chart of top-20 words with gradient bars and animated reveal.
 */

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface WordEntry {
  word: string;
  count: number;
}

interface Props {
  topWords: WordEntry[];
}

export default function BarChart({ topWords }: Props) {
  const items = topWords.slice(0, 20);
  const maxCount = Math.max(...items.map((w) => w.count), 1);

  // Color gradient: gold for #1, then blue shades
  const rankColors = items.map((w, i) => {
    const ratio = 1 - i / items.length;
    if (i === 0) return "rgba(251, 191, 36, 0.92)";  // gold
    if (i === 1) return "rgba(248, 113, 113, 0.85)";  // silver-ish (warm)
    if (i === 2) return "rgba(167, 139, 250, 0.85)";  // purple
    const hue = 210 + (i * 9) % 80;
    const light = 45 + ratio * 25;
    return `hsla(${hue}, 75%, ${light}%, 0.82)`;
  });

  const rankBorders = items.map((_, i) => {
    if (i === 0) return "rgba(251, 191, 36, 1)";
    if (i === 1) return "rgba(248, 113, 113, 1)";
    if (i === 2) return "rgba(167, 139, 250, 1)";
    return `hsla(${210 + (i * 9) % 80}, 75%, 60%, 1)`;
  });

  const chartData = {
    labels: items.map((w, i) => `${i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}  ${w.word}`),
    datasets: [
      {
        label: "Frekuensi Kemunculan",
        data: items.map((w) => w.count),
        backgroundColor: rankColors,
        borderColor: rankBorders,
        borderWidth: 1.5,
        borderRadius: { topRight: 6, bottomRight: 6 },
        borderSkipped: "left" as const,
        barThickness: 18,
      },
    ],
  };

  const options = {
    indexAxis: "y" as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        titleColor: "#e2e8f0",
        titleFont: { size: 13, weight: "bold" as const },
        bodyColor: "#94a3b8",
        bodyFont: { size: 12 },
        borderColor: "rgba(100,116,139,0.4)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          title: (items: any[]) => {
            // Strip rank emoji prefix for tooltip title
            return items[0]?.label?.replace(/^[🥇🥈🥉#\d]+\s+/, "") ?? "";
          },
          label: (ctx: any) => {
            const val = ctx.parsed.x;
            const pct = ((val / maxCount) * 100).toFixed(1);
            return [`  📊 Muncul sebanyak: ${val.toLocaleString("id-ID")} kali`, `  📈 Relatif terhadap #1: ${pct}%`];
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          color: "#64748b",
          font: { size: 10 },
          callback: (v: any) => v.toLocaleString("id-ID"),
        },
        grid: {
          color: "rgba(255,255,255,0.04)",
          lineWidth: 1,
        },
        border: { color: "rgba(255,255,255,0.08)" },
        title: {
          display: true,
          text: "Jumlah Kemunculan (kali)",
          color: "#64748b",
          font: { size: 11 },
          padding: { top: 8 },
        },
      },
      y: {
        ticks: {
          color: "#94a3b8",
          font: { size: 11, weight: "bold" as const },
        },
        grid: {
          display: false,
        },
        border: { color: "rgba(255,255,255,0.08)" },
      },
    },
    animation: {
      duration: 1200,
      easing: "easeOutQuart" as const,
      delay: (ctx: any) => ctx.dataIndex * 40,
    },
  };

  if (items.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
        Tidak ada data kata
      </div>
    );
  }

  return (
    <div style={{ height: `${Math.max(380, items.length * 32 + 60)}px` }}>
      <Bar data={chartData} options={options as any} />
    </div>
  );
}
