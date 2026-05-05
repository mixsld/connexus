"use client";

/**
 * NotificationBadge — shows unread message count in the header.
 *
 * Subscribes to public.messages INSERT via Supabase Realtime.
 * Marks messages as "read" when the user visits the relevant chat page
 * (tracked in localStorage per conversation).
 *
 * WCAG 2.1 AA:
 *   - aria-label on the link describes the count
 *   - Badge uses role="status" + aria-live="polite" for screen readers
 *   - Focus ring on the anchor
 */

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface ConversationRow {
  id: string;
  profile_a_id: string;
  profile_b_id: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  created_at: string;
}

/** localStorage key → last-read timestamp per conversation */
function lastReadKey(conversationId: string) {
  return `connexus:last_read:${conversationId}`;
}

export function getLastRead(conversationId: string): string | null {
  try {
    return localStorage.getItem(lastReadKey(conversationId));
  } catch {
    return null;
  }
}

export function markAsRead(conversationId: string) {
  try {
    localStorage.setItem(lastReadKey(conversationId), new Date().toISOString());
  } catch {
    // localStorage unavailable
  }
}

export default function NotificationBadge() {
  const [unread, setUnread] = useState(0);
  const profileIdRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      // 1. Get current user's profile id
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!profile) return;

      profileIdRef.current = profile.id;

      // 2. Fetch all conversations for this user
      const { data: convos } = await supabase
        .from("conversations")
        .select("id, profile_a_id, profile_b_id")
        .or(`profile_a_id.eq.${profile.id},profile_b_id.eq.${profile.id}`);

      if (!convos || convos.length === 0) return;

      // 3. Count unread messages across all conversations
      async function countUnread(conversations: ConversationRow[]) {
        let total = 0;
        for (const conv of conversations) {
          const lastRead = getLastRead(conv.id);
          const query = supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .neq("sender_id", profile!.id);

          if (lastRead) {
            query.gt("created_at", lastRead);
          }

          const { count } = await query;
          total += count ?? 0;
        }
        setUnread(total);
      }

      await countUnread(convos as ConversationRow[]);

      // 4. Subscribe to new messages via Realtime
      const convIds = convos.map((c: ConversationRow) => c.id);

      channel = supabase
        .channel("unread-messages")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
          },
          (payload) => {
            const msg = payload.new as MessageRow;
            // Only count messages in our conversations, not sent by us
            if (
              convIds.includes(msg.conversation_id) &&
              msg.sender_id !== profileIdRef.current
            ) {
              const lastRead = getLastRead(msg.conversation_id);
              if (!lastRead || msg.created_at > lastRead) {
                setUnread((n) => n + 1);
              }
            }
          }
        )
        .subscribe();
    }

    init();

    return () => {
      if (channel) {
        const supabase = createClient();
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return (
    <a
      href="/connections"
      aria-label={
        unread > 0
          ? `Connections — ${unread} unread message${unread === 1 ? "" : "s"}`
          : "Connections"
      }
      className={[
        "relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5",
        "rounded-xl px-3 py-2 text-sm font-medium",
        "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500",
        "transition-colors duration-150",
      ].join(" ")}
    >
      {/* Chat bubble icon */}
      <svg
        className="h-5 w-5"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 0 0 1.28.53l3.58-3.579a.78.78 0 0 1 .527-.224 41.202 41.202 0 0 0 5.183-.5c1.437-.232 2.43-1.49 2.43-2.903V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0 0 10 2Z"
          clipRule="evenodd"
        />
      </svg>

      <span className="hidden sm:inline">Connections</span>

      {/* Unread badge */}
      {unread > 0 && (
        <span
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={[
            "absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center",
            "rounded-full px-1 text-[10px] font-bold leading-none text-white",
          ].join(" ")}
          style={{ backgroundColor: "#F5A623", color: "#1a1a1a" }}
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </a>
  );
}
