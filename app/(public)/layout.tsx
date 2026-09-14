import { Toaster } from "sonner";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FavoritesRoot } from "@/components/favorites/FavoritesRoot";
import { JsonLd, organizationJsonLd } from "@/components/seo/JsonLd";
import { CookieBanner } from "@/components/legal/CookieBanner";
import { iubendaAttivo } from "@/lib/legal/iubenda";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="dark" className="bg-background text-foreground">
      {/* Identità dell'organizzazione, dichiarata una volta per tutto il sito
          pubblico. È il nodo a cui Google aggancia nome, logo e profili social
          nel pannello di conoscenza; senza, ogni pagina resta anonima. */}
      <JsonLd data={organizationJsonLd()} />

      {/* Deve avvolgere sia l'header (che ospita il menu preferiti) sia main
          (che ospita i cuori sulle card): sono rami fratelli. */}
      <FavoritesRoot>
        <Header />
        <main>{children}</main>
      </FavoritesRoot>
      <Footer />
      {/* Banner provvisorio: informa e prende atto, non gestisce nulla, perché
          finora non c'era nulla da gestire. Si spegne da solo nel momento in cui
          iubenda viene configurato — due banner insieme sono peggio di nessuno,
          e questo dice testualmente «nessuna profilazione pubblicitaria», che
          dal giorno del pixel sarebbe falso in home page. */}
      {!iubendaAttivo && <CookieBanner />}
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
