"use client";

import { useEffect, useState } from "react";
import type { MessageBannerProps } from "../../interfaces/bodega/MessageBanner";

const DEFAULT_DURATION = 3500;

export default function MessageBanner({ message }: MessageBannerProps) {
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const timer = window.setTimeout(() => {
      setVisible(false);
    }, DEFAULT_DURATION);

    return () => window.clearTimeout(timer);
  }, [message]);

  if (!message || !visible) {
    return null;
  }

  return (
    <div className="fixed right-6 top-6 z-50 max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
      <div className="flex">
        <div className="w-1.5 bg-emerald-500" aria-hidden="true" />
        <div className="flex flex-1 items-start gap-3 px-4 py-3">
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">Éxito</p>
            <p className="text-sm text-slate-600">{message}</p>
          </div>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="text-slate-400 transition hover:text-slate-600"
            aria-label="Cerrar mensaje"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
