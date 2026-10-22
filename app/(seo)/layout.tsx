import { ReactNode } from "react";
import Link from "next/link";
import SeoLayoutClient from "./SeoLayoutClient";

export default function SeoLayout({ children }: { children: ReactNode }) {
  return (
    <SeoLayoutClient>
      <main className="bg-[#FAFBFC] text-[#1A1D21] min-h-screen">
        {children}
        {/* Server-rendered link to the homepage (the brand's reference page).
            The navbar is client-only, so without this the server HTML of the
            SEO pages had no link back to "/". */}
        <nav aria-label="Posty AI" className="py-10 px-4 text-center text-sm text-gray-600">
          <Link href="/" className="font-medium text-gray-800 underline-offset-4 hover:underline">
            Posty AI — your AI marketing agent for professionals
          </Link>
        </nav>
      </main>
    </SeoLayoutClient>
  );
}
