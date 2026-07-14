import { Mail } from "lucide-react";
import { listContactMessages } from "@/lib/repository";

export default async function ContactInbox() {
  const messages = await listContactMessages();
  return (
    <>
      <header className="admin-heading">
        <div><div className="eyebrow">Support</div><h1>Contact inbox</h1><p>Corrections, partnerships, licensing questions, and listener feedback.</p></div>
      </header>
      <section className="panel">
        {messages.length ? (
          messages.map((message) => (
            <article className="provider-card" key={message.id} style={{ alignItems: "flex-start" }}>
              <Mail size={17} color="var(--green-2)" />
              <span style={{ flex: 1 }}>
                <strong>{message.subject}</strong>
                <small>{message.name} · {message.email} · {new Date(message.createdAt).toLocaleString()}</small>
                <p style={{ marginTop: 10, lineHeight: 1.65, fontSize: 13 }}>{message.message}</p>
              </span>
            </article>
          ))
        ) : (
          <div className="empty-state"><Mail /><h3>Inbox clear</h3><p>New contact messages will appear here.</p></div>
        )}
      </section>
    </>
  );
}
