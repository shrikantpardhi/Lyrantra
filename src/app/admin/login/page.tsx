import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loginAction } from "@/app/actions";
import { Logo } from "@/components/site";
import { getAdminSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Studio sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getAdminSession()) redirect("/admin");
  const { error } = await searchParams;
  return (
    <main className="login-page">
      <section className="login-card">
        <Logo admin />
        <h1>Welcome back</h1>
        <p>Sign in to manage lyrics, artists, moderation, SEO, and AI-assisted research.</p>
        {error && <div className="error">{error}</div>}
        <form action={loginAction}>
          <label className="field"><span>Email</span><input name="email" type="email" required autoComplete="email" /></label>
          <label className="field"><span>Password</span><input name="password" type="password" required autoComplete="current-password" /></label>
          <button className="button" type="submit">Sign in to Studio</button>
        </form>
        {process.env.NODE_ENV !== "production" && (
          <p style={{ marginTop: 18, marginBottom: 0 }}>
            Local demo: admin@lyranta.local / lyranta-demo
          </p>
        )}
      </section>
    </main>
  );
}
