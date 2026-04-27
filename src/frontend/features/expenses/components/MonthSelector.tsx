"use client";

import { formatMonth } from "../lib/format";

interface Props {
  value: string;
  options: string[];
  onChange: (next: string) => void;
  label?: string;
}

export function MonthSelector({ value, options, onChange, label = "Month" }: Props) {
  // Always include the controlled value so the <select> stays valid even when
  // no expenses exist for it yet.
  const merged = options.includes(value) ? options : [value, ...options];

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="month" className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        id="month"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
      >
        {merged.map((monthKey) => (
          <option key={monthKey} value={monthKey}>
            {formatMonth(monthKey)}
          </option>
        ))}
      </select>
    </div>
  );
}
