"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";

interface Props {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function Chat({ messages, onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll inside the message list only — scrollIntoView() would jump the
  // whole page on mobile (the chat sits below the board).
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  }

  return (
    <div className="flex flex-col bg-panel rounded-md h-48">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scroll-thin p-2 space-y-1 text-sm"
      >
        {messages.length === 0 ? (
          <p className="text-gray-500 text-xs text-center py-4">
            Say hello to your opponent 👋
          </p>
        ) : (
          messages.map((m, i) => (
            <div key={i}>
              <span className="font-semibold text-brand">{m.username}:</span>{" "}
              <span className="text-gray-200 break-words">{m.text}</span>
            </div>
          ))
        )}
      </div>
      <form onSubmit={submit} className="p-2 border-t border-panel-lighter flex gap-2">
        <input
          className="input text-sm py-1"
          placeholder={disabled ? "Chat unavailable" : "Type a message…"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          maxLength={300}
        />
        <button className="btn-primary text-sm py-1 px-3" disabled={disabled}>
          Send
        </button>
      </form>
    </div>
  );
}
