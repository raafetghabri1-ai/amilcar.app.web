"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const ROLE_DASHBOARDS = {
  admin: "/dashboard/admin",
  worker: "/dashboard/worker",
  client: "/dashboard/client",
} as const;

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace(ROLE_DASHBOARDS[user.role]);
    } else {
      router.replace("/login");
    }
  }, [user, loading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--amilcar-red)]" />
    </div>
  );
}
