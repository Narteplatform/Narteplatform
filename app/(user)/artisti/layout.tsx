import { Toaster } from "sonner";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function UserArtistsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="dark" className="bg-background text-foreground">
      <Header />
      <main>{children}</main>
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
