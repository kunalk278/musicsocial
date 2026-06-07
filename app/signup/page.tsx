"use client";
import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import CityAutocomplete from "@/components/CityAutocomplete";

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  const [form, setForm] = useState({ name: "", email: "", password: "", city: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong");
      setLoading(false);
      return;
    }

    await signIn("credentials", { email: form.email, password: form.password, redirect: false });

    if (from) {
      // Came from a friend's share page — follow them then go to their page
      await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareToken: from }),
      });
      router.push(`/u/${from}`);
    } else {
      router.push("/add");
    }
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-purple-400">ShowShare</h1>
          <p className="text-gray-400 mt-2 text-sm">
            {from ? "Create an account to follow and see their shows" : "Share concerts with your friends"}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-white text-lg">Create account</h2>
          {error && <p className="text-red-400 text-sm">{error}</p>}

          {[
            { field: "name", label: "Your name", type: "text", placeholder: "Jamie Smith" },
            { field: "email", label: "Email", type: "email", placeholder: "you@example.com" },
            { field: "password", label: "Password", type: "password", placeholder: "••••••••" },
          ].map(({ field, label, type, placeholder }) => (
            <div key={field}>
              <label className="block text-sm text-gray-400 mb-1">{label}</label>
              <input
                type={type}
                value={form[field as keyof typeof form]}
                onChange={(e) => set(field, e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                placeholder={placeholder}
              />
            </div>
          ))}

          <div>
            <label className="block text-sm text-gray-400 mb-1">Your city (for concert lookup)</label>
            <CityAutocomplete value={form.city} onChange={(v) => set("city", v)} />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href={from ? `/signin?from=${from}` : "/signin"} className="text-purple-400 hover:text-purple-300">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpContent />
    </Suspense>
  );
}
