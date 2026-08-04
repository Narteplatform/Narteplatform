import { Toaster } from "sonner";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FavoritesRoot } from "@/components/favorites/FavoritesRoot";

export default function UserArtistsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="dark" className="bg-background text-foreground">
      {/* Vedi app/(public)/layout.tsx: stesso montaggio, stesse ragioni. */}
      <FavoritesRoot>
        <Header />
        <main>{children}</main>
      </FavoritesRoot>
      <Footer />
      <Toaster
        theme="dark"
        position="top-center"
        richColors
        closeButton
        offset={96}
        toastOptions={{ className: "!font-sans" }}
      />
    </div>
  );
}
