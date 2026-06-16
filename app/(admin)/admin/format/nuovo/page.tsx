import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FormatForm } from "@/components/forms/FormatForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default function NuovoFormatPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/admin/format"
        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Tutti i format
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nuovo format</CardTitle>
        </CardHeader>
        <CardContent>
          <FormatForm />
        </CardContent>
      </Card>
    </div>
  );
}
