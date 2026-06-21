"use client";
import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const PROVIDER_LABELS: Record<string, string> = {
  spotify: "Spotify",
  instagram: "Instagram",
};

function LinkAccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const provider = searchParams.get("provider") ?? "";
  const providerLabel = PROVIDER_LABELS[provider] ?? provider;

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Incorrect password. Please try again.");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  if (!email || !provider) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-400">Invalid link. Please try signing in again.</p>
          <Link href="/signin" className="text-purple-400 text-sm mt-2 block">Back to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-purple-400">Bandwagon</h1>
        </div>
        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="text-center pb-2">
            <p className="text-white font-semibold">Confirm your account</p>
            <p className="text-gray-400 text-sm mt-2">
              Your {providerLabel} account uses <span className="text-white">{email}</span>, which is already
              registered on Bandwagon. Enter your password to sign in.
            </p>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="text-center text-sm text-gray-500">
            Not your account?{" "}
            <Link href="/signin" className="text-purple-400 hover:text-purple-300">
              Use a different email
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function LinkAccountPage() {
  return (
    <Suspense fallback={null}>
      <LinkAccountContent />
    </Suspense>
  );
}
