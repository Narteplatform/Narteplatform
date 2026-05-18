import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ConsultantForm } from "@/components/admin/ConsultantForm";

export const metadata = { title: "Nuovo consulente — N'arte Admin" };

export default function NewConsultantPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/admin/consulenza/consulenti"
        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Tutti i consulenti
      </Link>
      <h1 className="font-display text-2xl tracking-tight">Nuovo consulente</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profilo</CardTitle>
        </CardHeader>
        <CardContent>
          <ConsultantForm />
        </CardContent>
      </Card>
    </div>
  );
}
