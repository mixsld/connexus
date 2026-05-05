"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NavLinks() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
      setLoading(false);
    });
  }, []);

  // Hide everything while checking auth (prevents flicker)
  if (loading) return null;

  // When not logged in, show nothing
  if (!isLoggedIn) return null;

  const linkClasses = (href: string) =>
    `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
      pathname.startsWith(href)
        ? "bg-amber-100 text-amber-500 dark:bg-amber-900/20 dark:text-amber-400"
        : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
    }`;

  return (
    <>
      <Link href="/match" className={linkClasses("/match")}>
        Discover
      </Link>
      <Link href="/connections" className={linkClasses("/connections")}>
        Connections
      </Link>
      <Link href="/projects" className={linkClasses("/projects")}>
        Projects
      </Link>
    </>
  );
}