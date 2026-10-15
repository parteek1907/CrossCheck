"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, ArrowRight, Eye, EyeOff, AlertCircle, Lock, Mail } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Wrong email or password");
        setIsLoading(false);
        return;
      }

      // Smoothly navigate to nextUrl or dashboard
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
          IDENTITY CLEARINGHOUSE
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-black/15 shadow-sm rounded-2xl p-8 space-y-6">
          {/* Header */}
          <div className="space-y-1.5 text-center">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/5 text-[11px] font-mono uppercase tracking-wider text-black/70 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#B8422B]" />
              Secure Terminal
            </div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-gray-900">
              Sign in to Crosscheck
            </h1>
            <p className="text-xs text-gray-500">
              Access your verification proof ledger, Safe Circle, and family alerts.
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
            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  id="login-email"
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
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="login-password"
                  required
                  placeholder="Enter your password"
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
            </div>

            {/* Submit */}
            <button
              type="submit"
              id="login-submit-btn"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-black text-white hover:bg-black/85 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              {isLoading ? "Authenticating..." : "Sign in"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Footer note */}
          <div className="text-center pt-2 border-t border-black/5 text-xs text-gray-500">
            Don&apos;t have an account yet?{" "}
            <Link
              href={`/register${nextUrl ? `?next=${encodeURIComponent(nextUrl)}` : ""}`}
              className="font-bold text-black underline underline-offset-2 hover:text-[#B8422B]"
            >
              Create one
            </Link>
          </div>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="border-t border-black/10 px-6 py-3 text-center text-[11px] font-mono text-black/50">
        EST. 2026 • END-TO-END CRYPTOGRAPHIC SESSION INTEGRITY • LOCAL-FIRST SAFETY
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F5F2EB] flex items-center justify-center font-mono text-xs">Loading terminal...</div>}>
      <LoginForm />
    </Suspense>
  );
}
