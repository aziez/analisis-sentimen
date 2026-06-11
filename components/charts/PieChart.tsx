"use client";

/**
 * components/charts/PieChart.tsx
 * Premium doughnut chart with center stat display and animated reveal.
 */

import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
  distribution: { Positif: number; Netral: number; Negatif: number };
  theme?: "dark" | "light";
}

export default function PieChart({ distribution, theme = "dark" }: Props) {
  const isDark = theme === "dark";
  const total = distribution.Positif + distribution.Netral + distribution.Negatif;
  const pct = (n: number) => (total > 0 ? ((n / total) * 100).toFixed(1) : "0");

  const dominantLabel =
    distribution.Positif >= distribution.Netral && distribution.Positif >= distribution.Negatif
      ? "Positif"
      : distribution.Negatif >= distribution.Positif && distribution.Negatif >= distribution.Netral
      ? "Negatif"
      : "Netral";

  const dominantEmoji = { Positif: "😊", Netral: "😐", Negatif: "😞" }[dominantLabel];

  const data = {
    labels: ["Positif", "Netral", "Negatif"],
    datasets: [
      {
        data: [distribution.Positif, distribution.Netral, distribution.Negatif],
        backgroundColor: [
          "rgba(52, 211, 153, 0.88)",
          "rgba(251, 191, 36, 0.88)",
          "rgba(248, 113, 113, 0.88)",
        ],
        borderColor: ["rgba(52, 211, 153, 1)", "rgba(251, 191, 36, 1)", "rgba(248, 113, 113, 1)"],
        borderWidth: 2,
        hoverOffset: 12,
        hoverBorderWidth: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          color: isDark ? "#94a3b8" : "#475569",
          font: { size: 12, weight: 600 },
          padding: 18,
          usePointStyle: true,
          pointStyleWidth: 14,
          generateLabels: (chart: any) => {
            const ds = chart.data.datasets[0];
            return chart.data.labels!.map((label: any, i: number) => {
              const val = ds.data[i] as number;
              const p = pct(val);
              return {
                text: `${label}  ${val.toLocaleString("id-ID")} (${p}%)`,
                fillStyle: ds.backgroundColor[i],
                strokeStyle: ds.borderColor[i],
                pointStyle: "circle",
                index: i,
              };
            });
          },
        },
      },
      tooltip: {
        backgroundColor: isDark ? "rgba(15, 23, 42, 0.97)" : "rgba(255,255,255,0.98)",
        titleColor: isDark ? "#e2e8f0" : "#0f172a",
        bodyColor: isDark ? "#94a3b8" : "#475569",
        borderColor: isDark ? "rgba(255,255,255,0.12)" : "#e2e8f0",
        borderWidth: 1,
        padding: 12,
        callbacks: {
          title: (items: any[]) => items[0]?.label ?? "",
          label: (ctx: any) => {
            const val = ctx.parsed;
            const p = pct(val);
            return [`  Jumlah : ${val.toLocaleString("id-ID")} komentar`, `  Porsi   : ${p}% dari total`];
          },
        },
      },
    },
    cutout: "68%",
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1400,
      easing: "easeOutQuart" as const,
    },
    elements: {
      arc: {
        borderWidth: 2,
        borderColor: isDark ? "#0f172a" : "#f8fafc",
        hoverBorderColor: "#ffffff",
      },
    },
  };

  const dominantColor =
    dominantLabel === "Positif" ? "#34d399" : dominantLabel === "Negatif" ? "#f87171" : "#fbbf24";

  return (
    <div className="relative">
      <Doughnut data={data} options={options} />
      {/* Center label */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
        style={{ top: "-8%" }}
      >
        <span className="text-2xl">{dominantEmoji}</span>
        <span className="text-xs text-slate-400 font-medium mt-0.5">Dominan</span>
        <span className="text-sm font-bold mt-0.5" style={{ color: dominantColor }}>
          {dominantLabel}
        </span>
        <span className="text-xs text-slate-500 mt-0.5">{pct(distribution[dominantLabel])}%</span>
      </div>
    </div>
  );
}
