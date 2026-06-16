"use client";

import * as React from "react";
import { Instagram, Globe, Music, Facebook, Youtube } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";

type SocialItem = {
  key: string;
  href: string;
  label: string;
  icon: React.ReactNode;
};

type Props = {
  instruments: string[];
  socials: SocialItem[];
  artistName: string;
};

export function ArtistToolsSocialTabs({ instruments, socials, artistName }: Props) {
  const hasBoth = instruments.length > 0 && socials.length > 0;
  const defaultTab = instruments.length > 0 ? "strumenti" : "social";

  if (instruments.length === 0 && socials.length === 0) return null;

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList
        className="mb-8 bg-white/10 p-1"
        aria-label="Strumenti e Social"
      >
        {instruments.length > 0 && (
          <TabsTrigger
            value="strumenti"
            className="text-white/70 data-[state=active]:bg-white data-[state=active]:text-notte hover:text-white"
          >
            STRUMENTI
          </TabsTrigger>
        )}
        {socials.length > 0 && (
          <TabsTrigger
            value="social"
            className="text-white/70 data-[state=active]:bg-white data-[state=active]:text-notte hover:text-white"
          >
            SOCIAL
          </TabsTrigger>
        )}
      </TabsList>

      {instruments.length > 0 && (
        <TabsContent value="strumenti">
          <p className="mb-5 text-sm text-white/60">
            Setup live di {artistName}.
          </p>
          <ul className="flex flex-wrap gap-2">
            {instruments.map((i) => (
              <li
                key={i}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm text-white/90 lowercase"
              >
                {i}
              </li>
            ))}
          </ul>
        </TabsContent>
      )}

      {socials.length > 0 && (
        <TabsContent value="social">
          <p className="mb-5 text-sm text-white/60">
            Tutti i canali ufficiali di {artistName}.
          </p>
          <ul className={`grid gap-2 ${hasBoth ? "sm:grid-cols-2" : "sm:grid-cols-2 md:grid-cols-3"}`}>
            {socials.map((s) => (
              <li key={s.key}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white transition hover:border-white/40 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <span className="text-white/70">{s.icon}</span>
                  <span className="font-medium">{s.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </TabsContent>
      )}
    </Tabs>
  );
}
