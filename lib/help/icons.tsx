import {
  Calendar,
  CreditCard,
  Music,
  Phone,
  Rocket,
  Shield,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { HelpCategory } from "@/lib/help/content";

const ICONS: Record<HelpCategory["icon"], LucideIcon> = {
  rocket: Rocket,
  music: Music,
  users: Users,
  calendar: Calendar,
  phone: Phone,
  "user-cog": UserCog,
  "credit-card": CreditCard,
  shield: Shield,
};

export function CategoryIcon({
  name,
  className,
}: {
  name: HelpCategory["icon"];
  className?: string;
}) {
  const Icon = ICONS[name];
  return <Icon className={className} />;
}
