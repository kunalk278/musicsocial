"use client";
import { useState, useRef, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const US_METROS = [
  "New York, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX",
  "Phoenix, AZ", "Philadelphia, PA", "San Antonio, TX", "San Diego, CA",
  "Dallas, TX", "San Jose, CA", "Austin, TX", "Jacksonville, FL",
  "Fort Worth, TX", "Columbus, OH", "Charlotte, NC", "Indianapolis, IN",
  "San Francisco, CA", "Seattle, WA", "Denver, CO", "Nashville, TN",
  "Oklahoma City, OK", "El Paso, TX", "Washington, DC", "Las Vegas, NV",
  "Louisville, KY", "Memphis, TN", "Portland, OR", "Baltimore, MD",
  "Milwaukee, WI", "Albuquerque, NM", "Tucson, AZ", "Fresno, CA",
  "Sacramento, CA", "Kansas City, MO", "Mesa, AZ", "Atlanta, GA",
  "Omaha, NE", "Colorado Springs, CO", "Raleigh, NC", "Miami, FL",
  "Long Beach, CA", "Virginia Beach, VA", "Minneapolis, MN", "Tampa, FL",
  "New Orleans, LA", "Arlington, TX", "Bakersfield, CA", "Honolulu, HI",
  "Anaheim, CA", "Aurora, CO", "Santa Ana, CA", "Corpus Christi, TX",
  "Riverside, CA", "St. Louis, MO", "Lexington, KY", "Pittsburgh, PA",
  "Stockton, CA", "Anchorage, AK", "Cincinnati, OH", "St. Paul, MN",
  "Greensboro, NC", "Toledo, OH", "Newark, NJ", "Plano, TX",
  "Henderson, NV", "Orlando, FL", "Lincoln, NE", "Jersey City, NJ",
  "Chandler, AZ", "St. Petersburg, FL", "Laredo, TX", "Norfolk, VA",
  "Madison, WI", "Durham, NC", "Lubbock, TX", "Winston-Salem, NC",
  "Garland, TX", "Glendale, AZ", "Hialeah, FL", "Reno, NV",
  "Baton Rouge, LA", "Irvine, CA", "Chesapeake, VA", "Scottsdale, AZ",
  "North Las Vegas, NV", "Fremont, CA", "Gilbert, AZ", "San Bernardino, CA",
  "Birmingham, AL", "Rochester, NY", "Richmond, VA", "Spokane, WA",
  "Des Moines, IA", "Montgomery, AL", "Modesto, CA", "Fayetteville, NC",
  "Tacoma, WA", "Akron, OH", "Grand Rapids, MI", "Oxnard, CA",
  "Little Rock, AR", "Huntington Beach, CA", "Salt Lake City, UT",
  "Tallahassee, FL", "Huntsville, AL", "Worcester, MA", "Knoxville, TN",
  "Providence, RI", "Brownsville, TX", "Santa Clarita, CA", "Garden Grove, CA",
  "Oceanside, CA", "Fort Lauderdale, FL", "Chattanooga, TN", "Columbus, GA",
  "Tempe, AZ", "Ontario, CA", "Hartford, CT", "Shreveport, LA",
  "Aurora, IL", "Mobile, AL", "Elk Grove, CA", "Clarksville, TN",
  "Salem, OR", "Cary, NC", "Rockford, IL", "Fort Collins, CO",
  "Jackson, MS", "Alexandria, VA", "Torrance, CA", "Cape Coral, FL",
  "Thousand Oaks, CA", "Visalia, CA", "Surprise, AZ", "Peoria, IL",
  "Lancaster, CA", "Pasadena, TX", "Hayward, CA", "Pomona, CA",
  "Palmdale, CA", "Escondido, CA", "Kansas City, KS", "Sunnyvale, CA",
  "Savannah, GA", "Bridgeport, CT", "Paterson, NJ", "Syracuse, NY",
  "McAllen, TX", "Pasadena, CA", "Mesquite, TX", "Roseville, CA",
  "Lakewood, CO", "Torrington, CT", "Hollywood, FL", "Macon, GA",
  "Salinas, CA", "Springfield, MO", "Corona, CA", "Bellevue, WA",
  "Dayton, OH", "Warren, MI", "Hampton, VA", "Columbia, SC",
  "Sterling Heights, MI", "New Haven, CT", "Waco, TX", "Olathe, KS",
  "Cedar Rapids, IA", "Topeka, KS", "Sioux Falls, SD", "Boise, ID",
  "Fargo, ND", "Shreveport, LA", "Buffalo, NY", "Bakersfield, CA",
];

function CityAutocomplete({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = query.length < 1
    ? []
    : US_METROS.filter((m) =>
        m.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function select(metro: string) {
    setQuery(metro);
    onChange(metro);
    setOpen(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuery(v);
    onChange(v);
    setOpen(true);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        required
        autoComplete="off"
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
        placeholder="e.g. Chicago, IL"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-[#1a1a2e] border border-white/10 rounded-lg overflow-hidden shadow-xl">
          {filtered.map((metro) => (
            <li key={metro}>
              <button
                type="button"
                onMouseDown={() => select(metro)}
                className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-purple-600/30 transition-colors"
              >
                {metro}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SignUpPage() {
  const router = useRouter();
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
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-purple-400">ShowShare</h1>
          <p className="text-gray-400 mt-2 text-sm">Share concerts with your friends</p>
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
            <Link href="/signin" className="text-purple-400 hover:text-purple-300">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
