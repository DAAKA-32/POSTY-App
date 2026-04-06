import { Metadata } from "next";
import { getAlternateLanguages } from "@/components/seo/HreflangTags";
import PageContent from "./PageContent";
import { translations } from "./translations";

const path = "/ai-linkedin-post-generator";

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<{ lang?: string }> }
): Promise<Metadata> {
  const { lang } = await searchParams;
  const t = lang === "fr" ? translations.fr : translations.en;
  const alternates = getAlternateLanguages(path);

  return {
    title: t.meta.title,
    description: t.meta.description,
    alternates,
    openGraph: {
      title: t.meta.title,
      description: t.meta.description,
      url: `https://postyapp.ai${path}`,
      siteName: "Posty AI",
      type: "website",
    },
  };
}

export default async function AILinkedInPostGeneratorPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  return <PageContent lang={lang === "fr" ? "fr" : "en"} />;
}
