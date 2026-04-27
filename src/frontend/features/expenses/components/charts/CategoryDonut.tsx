"use client";

import { useMemo, useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
} from "recharts";
import { EmptyState } from "@frontend/components/ui/EmptyState";
import type { CategoryTotal } from "../../lib/analytics";
import { formatCompactCurrency, formatCurrency, formatPercent } from "../../lib/format";

interface Props {
  data: CategoryTotal[];
}

// Pink-pastel-led palette for the Pido (pig + dog) brand.
const PALETTE = [
  "#df7396", // brand-500 (pig pink)
  "#f5b3ca", // brand-300 (soft pink)
  "#c89066", // cream-500 (warm tan / dog)
  "#efc9a5", // cream-300 (light tan)
  "#9c4865", // brand-700 (deep berry)
  "#a78bfa", // violet-400 (accent)
  "#fbbf24", // amber-400 (accent)
];

interface ActiveShapeProps {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  fill: string;
}

function ActiveSlice(props: unknown) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } =
    props as ActiveShapeProps;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 8}
        outerRadius={outerRadius + 11}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.35}
      />
    </g>
  );
}

export function CategoryDonut({ data }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const total = useMemo(() => data.reduce((sum, entry) => sum + entry.amount, 0), [data]);

  const active = activeIndex !== undefined ? data[activeIndex] : undefined;

  if (data.length === 0) {
    return (
      <EmptyState
        title="No category data"
        description="Add expenses to see how your spending breaks down by category."
      />
    );
  }

  return (
    <div className="relative h-72 w-full animate-fade-in">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <defs>
            {PALETTE.map((color, i) => (
              <linearGradient
                key={color}
                id={`donut-grad-${i}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={color} stopOpacity={1} />
                <stop offset="100%" stopColor={color} stopOpacity={0.7} />
              </linearGradient>
            ))}
          </defs>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="category"
            innerRadius={62}
            outerRadius={95}
            paddingAngle={3}
            cornerRadius={6}
            stroke="white"
            strokeWidth={2}
            activeIndex={activeIndex}
            activeShape={ActiveSlice}
            onMouseEnter={(_, idx) => setActiveIndex(idx)}
            onMouseLeave={() => setActiveIndex(undefined)}
            isAnimationActive
            animationDuration={900}
            animationEasing="ease-out"
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.category}
                fill={`url(#donut-grad-${index % PALETTE.length})`}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, _name, payload) => {
              const percent =
                (payload?.payload as CategoryTotal | undefined)?.percent ?? 0;
              return [
                `${formatCurrency(value)} (${formatPercent(percent, 0)})`,
                "Amount",
              ];
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            wrapperStyle={{ fontSize: "12px" }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Center label */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-9 text-center">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-500/80">
          {active ? active.category : "Total"}
        </span>
        <span className="mt-0.5 text-xl font-bold text-brand-800">
          {formatCompactCurrency(active ? active.amount : total)}
        </span>
        {active && (
          <span className="text-[11px] font-medium text-brand-500">
            {formatPercent(active.percent, 0)}
          </span>
        )}
      </div>
    </div>
  );
}
