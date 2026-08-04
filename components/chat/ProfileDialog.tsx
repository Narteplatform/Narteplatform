"use client";

import Link from "next/link";
import { ExternalLink, Globe, Instagram, MapPin, Music2, Phone, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ArtistTierBadges } from "@/components/marketing/ArtistBadges";
import type { ChatPartyMeta } from "@/lib/chat/queries";

export function ProfileDialog({
  open,
  onClose,
  meta,
  party,
}: {
  open: boolean;
  onClose: () => void;
  meta: ChatPartyMeta;
  party: "artist" | "organizer";
}) {
  if (!open) return null;

  const isArtist = party === "artist";
  const p = isArtist ? meta.artist : meta.organizer;
  const title = isArtist ? "Profilo artista" : "Profilo organizzatore";

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-notte/50 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-surface border border-border shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-display text-lg text-notte">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-muted"
            aria-label="Chiudi"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div className="flex items-center gap-4">
            <Avatar src={p.avatarUrl} name={p.name} size="lg" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="font-display text-xl text-notte truncate">{p.name}</div>
                {isArtist && (
                  <ArtistTierBadges tier={meta.artist.tier} compact className="shrink-0" />
                )}
              </div>
              {isArtist ? (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {meta.artist.city && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" /> {meta.artist.city}
                    </span>
                  )}
                  {(meta.artist.genre ?? []).slice(0, 3).map((g) => (
                    <Badge key={g} variant="muted">{g}</Badge>
                  ))}
                </div>
              ) : (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {meta.organizer.isBrand && <Badge variant="accent">Brand</Badge>}
                </div>
              )}
            </div>
          </div>

          {(isArtist ? meta.artist.bio : meta.organizer.bio) && (
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {isArtist ? meta.artist.bio : meta.organizer.bio}
            </p>
          )}

          <div className="grid grid-cols-1 gap-2 text-sm">
            {isArtist ? (
              <>
                {meta.artist.instagram && (
                  <a
                    href={meta.artist.instagram.startsWith("http") ? meta.artist.instagram : `https://instagram.com/${meta.artist.instagram.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-foreground hover:text-azzurro"
                  >
                    <Instagram className="size-4" /> {meta.artist.instagram}
                  </a>
                )}
                {meta.artist.spotify && (
                  <a
                    href={meta.artist.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-foreground hover:text-azzurro"
                  >
                    <Music2 className="size-4" /> Spotify
                  </a>
                )}
                {meta.artist.website && (
                  <a
                    href={meta.artist.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-foreground hover:text-azzurro"
                  >
                    <Globe className="size-4" /> Sito ufficiale
                  </a>
                )}
              </>
            ) : (
              <>
                {meta.organizer.phone && (
                  <a
                    href={`tel:${meta.organizer.phone}`}
                    className="inline-flex items-center gap-2 text-foreground hover:text-azzurro"
                  >
                    <Phone className="size-4" /> {meta.organizer.phone}
                  </a>
                )}
                {meta.organizer.instagram && (
                  <a
                    href={meta.organizer.instagram.startsWith("http") ? meta.organizer.instagram : `https://instagram.com/${meta.organizer.instagram.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-foreground hover:text-azzurro"
                  >
                    <Instagram className="size-4" /> {meta.organizer.instagram}
                  </a>
                )}
                {meta.organizer.website && (
                  <a
                    href={meta.organizer.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-foreground hover:text-azzurro"
                  >
                    <Globe className="size-4" /> Sito web
                  </a>
                )}
              </>
            )}
          </div>

          {isArtist && (
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href={`/artisti/${meta.artist.slug}`} target="_blank" onClick={onClose}>
                <ExternalLink className="size-3.5" />
                Apri profilo pubblico
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
