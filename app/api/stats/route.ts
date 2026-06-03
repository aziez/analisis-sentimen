/**
 * app/api/stats/route.ts
 * ─────────────────────────────────────────────
 * GET /api/stats
 *
 * Returns basic stats about the dataset (no sentiment computation):
 *   totalComments, dateRange, topAuthors, averageReactions
 *
 * Useful for populating the dashboard header before any model is selected.
 */

import { NextResponse } from "next/server";
import { loadComments } from "@/lib/csvLoader";

export async function GET() {
  try {
    const comments = loadComments();

    // Date range
    const timestamps = comments
      .map((c) => {
        try {
          const d = new Date(c.timestamp);
          return isNaN(d.getTime()) ? null : d;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as Date[];

    const earliest = timestamps.length ? new Date(Math.min(...timestamps.map((d) => d.getTime()))) : null;
    const latest = timestamps.length ? new Date(Math.max(...timestamps.map((d) => d.getTime()))) : null;

    // Top 10 authors by comment count
    const authorMap = new Map<string, number>();
    for (const c of comments) {
      const name = c.author_name?.trim() || "Anonymous";
      authorMap.set(name, (authorMap.get(name) ?? 0) + 1);
    }
    const topAuthors = Array.from(authorMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Average reactions
    const totalReactions = comments.reduce((sum, c) => {
      const n = parseInt(c.reaction_count ?? "0", 10);
      return sum + (isNaN(n) ? 0 : n);
    }, 0);

    const averageReactions =
      comments.length > 0 ? parseFloat((totalReactions / comments.length).toFixed(2)) : 0;

    return NextResponse.json({
      totalComments: comments.length,
      dateRange: {
        from: earliest?.toISOString() ?? null,
        to: latest?.toISOString() ?? null,
      },
      topAuthors,
      averageReactions,
      totalReactions,
    });
  } catch (err: any) {
    console.error("[/api/stats] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
