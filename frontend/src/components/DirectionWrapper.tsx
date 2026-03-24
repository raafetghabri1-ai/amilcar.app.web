"use client";

import { useEffect, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";

export function DirectionWrapper({ children }: { children: ReactNode }) {
  const { t } = useI18n();

  useEffect(() => {
    document.documentElement.lang = t.lang;
    document.documentElement.dir = t.dir;
  }, [t.lang, t.dir]);

  return <>{children}</>;
}
