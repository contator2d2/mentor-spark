import { useEffect } from "react";
import { useBranding } from "@/contexts/BrandingContext";

/**
 * Component to dynamically update SEO meta tags based on the current branding/tenant.
 * Since this is a SPA, social scrapers (WhatsApp, Facebook, LinkedIn) won't execute JS
 * and will see the default tags in index.html. 
 * For real link sharing to work with custom metadata, server-side injection (SSR/Edge) is required.
 * However, we can at least update the DOM so that browser tabs and client-side transitions reflect the brand.
 */
export function DynamicMeta() {
  const { brand } = useBranding();

  useEffect(() => {
    if (!brand) return;

    const brandName = brand.brandName || "Mentoria";
    const description = `Portal do mentorado ${brandName}. Acesse seus conteúdos, cursos e testes.`;
    const logoUrl = brand.brandLogoUrl || "/placeholder.svg";

    // Update Title
    document.title = brandName;

    // Update Meta Tags (Client-side only)
    const updateMeta = (name: string, content: string, attr: "name" | "property" = "name") => {
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    updateMeta("description", description);
    updateMeta("og:title", brandName, "property");
    updateMeta("og:description", description, "property");
    updateMeta("og:image", logoUrl, "property");
    updateMeta("og:image:width", "512", "property");
    updateMeta("og:image:height", "512", "property");
    updateMeta("twitter:title", brandName);
    updateMeta("twitter:description", description);
    updateMeta("twitter:image", logoUrl);

    // Update Favicon
    if (brand.brandLogoUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = brand.brandLogoUrl;

      // Also update apple-touch-icon
      let appleLink: HTMLLinkElement | null = document.querySelector("link[rel='apple-touch-icon']");
      if (!appleLink) {
        appleLink = document.createElement("link");
        appleLink.rel = "apple-touch-icon";
        document.head.appendChild(appleLink);
      }
      appleLink.href = brand.brandLogoUrl;
    }

    // Update Web Manifest (PWA Icon & Name)
    if (brand.brandName || brand.brandLogoUrl) {
      try {
        const brandName = brand.brandName || "Mentoria Inteligente";
        const logoUrl = brand.brandLogoUrl || "/placeholder.svg";
        
        const manifest = {
          name: brandName,
          short_name: brandName,
          description: `Portal do mentorado ${brandName}`,
          start_url: "/",
          display: "standalone",
          background_color: "#ffffff",
          theme_color: brand.brandPrimaryColor || "#6366f1",
          icons: [
            {
              src: logoUrl,
              sizes: "192x192",
              type: "image/png",
              purpose: "any"
            },
            {
              src: logoUrl,
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable"
            }
          ]
        };

        const stringManifest = JSON.stringify(manifest);
        const blob = new Blob([stringManifest], { type: 'application/json' });
        const manifestURL = URL.createObjectURL(blob);
        
        let manifestLink: HTMLLinkElement | null = document.querySelector("link[rel='manifest']");
        if (manifestLink) {
          manifestLink.href = manifestURL;
        } else {
          manifestLink = document.createElement("link");
          manifestLink.rel = "manifest";
          manifestLink.href = manifestURL;
          document.head.appendChild(manifestLink);
        }
      } catch (e) {
        console.warn("Failed to update manifest dynamically:", e);
      }
    }
  }, [brand]);

  return null;
}
