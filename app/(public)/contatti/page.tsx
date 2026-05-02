import { ContactForm } from "@/components/forms/ContactForm";
import { Reveal } from "@/components/animations/Reveal";

export const metadata = { title: "Contatti — N'arte" };

export default function ContattiPage() {
  return (
    <div className="container-narte py-16">
      <Reveal>
        <p className="accent-label">contatti</p>
      </Reveal>
      <Reveal delay={0.1}>
        <h1 className="display-xl text-5xl md:text-7xl">Parliamone.</h1>
      </Reveal>
      <Reveal delay={0.2}>
        <p className="mt-4 max-w-xl text-base text-foreground/80">
          Per booking, collaborazioni o richieste generiche scrivici. Rispondiamo in genere entro 48 ore.
        </p>
      </Reveal>

      <div className="mt-10 max-w-xl">
        <ContactForm />
      </div>
    </div>
  );
}
