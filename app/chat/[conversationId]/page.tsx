"use client";

/**
 * Chat page — real-time messaging for a confirmed connection.
 *
 * - Fetches conversation + other profile on mount
 * - Loads message history (paginated, oldest-first)
 * - Subscribes to public.messages INSERT via Supabase Realtime
 * - Sends messages via Supabase insert
 * - Marks conversation as read on mount + on new incoming message
 * - Auto-scrolls to bottom on new messages
 *
 * WCAG 2.1 AA: live region for new messages, focus management,
 *   visible labels, min 44px touch targets, focus rings.
 * Tailwind v4, dark mode via .dark class.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { markAsRead } from "@/components/ui/NotificationBadge";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

interface OtherProfile {
  id: string;
  full_name: string;
  program: string;
  college: string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const PAGE_SIZE = 50;

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.conversationId as string;

  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [otherProfile, setOtherProfile] = useState<OtherProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  // ── Scroll to bottom ────────────────────────────────────────────────────────
  const scrollToBottom = useCallback((smooth = false) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
  }, []);

  // ── Load conversation + messages ────────────────────────────────────────────
  useEffect(() => {
    if (!conversationId) return;

    async function load() {
      const supabase = createClient();

      // Auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      // My profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!profile) { router.push("/profile"); return; }
      setMyProfileId(profile.id);

      // Conversation
      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .select("id, profile_a_id, profile_b_id")
        .eq("id", conversationId)
        .single();

      if (convErr || !conv) {
        setError("Conversation not found.");
        setLoading(false);
        return;
      }

      // Verify I'm a participant
      if (conv.profile_a_id !== profile.id && conv.profile_b_id !== profile.id) {
        setError("You are not a participant in this conversation.");
        setLoading(false);
        return;
      }

      // Other profile
      const otherId = conv.profile_a_id === profile.id ? conv.profile_b_id : conv.profile_a_id;
      const { data: other } = await supabase
        .from("profiles")
        .select("id, full_name, program, college")
        .eq("id", otherId)
        .single();
      setOtherProfile(other as OtherProfile);

      // Messages (oldest first, last PAGE_SIZE)
      const { data: msgs, error: msgsErr } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, body, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(PAGE_SIZE);

      if (msgsErr) {
        setError("Failed to load messages.");
        setLoading(false);
        return;
      }

      setMessages((msgs ?? []) as Message[]);
      markAsRead(conversationId);
      setLoading(false);
    }

    load();
  }, [conversationId, router]);

  // ── Scroll to bottom after initial load ────────────────────────────────────
  useEffect(() => {
    if (!loading) scrollToBottom(false);
  }, [loading, scrollToBottom]);

  // ── Realtime subscription ───────────────────────────────────────────────────
  useEffect(() => {
    if (!conversationId || !myProfileId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Deduplicate — optimistic insert may already have added it
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Mark as read if the message is from the other person
          if (newMsg.sender_id !== myProfileId) {
            markAsRead(conversationId);
          }
          scrollToBottom(true);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, myProfileId, scrollToBottom]);

  // ── Send message ────────────────────────────────────────────────────────────
  async function handleSend() {
    const body = input.trim();
    if (!body || !myProfileId || sending) return;

    setSendError(null);
    setSending(true);

    // Optimistic insert
    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: Message = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_id: myProfileId,
      body,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    scrollToBottom(true);

    const supabase = createClient();
    const { data: inserted, error: insertErr } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: myProfileId,
        body,
      })
      .select("id, conversation_id, sender_id, body, created_at")
      .single();

    if (insertErr) {
      // Roll back optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setSendError("Failed to send message. Please try again.");
      setInput(body); // restore input
      setSending(false);
      return;
    }

    // Replace optimistic with real message
    setMessages((prev) =>
      prev.map((m) => (m.id === optimisticId ? (inserted as Message) : m))
    );
    setSending(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col">
        {/* Header skeleton */}
        <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
          <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="space-y-1.5">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
        {/* Messages skeleton */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : ""}`}>
              <div className="h-10 w-48 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-base font-semibold text-gray-900 dark:text-gray-50">{error}</p>
        <a
          href="/connections"
          className="mt-4 inline-block text-sm text-violet-600 hover:underline dark:text-violet-400"
        >
          Back to connections
        </a>
      </div>
    );
  }

  // ── Chat UI ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* ── Chat header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
        <a
          href="/connections"
          aria-label="Back to connections"
          className="mr-1 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 transition-colors"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
          </svg>
        </a>

        {/* Avatar */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: "#7C3AED" }}
          aria-hidden="true"
        >
          {otherProfile?.full_name?.[0]?.toUpperCase() ?? "?"}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-50">
            {otherProfile?.full_name ?? "Unknown"}
          </p>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            {otherProfile?.program ?? ""}
          </p>
        </div>
      </div>

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              No messages yet. Say hello to {otherProfile?.full_name ?? "your connection"}!
            </p>
          </div>
        )}

        <div className="space-y-3">
          {messages.map((msg) => {
            const isMe = msg.sender_id === myProfileId;
            const isOptimistic = msg.id.startsWith("optimistic-");
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={[
                    "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                    isMe
                      ? "rounded-br-sm text-white"
                      : "rounded-bl-sm bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100",
                    isOptimistic ? "opacity-70" : "",
                  ].join(" ")}
                  style={isMe ? { backgroundColor: "#7C3AED" } : undefined}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                  <p
                    className={[
                      "mt-1 text-right text-[10px]",
                      isMe ? "text-white/60" : "text-gray-400 dark:text-gray-500",
                    ].join(" ")}
                    aria-label={`Sent at ${formatTime(msg.created_at)}`}
                  >
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Scroll anchor */}
        <div ref={bottomRef} aria-hidden="true" />
      </div>

      {/* ── Input area ───────────────────────────────────────────────────── */}
      <div className="border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
        {sendError && (
          <p role="alert" className="mb-2 text-xs text-red-600 dark:text-red-400">
            {sendError}
          </p>
        )}
        <div className="flex items-end gap-2">
          <label htmlFor="message-input" className="sr-only">
            Message {otherProfile?.full_name ?? "your connection"}
          </label>
          <textarea
            id="message-input"
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // Auto-grow: reset then set scrollHeight
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${otherProfile?.full_name ?? ""}…`}
            disabled={sending}
            className={[
              "flex-1 resize-none overflow-hidden rounded-xl border px-3 py-2.5 text-sm",
              "bg-white text-gray-900 placeholder:text-gray-400",
              "dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500",
              "border-gray-300 dark:border-gray-600",
              "focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/30",
              "dark:focus:border-violet-500 dark:focus:ring-violet-500/30",
              "transition-colors duration-150",
              sending ? "opacity-60" : "",
            ].join(" ")}
            aria-label={`Message ${otherProfile?.full_name ?? "your connection"}`}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            aria-label="Send message"
            className={[
              "flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl",
              "text-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500",
              "transition-all duration-150",
              !input.trim() || sending
                ? "cursor-not-allowed opacity-40"
                : "hover:brightness-95 active:scale-95",
            ].join(" ")}
            style={{ backgroundColor: "#7C3AED" }}
          >
            {sending ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" />
              </svg>
            )}
          </button>
        </div>
        <p className="mt-1.5 text-center text-xs text-gray-400 dark:text-gray-500">
          Press <kbd className="rounded border border-gray-300 px-1 py-0.5 text-xs dark:border-gray-600">Enter</kbd> to send,{" "}
          <kbd className="rounded border border-gray-300 px-1 py-0.5 text-xs dark:border-gray-600">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
}
