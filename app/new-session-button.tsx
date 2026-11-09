"use client";

import { useRouter } from "next/navigation";

export function NewSessionButton() {
  const router = useRouter();
  return (
    <button
      className="rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
      onClick={() => router.push(`/s/${Math.random().toString(36).slice(2, 8)}`)}
    >
      New session
    </button>
  );
}
