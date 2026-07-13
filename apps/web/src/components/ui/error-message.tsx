import type { ReactNode } from "react";

type ErrorMessageProps = {
  show: boolean;
  children: ReactNode;
};

/** Renders a page-level load-failure message, or nothing if `show` is false. */
export function ErrorMessage({ show, children }: ErrorMessageProps) {
  if (!show) return null;
  return <p className="mt-4 text-sm text-destructive">{children}</p>;
}
