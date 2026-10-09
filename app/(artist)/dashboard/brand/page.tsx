import { requireRole } from "@/lib/auth/guards";
import { BrandKit } from "@/components/dashboard/BrandKit";
import { BRAND_KIT_ARTISTA } from "@/lib/brand-kit/contenuti";

export const metadata = { title: "Kit brand — N'arte Artist" };

export default async function ArtistBrandKitPage() {
  await requireRole(["artist", "superadmin"]);
  return (
    <BrandKit
      intro="Loghi, colori e indicazioni per parlare di N'arte sui tuoi canali e presentarti come artista del roster."
      html={BRAND_KIT_ARTISTA}
    />
  );
}
