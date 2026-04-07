import { Metadata } from "next";
import { getAlternateLanguages } from "@/components/seo/HreflangTags";
import PageContent from "./PageContent";
import { translations } from "./translations";

const path = "/linkedin-post-examples";

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<{ lang?: string }> }
): Promise<Metadata> {
  const { lang } = await searchParams;
  const resolved = (lang && lang in translations ? lang : "en") as keyof typeof translations;
  const t = translations[resolved];
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

export default async function LinkedInPostExamplesPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  return <PageContent lang={lang && lang in translations ? lang : "en"} />;
}
