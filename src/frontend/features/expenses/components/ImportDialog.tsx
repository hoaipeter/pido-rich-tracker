"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Spinner } from "@frontend/components/ui/Spinner";
import { parseExpensesCsv, type CsvParseError } from "../lib/csv";
import type { NewExpense } from "@shared/expenses/schemas";
import { useBulkCreateExpenses } from "../hooks/useExpenseMutations";

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Two-step CSV importer: parse + preview, then commit. The preview surfaces
 * row-level errors so users can fix the source file rather than blindly
 * uploading a partial dataset.
 */
export function ImportDialog({ open, onClose }: Props) {
  const [filename, setFilename] = useState<string | null>(null);
  const [parsed, setParsed] = useState<NewExpense[] | null>(null);
  const [errors, setErrors] = useState<CsvParseError[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bulkCreate = useBulkCreateExpenses();

  // Reset state every time the dialog opens so old previews don't leak
  // between sessions.
  useEffect(() => {
    if (!open) return;
    setFilename(null);
    setParsed(null);
    setErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [open]);

  // Allow Escape to dismiss while idle. We don't intercept it during an
  // active import to avoid losing the in-flight result.
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !bulkCreate.isPending) {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, bulkCreate.isPending]);

  const summary = useMemo(() => {
    if (!parsed) return null;
    return {
      validCount: parsed.length,
      errorCount: errors.length,
    };
  }, [parsed, errors]);

  if (!open) return null;
  // Guard SSR — `document` only exists once the client mounts.
  if (typeof document === "undefined") return null;

  const handleFile = async (file: File) => {
    setFilename(file.name);
    const text = await file.text();
    const result = parseExpensesCsv(text);
    setParsed(result.valid);
    setErrors(result.errors);
  };

  const handleConfirm = async () => {
    if (!parsed || parsed.length === 0) return;
    try {
      await bulkCreate.mutateAsync(parsed);
      onClose();
    } catch {
      // toast handled by mutation hook
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close import dialog"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={() => {
          if (!bulkCreate.isPending) onClose();
        }}
      />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-brand-800">Import expenses</h2>
        <p className="mt-1 text-sm text-brand-600">
          Upload a CSV with columns <code>category,date,amount,note</code>. Rows that fail
          validation are skipped.
        </p>

        <div className="mt-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
            className="block w-full text-sm text-brand-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-200"
          />
          {filename && (
            <p className="mt-2 text-xs text-brand-500">Selected: {filename}</p>
          )}
        </div>

        {summary && (
          <div className="mt-4 rounded-lg border border-brand-100 bg-brand-50/60 p-3 text-sm">
            <p className="font-medium text-brand-800">
              {summary.validCount} valid row{summary.validCount === 1 ? "" : "s"}
              {summary.errorCount > 0 ? ` · ${summary.errorCount} skipped` : ""}
            </p>
            {errors.length > 0 && (
              <ul className="mt-2 max-h-32 space-y-1 overflow-auto text-xs text-rose-600">
                {errors.slice(0, 10).map((err) => (
                  <li key={`${err.row}-${err.message}`}>
                    Row {err.row}: {err.message}
                  </li>
                ))}
                {errors.length > 10 && (
                  <li className="text-rose-500">…and {errors.length - 10} more</li>
                )}
              </ul>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={bulkCreate.isPending}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!parsed || parsed.length === 0 || bulkCreate.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {bulkCreate.isPending && <Spinner className="h-4 w-4" />}
            Import {parsed && parsed.length > 0 ? `(${parsed.length})` : ""}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
