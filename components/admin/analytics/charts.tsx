"use client";

import { fmtDay, fmtInt } from "./format";

export interface LineSeries {
  name: string;
  color: string; // tailwind stroke class
  values: number[];
}

/**
 * Minimal accessible line chart. `labels` are ISO days. An sr-only table
 * carries the same numbers for assistive tech; the SVG itself is a labelled
 * image. Empty / all-zero data renders an explicit empty state rather than a
 * flat line that could be mistaken for "zero traffic".
 */
export function LineChart({
  labels,
  series,
  title,
  emptyLabel = "Aucune donnée sur la période",
}: {
  labels: string[];
  series: LineSeries[];
  title: string;
  emptyLabel?: string;
}) {
  const width = 720;
  const height = 220;
  const padL = 36;
  const padR = 12;
  const padT = 14;
  const padB = 26;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const max = Math.max(0, ...series.flatMap((s) => s.values));
  if (labels.length === 0 || max === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-white/10 rounded-lg">
        {emptyLabel}
      </div>
    );
  }

  const top = niceMax(max);
  const x = (i: number) => padL + (labels.length === 1 ? innerW / 2 : (i / (labels.length - 1)) * innerW);
  const y = (v: number) => padT + innerH - (v / top) * innerH;
  const ticks = [0, 0.5, 1].map((f) => Math.round(top * f));
  const labelEvery = Math.max(1, Math.ceil(labels.length / 7));
  const summary = series
    .map((s) => `${s.name} : total ${fmtInt(s.values.reduce((a, b) => a + b, 0))}`)
    .join(", ");

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[220px]" role="img" aria-label={`${title}. ${summary}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} className="stroke-gray-200 dark:stroke-white/10" strokeWidth={1} />
            <text x={padL - 6} y={y(t) + 3} textAnchor="end" className="fill-gray-400 dark:fill-gray-500 text-[10px]">
              {fmtInt(t)}
            </text>
          </g>
        ))}
        {labels.map((l, i) =>
          i % labelEvery === 0 ? (
            <text key={l} x={x(i)} y={height - 8} textAnchor="middle" className="fill-gray-400 dark:fill-gray-500 text-[10px]">
              {fmtDay(l)}
            </text>
          ) : null
        )}
        {series.map((s) => (
          <g key={s.name}>
            <polyline
              fill="none"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              className={s.color}
              points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
            />
            {labels.length <= 31 &&
              s.values.map((v, i) => (
                <circle key={i} cx={x(i)} cy={y(v)} r={2.5} className={`${s.color.replace("stroke-", "fill-")}`}>
                  <title>{`${s.name} · ${fmtDay(labels[i])} : ${fmtInt(v)}`}</title>
                </circle>
              ))}
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-600 dark:text-gray-300">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5">
            <span className={`inline-block w-3 h-0.5 ${s.color.replace("stroke-", "bg-")}`} />
            {s.name}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>Jour</th>
            {series.map((s) => (
              <th key={s.name}>{s.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((l, i) => (
            <tr key={l}>
              <td>{l}</td>
              {series.map((s) => (
                <td key={s.name}>{s.values[i]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function niceMax(n: number): number {
  if (n <= 4) return 4;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  const f = n / pow;
  const step = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return step * pow;
}

/** Horizontal bar list: label, value, share of the max. */
export function BarList({
  rows,
  emptyLabel = "Aucune donnée",
  valueLabel = (v: number) => fmtInt(v),
}: {
  rows: Array<{ label: string; value: number; hint?: string }>;
  emptyLabel?: string;
  valueLabel?: (v: number) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0 || rows.every((r) => r.value === 0)) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-2" role="list">
      {rows.map((r) => (
        <li key={r.label} title={r.hint}>
          <div className="flex items-baseline justify-between gap-3 text-xs mb-0.5">
            <span className="truncate text-gray-700 dark:text-gray-200">{r.label}</span>
            <span className="tabular-nums text-gray-500 dark:text-gray-400 shrink-0">{valueLabel(r.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden" aria-hidden>
            <div className="h-full rounded-full bg-orange-500" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
