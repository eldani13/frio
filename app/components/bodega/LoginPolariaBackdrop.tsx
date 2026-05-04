"use client";

import React from "react";

/** Fondo estilo polaria: negro, partículas tipo nieve/estrellas y viñeta fría. */
export function LoginPolariaBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-black" aria-hidden>
      <svg
        className="absolute h-full w-full opacity-[0.32]"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <pattern id="bodegaLoginStarPattern" width="240" height="240" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="18" r="0.55" fill="#fff" opacity="0.42" />
            <circle cx="52" cy="8" r="0.45" fill="#fff" opacity="0.22" />
            <circle cx="91" cy="44" r="0.5" fill="#fff" opacity="0.38" />
            <circle cx="128" cy="12" r="0.4" fill="#fff" opacity="0.18" />
            <circle cx="168" cy="56" r="0.55" fill="#fff" opacity="0.45" />
            <circle cx="210" cy="28" r="0.45" fill="#fff" opacity="0.28" />
            <circle cx="22" cy="72" r="0.5" fill="#fff" opacity="0.33" />
            <circle cx="78" cy="98" r="0.4" fill="#fff" opacity="0.2" />
            <circle cx="142" cy="88" r="0.55" fill="#fff" opacity="0.4" />
            <circle cx="198" cy="76" r="0.45" fill="#fff" opacity="0.25" />
            <circle cx="36" cy="132" r="0.5" fill="#fff" opacity="0.35" />
            <circle cx="112" cy="118" r="0.4" fill="#fff" opacity="0.22" />
            <circle cx="182" cy="138" r="0.55" fill="#fff" opacity="0.42" />
            <circle cx="228" cy="108" r="0.45" fill="#fff" opacity="0.26" />
            <circle cx="14" cy="178" r="0.45" fill="#fff" opacity="0.3" />
            <circle cx="68" cy="196" r="0.5" fill="#fff" opacity="0.38" />
            <circle cx="154" cy="182" r="0.4" fill="#fff" opacity="0.18" />
            <circle cx="218" cy="204" r="0.55" fill="#fff" opacity="0.36" />
            <circle cx="96" cy="162" r="0.45" fill="#fff" opacity="0.24" />
            <circle cx="52" cy="210" r="0.5" fill="#fff" opacity="0.32" />
            <circle cx="190" cy="228" r="0.4" fill="#fff" opacity="0.2" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#bodegaLoginStarPattern)" />
      </svg>
      <div className="absolute inset-0 bg-linear-to-b from-slate-950/40 via-transparent to-black" />
      <div
        className="absolute inset-0 opacity-50 mix-blend-screen"
        style={{
          background:
            "radial-gradient(ellipse 90% 55% at 50% -15%, rgba(45, 212, 191, 0.07), transparent 52%), radial-gradient(ellipse 70% 45% at 100% 100%, rgba(56, 189, 248, 0.05), transparent 50%)",
        }}
      />
    </div>
  );
}
