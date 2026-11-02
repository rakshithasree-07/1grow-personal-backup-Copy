import type { Metadata } from "next";
import Script from "next/script";
import { ThemeProvider } from "next-themes";

import { Inter } from "next/font/google";
import "./globals.css";

import { ToastProvider } from "@/components/ui/Toast";
import { BrandThemeProvider } from "@/providers/BrandThemeProvider";

// Mock Inter font definition to avoid offline build failure in sandbox
// const inter = {
//   variable: "font-sans",
// };
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });


export const metadata: Metadata = {
  metadataBase: new URL("https://1Grow.com"),

  title: {
    default: "1Grow",
    template: "%s | 1Grow",
  },

  description: "Multi Tenant SaaS ERP Platform",

  keywords: [
    "ERP",
    "Training Management",
    "Rental Management",
    "Event Management",
  ],

  icons: {
    icon: [
      { url: "/icons/logo.png", sizes: "any", type: "image/png" },
      { url: "/icons/logo.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/logo.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/icons/logo.png",
  },

  manifest: "/manifest.json",

  openGraph: {
    title: "1Grow",
    description: "ERP Platform",
    url: "https://1Grow.com",
    siteName: "1Grow",
    locale: "en_US",
    type: "website",
    images: [{ url: "/icons/logo.png", width: 512, height: 512, alt: "1Grow" }],
  },

  twitter: {
    card: "summary_large_image",
    title: "1Grow",
    description: "ERP Platform",
    images: ["/icons/logo.png"],
  },

  alternates: {
    canonical: "https://1Grow.com",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "1Grow",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This script runs synchronously while the browser parses <head> — before
  // any CSS is applied or any pixel is painted. It reads the cached brand
  // colours from localStorage and sets the CSS custom properties immediately,
  // eliminating the purple (#6366f1 default) flash on every reload.
  const brandInitScript = `
(function() {
  try {
    var raw = localStorage.getItem('ka_brand');
    if (!raw) return;
    var c = JSON.parse(raw);
    if (!c || !c.primary) return;
    var r = document.documentElement;
    r.style.setProperty('--primary', c.primary);
    r.style.setProperty('--secondary', c.secondary || c.primary);
    // Compute foreground colours based on luminance
    function lum(hex) {
      var h = hex.replace('#','');
      var rv = parseInt(h.substring(0,2),16)/255;
      var gv = parseInt(h.substring(2,4),16)/255;
      var bv = parseInt(h.substring(4,6),16)/255;
      function lin(v){ return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); }
      return 0.2126*lin(rv)+0.7152*lin(gv)+0.0722*lin(bv);
    }
    r.style.setProperty('--primary-foreground', lum(c.primary)>0.5 ? '#0f172a' : '#ffffff');
    r.style.setProperty('--secondary-foreground', lum(c.secondary||c.primary)>0.5 ? '#0f172a' : '#ffffff');
  } catch(e) {}
})();
  `.trim();

  return (
     <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        {/* Blocking brand-colour script — must run before first paint */}
        <Script id="brand-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: brandInitScript }} />
      </head>
      <body
        className="flex min-h-full flex-col"
        suppressHydrationWarning
      >
        {/* JSON-LD Structured Data */}
        <Script
          id="json-ld"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd),
          }}
        />

        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <BrandThemeProvider>
            {children}
          </BrandThemeProvider>
        </ThemeProvider>

        <ToastProvider />
      </body>
    </html>
  );
}