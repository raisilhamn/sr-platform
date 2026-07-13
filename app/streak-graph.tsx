"use client";

import { useEffect, useState, useRef } from "react";
import Spinner from "./spinner";

type StreakData = {
  daily: Record<string, number>;
  streak: number;
  total: number;
  maxCount: number;
  distribution: {
    byState: { key: string; label: string; count: number; color: string }[];
    byTopic: Record<string, number>;
    total: number;
  };
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function StreakGraph() {
  const [data, setData] = useState<StreakData | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setData);
  }, []);

  const dayRef = useRef(new Date().toISOString().slice(0, 10));
  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date().toISOString().slice(0, 10);
      if (now !== dayRef.current) {
        dayRef.current = now;
        fetch("/api/stats")
          .then((r) => r.json())
          .then(setData);
      }
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  if (!data) return <div className="text-xs text-muted flex items-center gap-2"><span>Stats</span> <Spinner /></div>;

  const today = new Date();
  const days: { date: string; count: number; month: number; day: number }[] = [];

  const start = new Date(today);
  start.setHours(0, 0, 0, 0);

  for (let i = 0; i < 90; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: data.daily[key] ?? 0, month: d.getMonth(), day: d.getDay() });
  }

  const columns: typeof days[] = [];
  let col: typeof days = [];
  for (const d of days) {
    col.push(d);
    if (col.length === 7) {
      columns.push(col);
      col = [];
    }
  }
  if (col.length) columns.push(col);

  const cellSize = 14;
  const gap = 3;
  const monthGap = 10;
  const step = cellSize + gap;

  const gridLeft = 30;
  const labelTop = 12;
  const chartTop = labelTop + 16;

  function level(count: number): string {
    if (count === 0) return "fill-[#1c1c1c]";
    const p = count / data!.maxCount;
    if (p > 0.66) return "fill-[#3fb950]";
    if (p > 0.33) return "fill-[#2ea043]";
    return "fill-[#196c2e]";
  }

  const monthGroups: { label: string; columns: typeof days[]; offset: number }[] = [];
  let prev = -1;
  let currentCols: typeof days[] = [];
  let offset = gridLeft;
  for (let ci = 0; ci < columns.length; ci++) {
    const cell = columns[ci][0];
    if (!cell) continue;
    if (cell.month !== prev && currentCols.length > 0) {
      monthGroups.push({ label: MONTHS[prev], columns: currentCols, offset });
      offset += currentCols.length * step + monthGap;
      currentCols = [];
    }
    currentCols.push(columns[ci]);
    prev = cell.month;
  }
  if (currentCols.length > 0) {
    monthGroups.push({ label: MONTHS[prev], columns: currentCols, offset });
  }

  const totalW = monthGroups.reduce((w, g) => w + g.columns.length * step + monthGap, gridLeft) + 4;
  const svgW = totalW;
  const svgH = 7 * step + labelTop + 4;

  const { byState, total } = data.distribution;

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-4 text-xs">
        <div>
          <span className="font-semibold text-foreground">{data.streak}</span>
          <span className="text-muted"> day streak</span>
        </div>
        <div>
          <span className="font-semibold text-foreground">{data.total}</span>
          <span className="text-muted"> total reviews</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg width={svgW} height={svgH} className="block">
          {monthGroups.map((g) => (
            <g key={g.label}>
              <text x={g.offset + (g.columns.length * step) / 2} y={labelTop} textAnchor="middle" className="fill-muted text-[10px]">
                {g.label}
              </text>
              {g.columns.map((col, ci) => (
                <g key={ci}>
                  {col.map((d, ri) => (
                    <rect
                      key={d.date}
                      x={g.offset + ci * step}
                      y={ri * step + chartTop}
                      width={cellSize}
                      height={cellSize}
                      rx={3}
                      className={level(d.count)}
                    >
                      <title>{d.date}: {d.count} review{d.count !== 1 ? "s" : ""}</title>
                    </rect>
                  ))}
                </g>
              ))}
            </g>
          ))}
          {["", "Mon", "", "Wed", "", "Fri", ""].map((label, ri) =>
            label ? (
              <text key={ri} x={0} y={ri * step + chartTop + 12} className="fill-muted text-[10px]">
                {label}
              </text>
            ) : null
          )}
        </svg>
      </div>

      <div className="flex items-center justify-end gap-1 text-[10px] text-muted">
        <span>Less</span>
        <div className="w-[10px] h-[10px] rounded-sm bg-[#1c1c1c]" />
        <div className="w-[10px] h-[10px] rounded-sm bg-[#196c2e]" />
        <div className="w-[10px] h-[10px] rounded-sm bg-[#2ea043]" />
        <div className="w-[10px] h-[10px] rounded-sm bg-[#3fb950]" />
        <span>More</span>
      </div>

      <div>
        <div className="text-xs font-semibold text-muted mb-2">Card Progress</div>
        <div className="flex h-4 rounded overflow-hidden">
          {byState.map((s) =>
            s.count > 0 ? (
              <div
                key={s.key}
                style={{
                  width: `${(s.count / total) * 100}%`,
                  backgroundColor: s.color,
                }}
                title={`${s.label}: ${s.count}`}
              />
            ) : null
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px] text-muted">
          {byState.map((s) => (
            <div key={s.key} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: s.color }} />
              <span>{s.label}: {s.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
