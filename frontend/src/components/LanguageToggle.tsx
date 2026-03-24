"use client";

import { useI18n, type Locale } from "@/lib/i18n";

const options: { value: Locale; label: string; flag: string }[] = [
  { value: "ar", label: "العربية", flag: "🇹🇳" },
  { value: "fr", label: "Français", flag: "🇫🇷" },
];

export default function LanguageToggle() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="flex items-center gap-1 rounded-lg border border-white/10 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setLocale(opt.value)}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
            locale === opt.value
              ? "bg-[var(--amilcar-red)] text-white"
              : "text-[var(--amilcar-text-secondary)] hover:text-white hover:bg-white/5"
          }`}
        >
          <span>{opt.flag}</span>
          <span className="hidden sm:inline">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
