import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/site";
import { locales } from "@/lib/types";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as (typeof locales)[number])) notFound();
  return (
    <>
      <SiteHeader locale={locale} />
      <main>{children}</main>
      <SiteFooter locale={locale} />
    </>
  );
}
