import type { Metadata } from "next";
import { Mail, MessageCircle, ShieldAlert } from "lucide-react";
import { submitContactAction } from "@/app/actions";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Contact the LyricsPro team about corrections, licensing, partnerships, or support.",
  alternates: { canonical: "/en/contact" },
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; subject?: string }>;
}) {
  const query = await searchParams;
  return (
    <div className="page">
      <div className="narrow">
        <div className="eyebrow">We are listening</div>
        <h1 className="search-title">Contact LyricsPro</h1>
        <p className="muted" style={{ margin: "12px 0 28px", lineHeight: 1.7 }}>
          Send a correction, ask about licensing, propose a partnership, or tell us how we can improve.
        </p>
        {query.sent === "true" && <div className="notice">Your message reached our editorial queue. Thank you.</div>}
        <form className="form-card form-grid" action={submitContactAction}>
          <label className="field"><span>Name</span><input name="name" required minLength={2} /></label>
          <label className="field"><span>Email</span><input name="email" type="email" required /></label>
          <label className="field full"><span>Subject</span><input name="subject" required defaultValue={query.subject} /></label>
          <label className="field full"><span>Message</span><textarea name="message" required minLength={10} /></label>
          <label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
          <div><button className="button" type="submit"><Mail size={17} /> Send message</button></div>
        </form>
        <div className="category-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", marginTop: 22 }}>
          <div className="category-card"><MessageCircle /><strong>Editorial</strong><span>Corrections and missing credits are reviewed before updates.</span></div>
          <div className="category-card"><ShieldAlert /><strong>Copyright</strong><span>Rights-holder requests receive a dedicated audit trail.</span></div>
        </div>
      </div>
    </div>
  );
}
