"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type DockState = {
  open: boolean;
  activeId: string | null;
};

type Ctx = {
  state: DockState;
  openDock: () => void;
  closeDock: () => void;
  toggleDock: () => void;
  openConversation: (id: string) => void;
  clearConversation: () => void;
};

const ChatDockContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "narte:chatdock:v1";

export function ChatDockProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DockState>({ open: false, activeId: null });

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw));
    } catch {
      // noop
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // noop
    }
  }, [state]);

  const openDock = useCallback(() => setState((s) => ({ ...s, open: true })), []);
  const closeDock = useCallback(() => setState({ open: false, activeId: null }), []);
  const toggleDock = useCallback(() => setState((s) => ({ ...s, open: !s.open })), []);
  const openConversation = useCallback(
    (id: string) => setState({ open: true, activeId: id }),
    [],
  );
  const clearConversation = useCallback(
    () => setState((s) => ({ ...s, activeId: null })),
    [],
  );

  return (
    <ChatDockContext.Provider
      value={{ state, openDock, closeDock, toggleDock, openConversation, clearConversation }}
    >
      {children}
    </ChatDockContext.Provider>
  );
}

export function useChatDock(): Ctx {
  const ctx = useContext(ChatDockContext);
  if (!ctx) throw new Error("useChatDock must be used within ChatDockProvider");
  return ctx;
}
