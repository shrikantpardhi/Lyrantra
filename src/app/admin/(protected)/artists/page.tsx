import { Save, Trash2, UserPlus } from "lucide-react";
import { deleteArtistAction, saveArtistAction } from "@/app/actions";
import { listArtists } from "@/lib/repository";

export default async function AdminArtists() {
  const artists = await listArtists();
  return (
    <>
      <header className="admin-heading">
        <div><div className="eyebrow">Relationships</div><h1>Artists</h1><p>Create and update the people and groups linked to songs.</p></div>
      </header>
      <div className="admin-grid">
        <section className="panel">
          <h2>Artist directory</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {artists.map((artist) => (
              <form className="form-grid" action={saveArtistAction} key={artist.id} style={{ borderBottom: "1px solid var(--line)", paddingBottom: 16 }}>
                <input type="hidden" name="id" value={artist.id} />
                <label className="field"><span>Name</span><input name="name" defaultValue={artist.name} required /></label>
                <label className="field"><span>Slug</span><input name="slug" defaultValue={artist.slug} required /></label>
                <label className="field full"><span>Biography</span><textarea name="bio" defaultValue={artist.bio} required /></label>
                <div className="row-actions">
                  <button type="submit"><Save size={13} /> Save</button>
                </div>
              </form>
            ))}
          </div>
        </section>
        <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
          <section className="panel">
            <h2>Add artist</h2>
            <form className="form-grid" action={saveArtistAction}>
              <label className="field full"><span>Name</span><input name="name" required /></label>
              <label className="field full"><span>Slug (optional)</span><input name="slug" /></label>
              <label className="field full"><span>Biography</span><textarea name="bio" required minLength={10} /></label>
              <button className="button compact" type="submit"><UserPlus size={15} /> Add artist</button>
            </form>
          </section>
          <section className="panel">
            <h2>Delete artist</h2>
            <p className="muted" style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}>
              An artist cannot be deleted while linked to a song.
            </p>
            {artists.map((artist) => (
              <form action={deleteArtistAction} className="provider-card" key={artist.id}>
                <input type="hidden" name="id" value={artist.id} />
                <span><strong>{artist.name}</strong><small>{artist.slug}</small></span>
                <button className="icon-button" type="submit" aria-label={`Delete ${artist.name}`}><Trash2 size={14} /></button>
              </form>
            ))}
          </section>
        </div>
      </div>
    </>
  );
}
