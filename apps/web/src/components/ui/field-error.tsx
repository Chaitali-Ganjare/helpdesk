type FieldErrorProps = {
  message?: string;
};

/** Renders a field/server validation message, or nothing if `message` is falsy. */
export function FieldError({ message }: FieldErrorProps) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}
