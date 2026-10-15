"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle2, Lock, Mail, User, Database } from "lucide-react";
import { getStoredReports } from "../../lib/storage.js";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/dashboard";

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [existingReportsCount, setExistingReportsCount] = useState(0);
  const [migrateReports, setMigrateReports] = useState(true);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Check for existing localStorage guest reports on mount
  useEffect(() => {
    try {
      const reports = getStoredReports();
      if (Array.isArray(reports) && reports.length > 0) {
        setExistingReportsCount(reports.length);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Password strength estimation
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: "None", color: "bg-gray-200" };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 1) return { score: 1, label: "Weak (min 8 chars)", color: "bg-red-500", text: "text-red-500" };
    if (score === 2) return { score: 2, label: "Fair", color: "bg-amber-500", text: "text-amber-500" };
    if (score === 3 || score === 4) return { score: 3, label: "Good", color: "bg-blue-500", text: "text-blue-500" };
    return { score: 4, label: "Strong", color: "bg-emerald-500", text: "text-emerald-500" };
  }, [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!displayName.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      let guestReports = [];
      if (migrateReports && existingReportsCount > 0) {
        guestReports = getStoredReports();
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          email: email.trim(),
          password,
          guestReports,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create account");
        setIsLoading(false);
        return;
      }

      // Route smoothly to nextUrl or dashboard
      router.push(nextUrl);
      router.refresh();
    } catch (err) {
      setError("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-screen bg-[#F5F2EB] text-[#1A1A1A] flex flex-col justify-between selection:bg-[#B8422B] selection:text-white font-sans">
      {/* Top Bar */}
      <header className="border-b border-black/10 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-black">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07L19.07 4.93" />
          </svg>
          <span className="font-serif text-xl tracking-tight font-bold">Crosscheck</span>
        </Link>

        <div className="text-xs font-mono tracking-wider text-black/60">
          ACCOUNT VERIFICATION GATEWAY
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-black/15 shadow-sm rounded-2xl p-8 space-y-6">
          {/* Header */}
          <div className="space-y-1.5 text-center">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/5 text-[11px] font-mono uppercase tracking-wider text-black/70 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#B8422B]" />
              Secure Enrollment
            </div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-gray-900">
              Create your account
            </h1>
            <p className="text-xs text-gray-500">
              Your reports and proof records will be permanently tied to your credentials.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display Name */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Display name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Jane Sharma"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black transition"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-black transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Strength Hint Bar */}
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-gray-400 font-mono">Password strength</span>
                    <span className={`font-bold ${passwordStrength.text}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden flex gap-1">
                    <div className={`h-full flex-1 rounded-full ${passwordStrength.score >= 1 ? passwordStrength.color : "bg-transparent"}`} />
                    <div className={`h-full flex-1 rounded-full ${passwordStrength.score >= 2 ? passwordStrength.color : "bg-transparent"}`} />
                    <div className={`h-full flex-1 rounded-full ${passwordStrength.score >= 3 ? passwordStrength.color : "bg-transparent"}`} />
                    <div className={`h-full flex-1 rounded-full ${passwordStrength.score >= 4 ? passwordStrength.color : "bg-transparent"}`} />
                  </div>
                </div>
              )}
            </div>

            {/* Guest Report Migration Callout */}
            {existingReportsCount > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={migrateReports}
                    onChange={(e) => setMigrateReports(e.target.checked)}
                    className="mt-0.5 rounded border-amber-400 text-black focus:ring-black"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-amber-950 block">
                      Move your existing reports into this account
                    </span>
                    <span className="text-[11px] text-amber-800 leading-relaxed block mt-0.5">
                      Found {existingReportsCount} verification {existingReportsCount === 1 ? "record" : "records"} stored on this device. Linking will make them accessible across your sessions.
                    </span>
                  </div>
                </label>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-black text-white hover:bg-black/85 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              {isLoading ? "Creating account..." : "Create Account"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Footer note */}
          <div className="text-center pt-2 border-t border-black/5 text-xs text-gray-500">
            Already have an account?{" "}
            <Link
              href={`/login${nextUrl ? `?next=${encodeURIComponent(nextUrl)}` : ""}`}
              className="font-bold text-black underline underline-offset-2 hover:text-[#B8422B]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="border-t border-black/10 px-6 py-3 text-center text-[11px] font-mono text-black/50">
        EST. 2026 • PASSWORDS HASHED LOCALLY VIA SCRYPT • ZERO PLAINTEXT LOGGING
      </footer>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center font-mono text-xs">Loading registration gateway...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
