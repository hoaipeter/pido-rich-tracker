"use client";

import {
  Card,
  CardBody,
  CardHeader,
  CardSubtitle,
  CardTitle,
} from "@frontend/components/ui/Card";
import { cn } from "@frontend/lib/cn";
import type { Insight } from "../lib/analytics";

interface Props {
  insights: Insight[];
}

const TONE_STYLES: Record<Insight["tone"], string> = {
  positive: "border-brand-200 bg-gradient-to-br from-brand-50 to-white text-brand-900",
  negative: "border-cream-300 bg-gradient-to-br from-cream-50 to-brand-50 text-cream-900",
  neutral: "border-brand-100 bg-gradient-to-br from-white to-brand-50 text-brand-900",
};

export function InsightPanel({ insights }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Smart insights</CardTitle>
        <CardSubtitle>Auto-generated highlights for the selected month.</CardSubtitle>
      </CardHeader>
      <CardBody>
        <ul className="grid gap-3 sm:grid-cols-2">
          {insights.map((insight) => (
            <li
              key={insight.id}
              className={cn(
                "animate-fade-in rounded-lg border px-4 py-3 text-sm",
                TONE_STYLES[insight.tone],
              )}
            >
              <p className="font-semibold">{insight.title}</p>
              <p className="mt-1 text-sm opacity-80">{insight.detail}</p>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
