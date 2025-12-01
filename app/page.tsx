'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  parts: { type: 'text'; text: string }[];
  createdAt?: string;
};

const POLL_INTERVAL = 4000;

export default function ChatRoom() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [name, setName] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('chatName') || '';
  });
  const [joined, setJoined] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpName, setSignUpName] = useState("");
  const [signUpMessage, setSignUpMessage] = useState<string | null>(null);

  // Bootstrap and poll messages
  useEffect(() => {
    let isMounted = true;
    let interval: ReturnType<typeof setInterval>;

    const fetchMessages = async () => {
      try {
        const res = await fetch('/api/messages');
        const data = await res.json();
        if (!res.ok) {
          if (isMounted) {
            setError(data.error || 'This room is private. Access denied.');
            setMessages([]);
            setIsLoading(false);
          }
          return;
        }
        if (!isMounted) return;
        setMessages(data.messages || []);
        setIsLoading(false);
      } catch (err) {
        console.error(err);
        if (isMounted) setIsLoading(false);
      }
    };

    fetchMessages();
    interval = setInterval(fetchMessages, POLL_INTERVAL);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedName = localStorage.getItem('chatName');
    if (storedName) {
      setJoined(true);
      setName(storedName);
    }
  }, []);

  const handleJoin = () => {
    const displayName = name.trim() || 'Guest';
    setName(displayName);
    localStorage.setItem('chatName', displayName);
    setJoined(true);
    setError(null);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!joined) {
      setError('Join the room first.');
      return;
    }
    if (!session?.user) {
      setError('You must be signed in to chat.');
      return;
    }
    if (!text || isSending) return;
    setIsSending(true);
    setError(null);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name || 'Guest', text }),
    });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send message');
      }

      const msg = await res.json();
      setMessages((prev) => [...prev, msg]);
      setInput('');
      if (name) localStorage.setItem('chatName', name);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSending(false);
    }
  };

  const handleSignUp = async () => {
    setSignUpMessage(null);
    if (!signUpEmail.trim() || !signUpPassword.trim()) {
      setSignUpMessage("Email and password are required.");
      return;
    }
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: signUpEmail.trim(),
          password: signUpPassword,
          name: signUpName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSignUpMessage(data.error || "Failed to create account.");
        return;
      }
      setSignUpMessage("Account created. Signing you in…");
      await signIn("credentials", {
        email: signUpEmail.trim(),
        password: signUpPassword,
        redirect: false,
      });
      setSignUpEmail("");
      setSignUpPassword("");
      setSignUpName("");
    } catch (err) {
      setSignUpMessage("Failed to create account.");
    }
  };

  const messageCount = useMemo(() => messages.length, [messages]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-emerald-100 px-4 py-12 text-zinc-900 dark:from-zinc-950 dark:via-zinc-900 dark:to-emerald-950 dark:text-zinc-50 sm:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-3 rounded-3xl bg-white/80 p-6 shadow-lg shadow-emerald-100/70 ring-1 ring-emerald-100 backdrop-blur dark:bg-zinc-900/80 dark:shadow-emerald-900/30 dark:ring-emerald-900/50">
          <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs uppercase tracking-[0.16em] text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-100 dark:ring-emerald-800">
              Private room
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs uppercase tracking-[0.12em] text-emerald-800 ring-1 ring-emerald-200 dark:bg-zinc-950 dark:text-emerald-100 dark:ring-emerald-800">
              Family only
            </span>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold sm:text-4xl">
              sompretee
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              A private room for family only. Sign in with your family email to join the chat.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
            <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-100 dark:ring-emerald-800">
              {isLoading ? 'Loading history…' : `${messageCount} message${messageCount === 1 ? '' : 's'}`}
            </span>
            <button
              type="button"
              onClick={handleJoin}
              className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white shadow-md shadow-emerald-200/70 transition hover:-translate-y-0.5 hover:shadow-emerald-300/80 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:shadow-emerald-900/40"
            >
              {joined ? 'Joined' : 'Join room'}
            </button>
            {status === 'authenticated' ? (
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/' })}
                className="rounded-full border border-emerald-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800 transition hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
              >
                Sign out {session?.user?.name ? `(${session.user.name})` : ''}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => signIn(undefined, { callbackUrl: '/' })}
                className="rounded-full border border-emerald-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800 transition hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
              >
                Sign in
              </button>
            )}
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr,1fr]">
          <div className="rounded-3xl border border-emerald-100 bg-white/80 p-5 shadow-md shadow-emerald-100/70 backdrop-blur dark:border-emerald-900/50 dark:bg-zinc-900/80 dark:shadow-emerald-900/30">
            <div className="flex flex-col gap-4">
              <div className="h-[60vh] overflow-y-auto pr-2">
                {isLoading ? (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
                    Loading messages…
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
                    Be the first to say hi!
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-3 ring-1 ${
                            message.role === 'user'
                              ? 'bg-white text-zinc-900 ring-zinc-200 dark:bg-zinc-950 dark:text-zinc-50 dark:ring-zinc-800'
                              : 'bg-emerald-600 text-white ring-emerald-200/70'
                          }`}
                        >
                          <div className="space-y-1 text-sm leading-relaxed">
                            {message.parts.map((part, idx) => (
                              <div key={`${message.id}-${idx}`} className="whitespace-pre-wrap">
                                {part.text}
                              </div>
                            ))}
                          </div>
                          {message.createdAt ? (
                            <p className="mt-2 text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                              {new Date(message.createdAt).toLocaleTimeString()}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/60 dark:text-rose-100">
                  {error}
                </div>
              ) : null}
              {status !== 'authenticated' ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/60 dark:text-amber-100">
                  Sign in with your family email to participate.
                </div>
              ) : null}

              <form
                className="flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
              >
                <div className="flex flex-wrap gap-2">
                  <input
                    className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm shadow-inner shadow-emerald-50 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300 dark:border-emerald-900/60 dark:bg-zinc-950 dark:text-zinc-100 dark:shadow-none dark:focus:border-emerald-700 dark:focus:ring-emerald-800"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Display name"
                    aria-label="Display name"
                    disabled={status !== 'authenticated'}
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm shadow-inner shadow-emerald-50 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300 dark:border-emerald-900/60 dark:bg-zinc-950 dark:text-zinc-100 dark:shadow-none dark:focus:border-emerald-700 dark:focus:ring-emerald-800"
                    value={input}
                    placeholder="Type a message…"
                    onChange={(e) => setInput(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    aria-label="Chat message"
                    disabled={status !== 'authenticated'}
                  />
                  <button
                    type="submit"
                    className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200/70 transition hover:-translate-y-0.5 hover:shadow-emerald-300/80 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:shadow-emerald-900/40"
                    disabled={status !== 'authenticated' || !joined || isSending || input.trim().length === 0}
                  >
                    {isSending ? 'Sending…' : 'Send'}
                  </button>
                </div>
                {!joined ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Tap “Join room” above to start chatting.
                  </p>
                ) : null}
              </form>
            </div>
          </div>

          <aside className="flex flex-col gap-3 rounded-3xl border border-emerald-100 bg-white/80 p-5 shadow-md shadow-emerald-100/70 backdrop-blur dark:border-emerald-900/50 dark:bg-zinc-900/80 dark:shadow-emerald-900/30">
            <h3 className="text-lg font-semibold">Family rules</h3>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li>Be kind. No harassment, spam, or hate speech.</li>
              <li>Never share sensitive info (passwords, tokens, personal data).</li>
              <li>Use a clear, short display name so people know who you are.</li>
            </ul>
            {status !== 'authenticated' ? (
              <div className="mt-2 space-y-3 rounded-2xl border border-zinc-200 bg-white/90 p-4 dark:border-zinc-800 dark:bg-zinc-950/70">
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Family access</h4>
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-inner shadow-zinc-100 outline-none transition focus:ring-2 focus:ring-emerald-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:shadow-none"
                  placeholder="Name (optional)"
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                />
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-inner shadow-zinc-100 outline-none transition focus:ring-2 focus:ring-emerald-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:shadow-none"
                  placeholder="Email"
                  type="email"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                />
                <input
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-inner shadow-zinc-100 outline-none transition focus:ring-2 focus:ring-emerald-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:shadow-none"
                  placeholder="Password"
                  type="password"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleSignUp}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-200/70 transition hover:-translate-y-0.5 hover:shadow-emerald-300/80 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:shadow-emerald-900/40"
                  disabled={!signUpEmail.trim() || !signUpPassword.trim()}
                >
                  Sign up
                </button>
                {signUpMessage ? (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">{signUpMessage}</p>
                ) : (
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">Use your family email to access this room.</p>
                )}
              </div>
            ) : null}
          </aside>
        </section>
      </div>
    </main>
  );
}
