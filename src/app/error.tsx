"use client";

import { RouteErrorBoundary } from "@frontend/components/ui/RouteErrorBoundary";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error(props: Props) {
  return <RouteErrorBoundary {...props} title="We hit an unexpected error" />;
}
