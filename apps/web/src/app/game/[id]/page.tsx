"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Chess } from "chess.js";
import { useAuth } from "@/lib/auth";
import { getSocket } from "@/lib/socket";
import { Board } from "@/components/Board";
import { Clock } from "@/components/Clock";
import { MoveList } from "@/components/MoveList";
import { Chat } from "@/components/Chat";
import { GameControls } from "@/components/GameControls";
import { timeControlLabel } from "@/lib/format";
import type {
  GameSnapshot,
  ChatMessage,
  GameOverPayload,
  Color,
  PlayerInfo,
} from "@/lib/types";

export default function GamePage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading, refresh } = useAuth();
  const router = useRouter();

  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [drawOffered, setDrawOffered] = useState(false);
  const [gameOver, setGameOver] = useState<GameOverPayload | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(
    null
  );
  const [oppOnline, setOppOnline] = useState(true);
  const [status, setStatus] = useState("Connecting…");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    const socket = getSocket();
    socket.emit("game:join", id);

    const rebaseClock = (s: GameSnapshot): GameSnapshot => ({
      ...s,
      clock: { ...s.clock, updatedAt: Date.now() },
    });

    const onStart = (s: GameSnapshot) => {
      setSnapshot(rebaseClock(s));
      setStatus("");
    };
    const onState = (s: GameSnapshot) => {
      setSnapshot(rebaseClock(s));
      setStatus("");
      if (s.status !== "ACTIVE") {
        // joined a finished game — send to review
        router.replace(`/review/${id}`);
      }
    };
    const onMove = (p: {
      move: { from: string; to: string; san: string; color: Color };
      fen: string;
      moves: string[];
      turn: Color;
      clock: GameSnapshot["clock"];
    }) => {
      setLastMove({ from: p.move.from, to: p.move.to });
      setDrawOffered(false);
      setSnapshot((prev) =>
        prev
          ? {
              ...prev,
              fen: p.fen,
              moves: p.moves,
              turn: p.turn,
              clock: { ...p.clock, updatedAt: Date.now() },
            }
          : prev
      );
    };
    const onOver = (payload: GameOverPayload) => {
      setGameOver(payload);
      setSnapshot((prev) => (prev ? { ...prev, status: "FINISHED" } : prev));
      refresh(); // pull updated rating into navbar
    };
    const onDrawOffered = () => setDrawOffered(true);
    const onDrawDeclined = () => setStatus("Draw offer declined");
    const onChat = (m: ChatMessage) =>
      setMessages((prev) => [...prev, m]);
    const onOppDisc = () => setOppOnline(false);
    const onOppReconn = () => setOppOnline(true);
    const onError = (msg: string) => {
      if (/finished|not found/i.test(msg)) {
        router.replace(`/review/${id}`);
      } else {
        setStatus(msg);
      }
    };

    socket.on("game:start", onStart);
    socket.on("game:state", onState);
    socket.on("game:move", onMove);
    socket.on("game:over", onOver);
    socket.on("draw:offered", onDrawOffered);
    socket.on("draw:declined", onDrawDeclined);
    socket.on("chat", onChat);
    socket.on("opponent:disconnected", onOppDisc);
    socket.on("opponent:reconnected", onOppReconn);
    socket.on("error", onError);

    return () => {
      socket.off("game:start", onStart);
      socket.off("game:state", onState);
      socket.off("game:move", onMove);
      socket.off("game:over", onOver);
      socket.off("draw:offered", onDrawOffered);
      socket.off("draw:declined", onDrawDeclined);
      socket.off("chat", onChat);
      socket.off("opponent:disconnected", onOppDisc);
      socket.off("opponent:reconnected", onOppReconn);
      socket.off("error", onError);
      socket.emit("game:leave", id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user, loading]);

  function handleMove(from: string, to: string, promotion?: string) {
    setSnapshot((prev) => {
      if (!prev) return prev;
      const c = new Chess(prev.fen);
      try {
        c.move({ from, to, promotion: (promotion as any) ?? undefined });
      } catch {
        return prev;
      }
      setLastMove({ from, to });
      return { ...prev, fen: c.fen(), turn: c.turn() };
    });
    getSocket().emit("move", { gameId: id, from, to, promotion });
  }

  const emit = (event: any) => () => getSocket().emit(event, id);

  if (loading || (!snapshot && !status)) {
    return <div className="p-10 text-center text-gray-400">Loading game…</div>;
  }

  if (!snapshot) {
    return (
      <div className="p-10 text-center text-gray-400">
        {status || "Waiting for the game to start…"}
        <div className="mt-4">
          <Link href="/" className="btn-secondary">
            Back to lobby
          </Link>
        </div>
      </div>
    );
  }

  const myColor: Color = snapshot.yourColor ?? "w";
  const orientation = myColor === "b" ? "black" : "white";
  const bottomColor: Color = myColor;
  const topColor: Color = bottomColor === "w" ? "b" : "w";

  const playerFor = (c: Color): PlayerInfo | null =>
    c === "w" ? snapshot.white : snapshot.black;

  const isActive = snapshot.status === "ACTIVE" && !gameOver;
  const interactive = isActive && snapshot.yourColor !== null;
  const canAbort = isActive && snapshot.moves.length === 0;
  const isSpectator = snapshot.yourColor === null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 grid lg:grid-cols-[auto_340px] gap-6 justify-center">
      {/* Board column */}
      <div
        className="w-full mx-auto"
        style={{ width: "min(90vw, calc(100vh - 220px), 560px)" }}
      >
        <PlayerBar
          player={playerFor(topColor)}
          clock={snapshot.clock}
          color={topColor}
          active={isActive}
          online={isSpectator ? true : oppOnline}
        />
        <div className="my-2">
          <Board
            fen={snapshot.fen}
            orientation={orientation}
            yourColor={snapshot.yourColor}
            interactive={interactive}
            lastMove={lastMove}
            onMove={handleMove}
          />
        </div>
        <PlayerBar
          player={playerFor(bottomColor)}
          clock={snapshot.clock}
          color={bottomColor}
          active={isActive}
          online={true}
        />
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        <div className="card !p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold">
              {timeControlLabel(
                snapshot.timeControl.initialTime,
                snapshot.timeControl.increment
              )}{" "}
              game
            </span>
            {!oppOnline && !isSpectator && (
              <span className="text-xs text-amber-400">
                Opponent disconnected…
              </span>
            )}
          </div>
          <MoveList moves={snapshot.moves} />
        </div>

        {interactive && (
          <GameControls
            canAbort={canAbort}
            drawOffered={drawOffered}
            onResign={emit("resign")}
            onOfferDraw={emit("draw:offer")}
            onAcceptDraw={emit("draw:accept")}
            onDeclineDraw={emit("draw:decline")}
            onAbort={emit("abort")}
          />
        )}

        {!isSpectator && (
          <Chat
            messages={messages}
            onSend={(text) => getSocket().emit("chat", { gameId: id, text })}
            disabled={false}
          />
        )}

        {isSpectator && (
          <p className="text-center text-xs text-gray-500">👀 Spectating</p>
        )}
      </div>

      {gameOver && (
        <GameOverModal
          payload={gameOver}
          myColor={snapshot.yourColor}
          gameId={id}
        />
      )}
    </div>
  );
}

