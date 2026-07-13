import { NextRequest, NextResponse } from "next/server";

const inactiveUiLocales = new Set(["hi", "es", "ar"]);

export function proxy(request: NextRequest) {
  const segments = request.nextUrl.pathname.split("/");
  const locale = segments[1];
  if (!inactiveUiLocales.has(locale)) return NextResponse.next();

  const destination = request.nextUrl.clone();
  segments[1] = "en";
  destination.pathname = segments.join("/");
  return NextResponse.redirect(destination, 308);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)"],
};
