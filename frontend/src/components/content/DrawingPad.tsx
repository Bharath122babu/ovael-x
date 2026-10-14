import { useEffect, useRef } from "react";
export function DrawingPad({
  onDone,
  onClose,
}: {
  onDone: (file: File) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null),
    drawing = useRef(false);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => previous?.focus();
  }, []);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, 900, 450);
      ctx.strokeStyle = "#17202b";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
    }
  }, []);
  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const r = event.currentTarget.getBoundingClientRect();
    return [
      ((event.clientX - r.left) * 900) / r.width,
      ((event.clientY - r.top) * 450) / r.height,
    ] as const;
  }
  return (
    <div className="modal-backdrop">
      <section
        ref={dialog}
        className="drawing-dialog"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
          if (event.key === "Tab") {
            const buttons = Array.from(
              dialog.current?.querySelectorAll<HTMLButtonElement>("button") ||
                [],
            );
            const first = buttons[0],
              last = buttons[buttons.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="draw-title"
      >
        <h2 id="draw-title">Draw or handwrite an answer</h2>
        <p>We transcribe readable text. Diagram topology needs human review.</p>
        <canvas
          ref={canvas}
          width={900}
          height={450}
          aria-label="Drawing area; you can also type your answer"
          onPointerDown={(e) => {
            drawing.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            const c = canvas.current!.getContext("2d")!;
            c.beginPath();
            c.moveTo(...point(e));
          }}
          onPointerMove={(e) => {
            if (drawing.current) {
              const c = canvas.current!.getContext("2d")!;
              c.lineTo(...point(e));
              c.stroke();
            }
          }}
          onPointerUp={() => {
            drawing.current = false;
          }}
          onPointerCancel={() => {
            drawing.current = false;
          }}
        />
        <div className="lesson-actions">
          <button className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="secondary-button"
            onClick={() => {
              const c = canvas.current!.getContext("2d")!;
              c.fillStyle = "#fff";
              c.fillRect(0, 0, 900, 450);
            }}
          >
            Clear
          </button>
          <button
            className="primary-button"
            onClick={() =>
              canvas.current?.toBlob((blob) => {
                if (blob)
                  onDone(
                    new File([blob], "drawing.png", { type: "image/png" }),
                  );
              }, "image/png")
            }
          >
            Transcribe drawing
          </button>
        </div>
      </section>
    </div>
  );
}
