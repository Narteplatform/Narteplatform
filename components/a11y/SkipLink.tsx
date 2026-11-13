"use client";

/**
 * «Vai al contenuto»: primo elemento raggiungibile con Tab su ogni pagina.
 *
 * Chi naviga da tastiera o con un lettore di schermo altrimenti attraversa
 * l'intero menu a ogni cambio di pagina. Il link è invisibile finché non
 * riceve il focus.
 *
 * Il bersaglio è `#contenuto` (l'id del <main> nei layout pubblici). Le aree
 * riservate disegnano il proprio <main> dentro componenti di shell: per non
 * dipendere dall'id, se `#contenuto` non c'è si usa il primo <main> della
 * pagina. Il focus va spostato a mano: un'ancora da sola scorre la pagina ma
 * lascia il focus dov'era, e il Tab successivo ripartirebbe dal menu.
 */
export function SkipLink() {
  return (
    <a
      href="#contenuto"
      onClick={(e) => {
        const target =
          document.getElementById("contenuto") ?? document.querySelector<HTMLElement>("main");
        if (!target) return;
        e.preventDefault();
        if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
        target.scrollIntoView({
          block: "start",
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        });
      }}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-accent focus:px-5 focus:py-2 focus:text-sm focus:font-medium focus:text-accent-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-foreground"
    >
      Vai al contenuto
    </a>
  );
}
