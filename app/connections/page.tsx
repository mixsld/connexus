"use client";

/**
 * Connections page — lists all confirmed mutual matches (conversations).
 *
 * A conversation exists when both sides have expressed interest.
 * Shows: other person's name, program, last message preview, timestamp,
 * unread indicator, and a link to /chat/[conversationId].
 *
 * WCAG 2.1 AA: semantic list, focus rings, aria-labels, live regions.
 * Tailwind v4, dark mode via .dark class.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getLastRead } from "@/components/ui/NotificationBadge";

interface OtherProfile {
  id: string;
  full_name: string;
  program: string;
  college: string;
}

interface ConversationItem {
  id: string;
  otherProfile: OtherProfile;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastMessageSenderId: string | null;
  unread: boolean;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function ConnectionsPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Auth check
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      // Get my profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) {
        router.push("/profile");
        return;
      }

      setMyProfileId(profile.id);

      // Fetch all conversations I'm part of
      const { data: convos, error: convError } = await supabase
        .from("conversations")
        .select("id, profile_a_id, profile_b_id, created_at")
        .or(`profile_a_id.eq.${profile.id},profile_b_id.eq.${profile.id}`)
        .order("created_at", { ascending: false });

      if (convError) {
        setError("Failed to load connections. Please try again.");
        setLoading(false);
        return;
      }

      if (!convos || convos.length === 0) {
        setLoading(false);
        return;
      }

      // For each conversation, fetch the other profile + last message
      const items: ConversationItem[] = await Promise.all(
        convos.map(async (conv) => {
          const otherId =
            conv.profile_a_id === profile.id
              ? conv.profile_b_id
              : conv.profile_a_id;

          // Fetch other profile
          const { data: other } = await supabase
            .from("profiles")
            .select("id, full_name, program, college")
            .eq("id", otherId)
            .single();

          // Fetch last message
          const { data: msgs } = await supabase
            .from("messages")
            .select("id, body, created_at, sender_id")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1);

          const lastMsg = msgs?.[0] ?? null;

          // Determine unread: last message is from other person and after last-read timestamp
          const lastRead = getLastRead(conv.id);
          const unread =
            lastMsg !== null &&
            lastMsg.sender_id !== profile.id &&
            (!lastRead || lastMsg.created_at > lastRead);

          return {
            id: conv.id,
            otherProfile: other as OtherProfile,
            lastMessage: lastMsg?.body ?? null,
            lastMessageAt: lastMsg?.created_at ?? null,
            lastMessageSenderId: lastMsg?.sender_id ?? null,
            unread,
          };
        })
      );

      // Sort: conversations with messages first, then by recency
      items.sort((a, b) => {
        if (a.lastMessageAt && b.lastMessageAt) {
          return (
            new Date(b.lastMessageAt).getTime() -
            new Date(a.lastMessageAt).getTime()
          );
        }
        if (a.lastMessageAt) return -1;
        if (b.lastMessageAt) return 1;
        return 0;
      });

      setConversations(items);
      setLoading(false);
    }

    load();
  }, [router]);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="mb-8 space-y-3">
          <div className="h-8 w-44 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      {/* Heading */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-3xl">
          Connections
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Your confirmed mutual matches. Start a conversation.
        </p>
      </header>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {/* Empty state */}
      {!error && conversations.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-50 dark:bg-violet-900/20">
            <svg
              className="h-8 w-8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#7C3AED"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
              />
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900 dark:text-gray-50">
              No connections yet
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Express interest in matches — when someone is interested back,
              you&apos;ll appear here.
            </p>
          </div>
          <a
            href="/match"
            className="mt-2 inline-flex min-h-[44px] items-center rounded-lg px-5 py-2.5 text-sm font-semibold text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 transition-all hover:brightness-95"
            style={{ backgroundColor: "#7C3AED" }}
          >
            Find matches
          </a>
        </div>
      )}

      {/* Conversation list */}
      {conversations.length > 0 && (
        <ul className="space-y-2" aria-label="Your connections">
          {conversations.map((conv) => (
            <li key={conv.id}>
              <a
                href={`/chat/${conv.id}`}
                className={[
                  "flex items-center gap-4 rounded-2xl border p-4",
                  "bg-white dark:bg-gray-900",
                  conv.unread
                    ? "border-violet-300 dark:border-violet-700"
                    : "border-gray-200 dark:border-gray-700",
                  "hover:shadow-md transition-all duration-150",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500",
                ].join(" ")}
                aria-label={[
                  conv.otherProfile?.full_name ?? "Unknown",
                  conv.unread ? "— unread messages" : "",
                  conv.lastMessage
                    ? `— last message: ${conv.lastMessage.slice(0, 60)}`
                    : "— no messages yet",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {/* Avatar */}
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
                  style={{ backgroundColor: "#7C3AED" }}
                  aria-hidden="true"
                >
                  {conv.otherProfile?.full_name?.[0]?.toUpperCase() ?? "?"}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p
                      className={[
                        "truncate text-sm",
                        conv.unread
                          ? "font-bold text-gray-900 dark:text-gray-50"
                          : "font-semibold text-gray-800 dark:text-gray-100",
                      ].join(" ")}
                    >
                      {conv.otherProfile?.full_name ?? "Unknown"}
                    </p>
                    {conv.lastMessageAt && (
                      <time
                        dateTime={conv.lastMessageAt}
                        className="shrink-0 text-xs text-gray-400 dark:text-gray-500"
                      >
                        {formatRelativeTime(conv.lastMessageAt)}
                      </time>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                    {conv.otherProfile?.program ?? ""}
                  </p>
                  {conv.lastMessage ? (
                    <p
                      className={[
                        "mt-1 truncate text-sm",
                        conv.unread
                          ? "font-medium text-gray-800 dark:text-gray-200"
                          : "text-gray-500 dark:text-gray-400",
                      ].join(" ")}
                    >
                      {conv.lastMessageSenderId === myProfileId ? (
                        <span className="text-gray-400 dark:text-gray-500">
                          You:{" "}
                        </span>
                      ) : null}
                      {conv.lastMessage}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm italic text-gray-400 dark:text-gray-500">
                      No messages yet — say hello!
                    </p>
                  )}
                </div>

                {/* Unread dot */}
                {conv.unread && (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: "#7C3AED" }}
                    aria-hidden="true"
                  />
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
