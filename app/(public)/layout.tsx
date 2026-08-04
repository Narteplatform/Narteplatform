import { Toaster } from "sonner";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FavoritesRoot } from "@/components/favorites/FavoritesRoot";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="dark" className="bg-background text-foreground">
      {/* Deve avvolgere sia l'header (che ospita il menu preferiti) sia main
          (che ospita i cuori sulle card): sono rami fratelli. */}
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
        toastOptions={{
          className: "!font-sans",
        }}
      />
    </div>
  );
}
