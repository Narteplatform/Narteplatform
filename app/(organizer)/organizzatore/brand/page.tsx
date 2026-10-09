import { requireOrganizer } from "@/lib/auth/guards";
import { BrandKit } from "@/components/dashboard/BrandKit";
import { BRAND_KIT_ORGANIZZATORE } from "@/lib/brand-kit/contenuti";

export const metadata = { title: "Kit brand — N'arte" };

export default async function OrganizerBrandKitPage() {
  await requireOrganizer();
  return (
    <BrandKit
      intro="Loghi, colori e indicazioni per citare N'arte nelle locandine e negli annunci delle serate nate sulla piattaforma."
      html={BRAND_KIT_ORGANIZZATORE}
    />
  );
}
