"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n, type Locale } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-context";
import { api, type User } from "@/lib/api";

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const { t, locale: lang, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();

  // ── Profile form ──
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    date_of_birth: user?.date_of_birth || "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState("");

  // ── Password form ──
  const [pwForm, setPwForm] = useState({ old_password: "", new_password: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  async function handleProfileSave(e: FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError("");
    setProfileSuccess(false);
    try {
      const updated = await api.patch<User>("/api/v1/auth/me", {
        full_name: profileForm.full_name,
        email: profileForm.email,
        phone: profileForm.phone,
        date_of_birth: profileForm.date_of_birth || null,
      });
      setUser(updated);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Error");
    }
    setProfileSaving(false);
  }

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);

    if (pwForm.new_password !== pwForm.confirm) {
      setPwError(t.settings.passwordMismatch);
      return;
    }

    setPwSaving(true);
    try {
      await api.put("/api/v1/auth/me/password", {
        old_password: pwForm.old_password,
        new_password: pwForm.new_password,
      });
      setPwSuccess(true);
      setPwForm({ old_password: "", new_password: "", confirm: "" });
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Error");
    }
    setPwSaving(false);
  }

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--amilcar-white)]">{t.settings.title}</h1>
        <p className="mt-1 text-[var(--amilcar-text-secondary)]">{t.settings.subtitle}</p>
      </div>

      {/* ═══ Account Info Card ═══ */}
      <div className="mb-6 rounded-2xl border border-white/[0.06] bg-[var(--amilcar-black-card)] p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--amilcar-navy)] text-xl font-bold text-white">
            {user.full_name.charAt(0)}
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--amilcar-white)]">{user.full_name}</h2>
            <div className="flex items-center gap-3 text-sm text-[var(--amilcar-text-secondary)]">
              <span>{t.settings.role}: {t.roles[user.role]}</span>
              <span>•</span>
              <span>{t.settings.memberSince} {new Date(user.created_at).toLocaleDateString(lang === "ar" ? "ar-TN" : "fr-FR")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Profile Section ═══ */}
      <div className="mb-6 rounded-2xl border border-white/[0.06] bg-[var(--amilcar-black-card)] p-6">
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-[var(--amilcar-white)] flex items-center gap-2">👤 {t.settings.profile}</h3>
          <p className="text-xs text-[var(--amilcar-text-secondary)] mt-1">{t.settings.profileDesc}</p>
        </div>

        {profileSuccess && (
          <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2.5 text-sm text-green-400">
            ✅ {t.settings.profileUpdated}
          </div>
        )}
        {profileError && (
          <div className="mb-4 rounded-lg border border-[var(--amilcar-red)]/30 bg-[var(--amilcar-red)]/10 px-4 py-2.5 text-sm text-[var(--amilcar-red)]">
            {profileError}
          </div>
        )}

        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.settings.fullName}</label>
              <input
                type="text"
                required
                value={profileForm.full_name}
                onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[var(--amilcar-white)] placeholder-[var(--amilcar-text-muted)] outline-none transition focus:border-[var(--amilcar-red)]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.settings.phone}</label>
              <input
                type="tel"
                required
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[var(--amilcar-white)] placeholder-[var(--amilcar-text-muted)] outline-none transition focus:border-[var(--amilcar-red)]"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.settings.email}</label>
              <input
                type="email"
                required
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[var(--amilcar-white)] placeholder-[var(--amilcar-text-muted)] outline-none transition focus:border-[var(--amilcar-red)]"
                dir="ltr"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.settings.birthDate}</label>
              <input
                type="date"
                value={profileForm.date_of_birth}
                onChange={(e) => setProfileForm({ ...profileForm, date_of_birth: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[var(--amilcar-white)] outline-none transition focus:border-[var(--amilcar-red)]"
                dir="ltr"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={profileSaving}
            className="rounded-xl bg-[var(--amilcar-red)] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#d6181d] disabled:opacity-50"
          >
            {profileSaving ? t.saving : t.save}
          </button>
        </form>
      </div>

      {/* ═══ Security Section ═══ */}
      <div className="mb-6 rounded-2xl border border-white/[0.06] bg-[var(--amilcar-black-card)] p-6">
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-[var(--amilcar-white)] flex items-center gap-2">🔒 {t.settings.security}</h3>
          <p className="text-xs text-[var(--amilcar-text-secondary)] mt-1">{t.settings.securityDesc}</p>
        </div>

        {pwSuccess && (
          <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2.5 text-sm text-green-400">
            ✅ {t.settings.passwordChanged}
          </div>
        )}
        {pwError && (
          <div className="mb-4 rounded-lg border border-[var(--amilcar-red)]/30 bg-[var(--amilcar-red)]/10 px-4 py-2.5 text-sm text-[var(--amilcar-red)]">
            {pwError}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.settings.oldPassword}</label>
            <div className="relative">
              <input
                type={showOld ? "text" : "password"}
                required
                value={pwForm.old_password}
                onChange={(e) => setPwForm({ ...pwForm, old_password: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 pe-10 text-[var(--amilcar-white)] outline-none transition focus:border-[var(--amilcar-red)]"
                dir="ltr"
              />
              <button type="button" onClick={() => setShowOld(!showOld)} className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--amilcar-text-muted)] hover:text-[var(--amilcar-white)] transition">
                {showOld ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.settings.newPassword}</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  required
                  minLength={6}
                  value={pwForm.new_password}
                  onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 pe-10 text-[var(--amilcar-white)] outline-none transition focus:border-[var(--amilcar-red)]"
                  dir="ltr"
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--amilcar-text-muted)] hover:text-[var(--amilcar-white)] transition">
                  {showNew ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.settings.confirmPassword}</label>
              <input
                type={showNew ? "text" : "password"}
                required
                minLength={6}
                value={pwForm.confirm}
                onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[var(--amilcar-white)] outline-none transition focus:border-[var(--amilcar-red)]"
                dir="ltr"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={pwSaving}
            className="rounded-xl bg-[var(--amilcar-red)] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#d6181d] disabled:opacity-50"
          >
            {pwSaving ? t.saving : t.settings.changePassword}
          </button>
        </form>
      </div>

      {/* ═══ Appearance Section ═══ */}
      <div className="mb-6 rounded-2xl border border-white/[0.06] bg-[var(--amilcar-black-card)] p-6">
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-[var(--amilcar-white)] flex items-center gap-2">🎨 {t.settings.appearance}</h3>
          <p className="text-xs text-[var(--amilcar-text-secondary)] mt-1">{t.settings.appearanceDesc}</p>
        </div>

        {/* Theme Toggle */}
        <div className="mb-5">
          <label className="mb-2 block text-xs font-medium text-[var(--amilcar-text-secondary)]">
            {theme === "dark" ? t.settings.darkMode : t.settings.lightMode}
          </label>
          <div className="flex rounded-xl border border-white/10 overflow-hidden w-fit">
            <button
              onClick={() => setTheme("dark")}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition ${
                theme === "dark"
                  ? "bg-[var(--amilcar-red)] text-white"
                  : "text-[var(--amilcar-text-secondary)] hover:bg-white/5"
              }`}
            >
              🌙 {t.settings.darkMode}
            </button>
            <button
              onClick={() => setTheme("light")}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition ${
                theme === "light"
                  ? "bg-[var(--amilcar-red)] text-white"
                  : "text-[var(--amilcar-text-secondary)] hover:bg-white/5"
              }`}
            >
              ☀️ {t.settings.lightMode}
            </button>
          </div>
        </div>

        {/* Language */}
        <div>
          <label className="mb-2 block text-xs font-medium text-[var(--amilcar-text-secondary)]">{t.settings.language}</label>
          <div className="flex rounded-xl border border-white/10 overflow-hidden w-fit">
            <button
              onClick={() => setLocale("ar")}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition ${
                lang === "ar"
                  ? "bg-[var(--amilcar-red)] text-white"
                  : "text-[var(--amilcar-text-secondary)] hover:bg-white/5"
              }`}
            >
              🇹🇳 العربية
            </button>
            <button
              onClick={() => setLocale("fr")}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition ${
                lang === "fr"
                  ? "bg-[var(--amilcar-red)] text-white"
                  : "text-[var(--amilcar-text-secondary)] hover:bg-white/5"
              }`}
            >
              🇫🇷 Français
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
