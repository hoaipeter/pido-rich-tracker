"use client";

import { RouteErrorBoundary } from "@frontend/components/ui/RouteErrorBoundary";

export default function FamiliesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorBoundary {...props} />;
}
