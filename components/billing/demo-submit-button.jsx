"use client";

import { useFormStatus } from "react-dom";

export function DemoSubmitButton({ children, className }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} disabled:cursor-wait disabled:opacity-60`}
    >
      {pending ? "Recording demo payment..." : children}
    </button>
  );
}
