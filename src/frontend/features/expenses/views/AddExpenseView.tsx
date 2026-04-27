"use client";

import Link from "next/link";
import {
  Card,
  CardBody,
  CardHeader,
  CardSubtitle,
  CardTitle,
} from "@frontend/components/ui/Card";
import { ExpenseForm } from "../components/ExpenseForm";

export function AddExpenseView() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Add expense
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Log a new expense. Fields are validated client- and server-side.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>New expense</CardTitle>
          <CardSubtitle>
            Pick a category, set the date and amount, and add an optional note.
          </CardSubtitle>
        </CardHeader>
        <CardBody>
          <ExpenseForm autoFocus />
        </CardBody>
      </Card>

      <p className="text-center text-sm text-slate-500">
        Looking for analytics?{" "}
        <Link
          href="/dashboard"
          className="font-semibold text-emerald-700 hover:underline"
        >
          Open the dashboard →
        </Link>
      </p>
    </div>
  );
}
