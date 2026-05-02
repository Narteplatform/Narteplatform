import { ArtistApplicationForm } from "@/components/forms/ArtistApplicationForm";
import { Reveal } from "@/components/animations/Reveal";

export const metadata = { title: "Sei un artista? — N'arte" };

export default function CandidaturaPage() {
  return (
    <div className="container-narte py-16">
      <Reveal>
        <p className="accent-label">candidatura</p>
      </Reveal>
      <Reveal delay={0.1}>
        <h1 className="display-xl text-5xl md:text-7xl">Sei un artista?</h1>
      </Reveal>
      <Reveal delay={0.2}>
        <p className="mt-4 max-w-xl text-base text-foreground/80">
          Candidati per entrare nel roster N&apos;arte. Dopo la revisione riceverai una email per
          completare il tuo profilo e gestire le tue disponibilità.
        </p>
      </Reveal>

      <div className="mt-10 max-w-2xl">
        <ArtistApplicationForm />
      </div>
    </div>
  );
}
