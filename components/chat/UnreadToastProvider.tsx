"use client";

import { Toaster } from "sonner";
import { useUnreadToasts } from "@/hooks/useUnreadToasts";

export function UnreadToastProvider({ currentUserId }: { currentUserId: string }) {
  useUnreadToasts(currentUserId);
  return <Toaster richColors position="bottom-right" closeButton />;
}
