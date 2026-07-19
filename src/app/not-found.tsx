import Link from "next/link";
import { Disc3 } from "lucide-react";

export default function NotFound() {
  return (
    <main className="login-page">
      <section className="login-card" style={{ textAlign: "center" }}>
        <Disc3 size={44} color="var(--green-2)" />
        <h1>That track is missing</h1>
        <p>The page may have moved, or the lyric has not joined our catalog yet.</p>
        <Link className="button" href="/en">Return to Lyrantra</Link>
      </section>
    </main>
  );
}
