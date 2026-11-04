import { requireOrganizer } from "@/lib/auth/guards";
import { BrandKit } from "@/components/dashboard/BrandKit";
import { getContenuti } from "@/lib/content/site-settings-server";
import { BRAND_KIT_ORGANIZZATORE } from "@/lib/brand-kit/contenuti";

export const metadata = { title: "Kit brand — N'arte" };

export default async function OrganizerBrandKitPage() {
  await requireOrganizer();
  const c = await getContenuti();
  return (
    <BrandKit
      intro={c["kitbrand.intro.organizzatore"]}
      html={BRAND_KIT_ORGANIZZATORE}
    />
  );
}
