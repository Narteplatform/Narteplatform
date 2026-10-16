/** Una notifica non letta, come arriva alla campanella. */
export type NotificaItem = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  created_at: string;
};

export type NotificheIniziali = {
  items: NotificaItem[];
  count: number;
};
