import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { BlogPostForm } from "@/components/admin/BlogPostForm";

export const metadata = { title: "Nuovo articolo — N'arte Admin" };

export default function NewBlogPostPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/admin/blog"
        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Tutti gli articoli
      </Link>
      <h1 className="font-display text-2xl tracking-tight">Nuovo articolo</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contenuto</CardTitle>
        </CardHeader>
        <CardContent>
          <BlogPostForm />
        </CardContent>
      </Card>
    </div>
  );
}
