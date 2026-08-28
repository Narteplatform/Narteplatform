import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

/**
 * robots.txt.
 *
 * Prima non esisteva: i crawler potevano tentare qualunque percorso, incluse le
 * aree autenticate. Non è una misura di sicurezza — quelle stanno nel
 * middleware — ma evita di sprecare il budget di scansione su pagine che
 * rispondono con un redirect al login, e tiene fuori dai risultati di ricerca
 * URL che non hanno senso pubblico.
 */

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl().replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/dashboard",
          "/organizzatore",
          "/api/",
          "/__health",
          "/login",
          "/register",
          "/reset-password",
          "/recupero-password",
          "/post-login",
          "/logout",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
