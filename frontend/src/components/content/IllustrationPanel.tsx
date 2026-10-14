import { useState } from "react";
import { api } from "../../api";
import { RichText } from "./RichText";
type Reference = {
  title: string;
  url: string;
  source: string;
  caption: string;
  author: string;
  license: string;
};
export function IllustrationPanel({ topic }: { topic: string }) {
  const [query, setQuery] = useState(topic.slice(0, 120)),
    [images, setImages] = useState<Reference[]>([]),
    [selected, setSelected] = useState<Reference | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [explanation, setExplanation] = useState("");
  async function search() {
    setBusy(true);
    setError("");
    setExplanation("");
    setSelected(null);
    setImages([]);
    try {
      setImages(
        (
          await api(
            `/v1/learning/illustrations?query=${encodeURIComponent(query)}`,
          )
        ).images,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image search failed.");
    } finally {
      setBusy(false);
    }
  }
  async function explain() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      setExplanation(
        (
          await api("/v1/learning/illustrations/explain", "POST", {
            url: selected.url,
            topic: query,
          })
        ).text,
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Image explanation is unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="illustration-panel">
      <h3>Learn with an illustration</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <input
          aria-label="Image topic"
          value={query}
          maxLength={120}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          className="secondary-button"
          disabled={busy || query.trim().length < 2}
        >
          {busy ? "Loading…" : "Find illustrations"}
        </button>
      </form>
      <p>
        Search a public image library. Choosing “Explain this image” sends that
        reference to your configured vision service.
      </p>
      <a
        href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Search Google Images
      </a>
      {error && <p role="alert">{error}</p>}
      <div className="reference-images">
        {images.map((image) => (
          <button
            key={image.url}
            onClick={() => {
              setSelected(image);
              setExplanation("");
            }}
            aria-pressed={selected?.url === image.url}
          >
            <img
              src={image.url}
              alt={image.title}
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <span>{image.title}</span>
          </button>
        ))}
      </div>
      {selected && (
        <figure>
          <img
            src={selected.url}
            alt={selected.title}
            referrerPolicy="no-referrer"
          />
          <figcaption>
            {selected.caption}
            <br />
            {selected.author} · {selected.license} ·{" "}
            <a href={selected.source} target="_blank" rel="noopener noreferrer">
              Source
            </a>
          </figcaption>
          <button
            className="secondary-button"
            disabled={busy}
            onClick={() => void explain()}
          >
            Explain this image
          </button>
          {explanation && <RichText markdown={explanation} />}
        </figure>
      )}
    </section>
  );
}