function PlayerBar({
  player,
  clock,
  color,
  active,
  online,
}: {
  player: PlayerInfo | null;
  clock: GameSnapshot["clock"];
  color: Color;
  active: boolean;
  online: boolean;
}) {
  const initial = player ? player.username[0].toUpperCase() : "?";
  return (
    <div className="flex items-center justify-between bg-panel-light rounded-md px-3 py-2">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div
            className={`w-10 h-10 rounded-md flex items-center justify-center text-lg font-bold ${
              color === "w"
                ? "bg-gray-100 text-gray-900"
                : "bg-gray-800 text-gray-100 ring-1 ring-white/20"
            }`}
          >
            {initial}
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-panel-light ${
              online ? "bg-green-500" : "bg-gray-500"
            }`}
          />
        </div>
        <div className="leading-tight">
          <div className="font-semibold">
            {player ? player.username : "Waiting…"}
            {player && (
              <span className="text-sm text-gray-400 font-normal">
                {" "}
                ({player.rating})
              </span>
            )}
          </div>
          <div className="text-[11px] text-gray-500">
            {color === "w" ? "White" : "Black"}
          </div>
        </div>
      </div>
      <Clock clock={clock} color={color} active={active} />
    </div>
  );
}

function GameOverModal({
  payload,
  myColor,
  gameId,
}: {
  payload: GameOverPayload;
  myColor: Color | null;
  gameId: string;
}) {
  const { result, reason, ratings } = payload;
  let headline = "Draw";
  if (result === "WHITE_WIN") headline = "White wins";
  if (result === "BLACK_WIN") headline = "Black wins";

  let outcome: "win" | "loss" | "draw" = "draw";
  if (result !== "DRAW" && myColor) {
    const won =
      (result === "WHITE_WIN" && myColor === "w") ||
      (result === "BLACK_WIN" && myColor === "b");
    outcome = won ? "win" : "loss";
  }

  const myDelta =
    ratings && myColor
      ? myColor === "w"
        ? ratings.whiteAfter - ratings.whiteBefore
        : ratings.blackAfter - ratings.blackBefore
      : null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-panel-light rounded-xl p-8 text-center max-w-sm w-full shadow-2xl">
        <div className="text-4xl mb-2">
          {outcome === "win" ? "🏆" : outcome === "loss" ? "😞" : "🤝"}
        </div>
        <h2 className="text-2xl font-bold mb-1">{headline}</h2>
        <p className="text-gray-400 capitalize mb-4">by {reason}</p>

        {myDelta !== null && (
          <p className="mb-4">
            Rating change:{" "}
            <span
              className={myDelta >= 0 ? "text-green-400" : "text-red-400"}
            >
              {myDelta >= 0 ? `+${myDelta}` : myDelta}
            </span>
          </p>
        )}

        <div className="flex gap-2 justify-center">
          <Link href="/" className="btn-primary">
            New game
          </Link>
          <Link href={`/review/${gameId}`} className="btn-secondary">
            Review
          </Link>
        </div>
      </div>
    </div>
  );
}
