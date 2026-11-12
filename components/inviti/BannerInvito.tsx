import { Avatar } from "@/components/ui/Avatar";
import type { ArtistaCheInvita } from "@/lib/inviti/codice";

/**
 * «Ti ha invitato X» sopra la candidatura. Solo il nome d'arte, con le
 * iniziali: chi non è registrato non riceve foto degli artisti.
 */
export function BannerInvito({ chi }: { chi: Pick<ArtistaCheInvita, "stageName"> }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-pill border border-accent/30 bg-accent/[0.06] py-1.5 pl-1.5 pr-4 text-sm">
      <Avatar name={chi.stageName} alt="" size="sm" />
      <span>
        Ti ha invitato <strong className="font-semibold">{chi.stageName}</strong>
      </span>
    </div>
  );
}
