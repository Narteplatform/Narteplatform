import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { Inbox, Mail } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";

type Item = {
  kind: "lead" | "message";
  id: string;
  primaryName: string;
  detail: string;
  createdAt: string;
};

export function ActivityList({ items, emptyText = "Nessuna attività recente." }: { items: Item[]; emptyText?: string }) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        {emptyText}
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const Icon = item.kind === "lead" ? Inbox : Mail;
        const tag = item.kind === "lead" ? "richiesta" : "messaggio";
        const timeLabel = (() => {
          try {
            return formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: it });
          } catch {
            return "";
          }
        })();
        return (
          <li key={`${item.kind}-${item.id}`} className="flex items-start gap-3">
            <Avatar name={item.primaryName} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{item.primaryName}</p>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                <Icon className="mr-1 inline size-3 text-muted-foreground" aria-hidden="true" />
                <span className="uppercase tracking-wide text-[10px] text-muted-foreground/80 mr-1">
                  {tag}
                </span>
                {item.detail}
              </p>
              {timeLabel && (
                <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground/80">
                  {timeLabel}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export type ActivityFeedProps = {
  items: Item[];
  emptyText?: string;
};
