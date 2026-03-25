"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import LanguageToggle from "@/components/LanguageToggle";
import Image from "next/image";

/* ─── Eye Icon SVG ─── */
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ) : (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useI18n();

  // Mode: "login" or "register"
  const [mode, setMode] = useState<"login" | "register">("login");

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Register fields
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function switchMode(m: "login" | "register") {
    setMode(m);
    setError("");
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.login.failed);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.register({
        full_name: regName,
        email: regEmail,
        phone: regPhone,
        password: regPassword,
      });
      // Auto-login after successful registration
      await login(regEmail, regPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.login.registerFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      {/* Language Toggle - top corner */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageToggle />
      </div>

      {/* Subtle radial glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(192,21,26,0.08)_0%,_transparent_70%)]" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Image
            src="/logo.png"
            alt="AMILCAR Auto Care"
            width={140}
            height={140}
            className="mx-auto mb-4 drop-shadow-[0_0_30px_rgba(192,21,26,0.3)]"
            priority
          />
          <p className="text-sm tracking-[0.3em] uppercase text-[var(--amilcar-silver-dark)]">
            {t.tagline}
          </p>
        </div>

        {/* ═══ Card ═══ */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-8 shadow-2xl">

          {error && (
            <div className="mb-4 rounded-lg border border-[var(--amilcar-red)]/30 bg-[var(--amilcar-red)]/10 px-4 py-3 text-sm text-[var(--amilcar-red)]">
              {error}
            </div>
          )}

          {/* ─── LOGIN FORM ─── */}
          {mode === "login" && (
            <>
              <h2 className="mb-6 text-center text-xl font-semibold text-white">
                {t.login.title}
              </h2>
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[var(--amilcar-silver)]">
                    {t.login.email}
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.login.emailPlaceholder}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder-[var(--amilcar-text-muted)] outline-none transition focus:border-[var(--amilcar-red)] focus:ring-2 focus:ring-[var(--amilcar-red-glow)]"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[var(--amilcar-silver)]">
                    {t.login.password}
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t.login.passwordPlaceholder}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 pe-12 text-white placeholder-[var(--amilcar-text-muted)] outline-none transition focus:border-[var(--amilcar-red)] focus:ring-2 focus:ring-[var(--amilcar-red-glow)]"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--amilcar-text-muted)] hover:text-white transition"
                      title={showPassword ? t.login.hidePassword : t.login.showPassword}
                    >
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--amilcar-red)] px-4 py-3 font-bold text-white uppercase tracking-wider transition hover:bg-[#d6181d] hover:shadow-[0_0_20px_rgba(192,21,26,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    t.login.submit
                  )}
                </button>
              </form>

              {/* Switch to Register */}
              <p className="mt-5 text-center text-sm text-[var(--amilcar-text-secondary)]">
                {t.login.noAccount}{" "}
                <button
                  onClick={() => switchMode("register")}
                  className="font-medium text-[var(--amilcar-red)] hover:underline"
                >
                  {t.login.createAccount}
                </button>
              </p>
            </>
          )}

          {/* ─── REGISTER FORM ─── */}
          {mode === "register" && (
            <>
              <h2 className="mb-6 text-center text-xl font-semibold text-white">
                {t.login.registerTitle}
              </h2>
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label htmlFor="regName" className="mb-1.5 block text-sm font-medium text-[var(--amilcar-silver)]">
                    {t.login.fullName}
                  </label>
                  <input
                    id="regName"
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder={t.login.fullNamePlaceholder}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder-[var(--amilcar-text-muted)] outline-none transition focus:border-[var(--amilcar-red)] focus:ring-2 focus:ring-[var(--amilcar-red-glow)]"
                  />
                </div>

                <div>
                  <label htmlFor="regPhone" className="mb-1.5 block text-sm font-medium text-[var(--amilcar-silver)]">
                    {t.login.phone}
                  </label>
                  <input
                    id="regPhone"
                    type="tel"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder={t.login.phonePlaceholder}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder-[var(--amilcar-text-muted)] outline-none transition focus:border-[var(--amilcar-red)] focus:ring-2 focus:ring-[var(--amilcar-red-glow)]"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label htmlFor="regEmail" className="mb-1.5 block text-sm font-medium text-[var(--amilcar-silver)]">
                    {t.login.email}
                  </label>
                  <input
                    id="regEmail"
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder={t.login.emailPlaceholder}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder-[var(--amilcar-text-muted)] outline-none transition focus:border-[var(--amilcar-red)] focus:ring-2 focus:ring-[var(--amilcar-red-glow)]"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label htmlFor="regPassword" className="mb-1.5 block text-sm font-medium text-[var(--amilcar-silver)]">
                    {t.login.password}
                  </label>
                  <div className="relative">
                    <input
                      id="regPassword"
                      type={showRegPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder={t.login.passwordPlaceholder}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 pe-12 text-white placeholder-[var(--amilcar-text-muted)] outline-none transition focus:border-[var(--amilcar-red)] focus:ring-2 focus:ring-[var(--amilcar-red-glow)]"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--amilcar-text-muted)] hover:text-white transition"
                      title={showRegPassword ? t.login.hidePassword : t.login.showPassword}
                    >
                      <EyeIcon open={showRegPassword} />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--amilcar-red)] px-4 py-3 font-bold text-white uppercase tracking-wider transition hover:bg-[#d6181d] hover:shadow-[0_0_20px_rgba(192,21,26,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    t.login.register
                  )}
                </button>
              </form>

              {/* Switch to Login */}
              <p className="mt-5 text-center text-sm text-[var(--amilcar-text-secondary)]">
                {t.login.haveAccount}{" "}
                <button
                  onClick={() => switchMode("login")}
                  className="font-medium text-[var(--amilcar-red)] hover:underline"
                >
                  {t.login.backToLogin}
                </button>
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <div className="mx-auto mb-2 h-px w-24 bg-[var(--amilcar-navy)]" />
          <p className="text-xs text-[var(--amilcar-text-muted)]">
            {t.copyright}
          </p>
          <div className="mt-2 flex items-center justify-center gap-4 text-xs text-[var(--amilcar-text-muted)]">
            <a href="tel:+21697038792" className="flex items-center gap-1 transition hover:text-white">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              +216 97 038 792
            </a>
            <a href="mailto:amilcarautocare@gmail.com" className="flex items-center gap-1 transition hover:text-white">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              amilcarautocare@gmail.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
