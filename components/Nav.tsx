"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

export default function Nav({ userName }: { userName: string }) {
  const path = usePathname();

  const links = [
    { href: "/", label: "Feed" },
    { href: "/my-concerts", label: "My Shows" },
    { href: "/add", label: "+ Add Show" },
    { href: "/calendar", label: "Calendar" },
    { href: "/friends", label: "Friends" },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0f]/90 backdrop-blur">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        <Link href="/" className="font-bold text-lg tracking-tight text-purple-400">
          Bandwagon
        </Link>
        <div className="flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                path === l.href
                  ? "bg-purple-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <div className="ml-3 flex items-center gap-2 text-sm text-gray-400">
            <span>{userName}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/signin" })}
              className="text-gray-500 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
