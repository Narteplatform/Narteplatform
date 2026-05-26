"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { deleteBlogPost } from "@/app/(admin)/admin/blog/_actions";

export function DeleteBlogPostButton({ id, title }: { id: string; title: string }) {
  const [pending, start] = useTransition();
  function onClick() {
    if (!confirm(`Eliminare definitivamente "${title}"?`)) return;
    start(async () => {
      await deleteBlogPost(id);
    });
  }
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick} disabled={pending}>
      <Trash2 className="size-3.5" /> {pending ? "Eliminazione..." : "Elimina"}
    </Button>
  );
}
