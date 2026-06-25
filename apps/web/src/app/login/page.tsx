"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(username, password);
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm bg-panel-light rounded-xl p-8 shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">Log in</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            className="input"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "Logging in…" : "Log in"}
          </button>
        </form>
        <p className="text-sm text-gray-400 mt-4 text-center">
          No account?{" "}
          <Link href="/register" className="text-brand hover:underline">
            Sign up
          </Link>
        </p>
        <p className="text-xs text-gray-500 mt-4 text-center">
          Demo account: <code>alice</code> / <code>password123</code>
        </p>
      </div>
    </div>
  );
}
