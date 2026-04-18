import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { API_BASE } from "@/lib/api";

/**
 * Hook que mantém uma conexão Socket.IO ao namespace /quiz e estado da sala.
 * Stable: cria 1 socket por componente, reutiliza em re-renders.
 */
export function useQuizSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState<{ sessionId: string; playerId: string; sessionTitle?: string } | null>(null);
  const [answerResult, setAnswerResult] = useState<{ correct: boolean; points: number; timeMs: number } | null>(null);

  // Resolve URL do socket — namespace /quiz
  const url = useMemo(() => {
    // API_BASE pode ser ".../api" — Socket.IO conecta na origem, namespace separado
    try {
      const u = new URL(API_BASE);
      return `${u.protocol}//${u.host}`;
    } catch {
      return window.location.origin;
    }
  }, []);

  useEffect(() => {
    const s = io(`${url}/quiz`, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });
    socketRef.current = s;

    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));
    s.on("state", (st: any) => setState(st));
    s.on("joined", (j: any) => setJoined(j));
    s.on("answer_result", (r: any) => setAnswerResult(r));
    s.on("error", (e: any) => setError(e?.message || "Erro"));

    return () => { s.disconnect(); socketRef.current = null; };
  }, [url]);

  function emit(event: string, payload: any) {
    socketRef.current?.emit(event, payload);
  }

  return { socket: socketRef.current, state, connected, error, joined, answerResult, emit, setError, setAnswerResult };
}
