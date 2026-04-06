import { ReactNode } from "react";
import SeoLayoutClient from "./SeoLayoutClient";

export default function SeoLayout({ children }: { children: ReactNode }) {
  return (
    <SeoLayoutClient>
      <main className="bg-[#FAFBFC] text-[#1A1D21] min-h-screen">
        {children}
      </main>
    </SeoLayoutClient>
  );
}
