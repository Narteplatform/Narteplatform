import { requireRole } from "@/lib/auth/guards";
import { BrandKit } from "@/components/dashboard/BrandKit";
import { getContenuti } from "@/lib/content/site-settings-server";
import { BRAND_KIT_ARTISTA } from "@/lib/brand-kit/contenuti";

export const metadata = { title: "Kit brand — N'arte Artist" };

export default async function ArtistBrandKitPage() {
  await requireRole(["artist", "superadmin"]);
  const c = await getContenuti();
  return (
    <BrandKit
      intro={c["kitbrand.intro.artista"]}
      html={BRAND_KIT_ARTISTA}
    />
  );
}
