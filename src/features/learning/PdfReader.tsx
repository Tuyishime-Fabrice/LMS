import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Download, Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PdfDocument = {
  numPages: number;
  getPage: (n: number) => Promise<{
    getViewport: (o: { scale: number }) => { width: number; height: number };
    render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void>; cancel: () => void };
  }>;
  destroy: () => void;
};

// The PDF engine is only downloaded when a learner opens a PDF lesson.
async function openDocument(url: string): Promise<PdfDocument> {
  const [pdfjs, worker] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.js?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return (await pdfjs.getDocument({ url }).promise) as unknown as PdfDocument;
}

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

function PdfPage({ doc, number, width, zoom, onVisible }: {
  doc: PdfDocument; number: number; width: number; zoom: number; onVisible: (n: number) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [near, setNear] = useState(number <= 2);
  const [ratio, setRatio] = useState(1.414);

  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setNear(true);
          if (entry.intersectionRatio > 0.4) onVisible(number);
        }
      }
    }, { rootMargin: "600px 0px", threshold: [0, 0.4, 0.8] });
    observer.observe(el);
    return () => observer.disconnect();
  }, [number, onVisible]);

  useEffect(() => {
    if (!near || width <= 0) return;
    let cancelled = false;
    let task: { promise: Promise<void>; cancel: () => void } | null = null;
    (async () => {
      const page = await doc.getPage(number);
      if (cancelled || !canvas.current) return;
      const base = page.getViewport({ scale: 1 });
      setRatio(base.height / base.width);
      const cssWidth = width * zoom;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: (cssWidth / base.width) * pixelRatio });
      const el = canvas.current;
      el.width = Math.floor(viewport.width);
      el.height = Math.floor(viewport.height);
      el.style.width = `${cssWidth}px`;
      el.style.height = `${cssWidth * (base.height / base.width)}px`;
      const context = el.getContext("2d");
      if (!context) return;
      task = page.render({ canvasContext: context, viewport });
      await task.promise.catch(() => undefined);
    })();
    return () => { cancelled = true; task?.cancel(); };
  }, [doc, number, near, width, zoom]);

  return (
    <div
      ref={holder}
      data-page={number}
      className="mx-auto bg-white shadow-[0_1px_3px_hsl(var(--forest)/0.18)]"
      style={{ width: width * zoom, height: width * zoom * ratio }}
    >
      <canvas ref={canvas} className="block" />
    </div>
  );
}

/**
 * In-app PDF reader: continuous scroll, fit-to-width by default, zoom,
 * page jump, fullscreen and download. Pages are drawn as they come into view.
 */
export function PdfReader({ src, title, allowDownload = true, onError, className }: {
  src: string; title?: string; allowDownload?: boolean; onError?: () => void; className?: string;
}) {
  const { t } = useTranslation();
  const frame = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<PdfDocument | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [width, setWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [current, setCurrent] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    let active = true;
    let opened: PdfDocument | null = null;
    setStatus("loading");
    setDoc(null);
    openDocument(src)
      .then((loaded) => {
        opened = loaded;
        if (!active) { loaded.destroy(); return; }
        setDoc(loaded);
        setCurrent(1);
        setStatus("ready");
      })
      .catch(() => { if (active) { setStatus("error"); onError?.(); } });
    return () => { active = false; opened?.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(0, Math.min(el.clientWidth - 24, 980)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [status]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === frame.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const onVisible = useCallback((n: number) => setCurrent(n), []);
  const goTo = (n: number) => {
    if (!doc) return;
    const target = Math.max(1, Math.min(doc.numPages, n));
    scroller.current?.querySelector(`[data-page="${target}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const step = (direction: 1 | -1) => {
    const index = ZOOM_STEPS.findIndex((value) => value >= zoom);
    const next = ZOOM_STEPS[Math.max(0, Math.min(ZOOM_STEPS.length - 1, (index === -1 ? 2 : index) + direction))];
    setZoom(next);
  };
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void frame.current?.requestFullscreen?.();
  };

  if (status === "error") {
    return (
      <div className={cn("surface px-6 py-10 text-center", className)}>
        <p className="text-card-title">{t("reader.error.title", "This document could not be displayed here")}</p>
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-muted-foreground">
          {t("reader.error.body", "You can still open it in a new tab or download it.")}
        </p>
        <Button asChild variant="outline" className="mt-4">
          <a href={src} target="_blank" rel="noreferrer"><Download />{t("reader.open", "Open document")}</a>
        </Button>
      </div>
    );
  }

  return (
    <div ref={frame} className={cn("flex flex-col overflow-hidden rounded-xl border bg-muted", fullscreen && "rounded-none", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b bg-card px-2 py-1.5">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => goTo(current - 1)} disabled={!doc || current <= 1} aria-label={t("reader.prev", "Previous page")}>
            <ChevronUp />
          </Button>
          <label className="flex items-center gap-1.5 px-1 text-sm text-muted-foreground">
            <span className="sr-only">{t("reader.page", "Page")}</span>
            <input
              type="number"
              min={1}
              max={doc?.numPages || 1}
              value={current}
              onChange={(event) => goTo(Number(event.target.value))}
              className="tabular h-8 w-12 rounded-md border bg-background px-1 text-center text-sm text-foreground"
            />
            <span className="tabular">/ {doc?.numPages ?? "–"}</span>
          </label>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => goTo(current + 1)} disabled={!doc || current >= (doc?.numPages || 1)} aria-label={t("reader.next", "Next page")}>
            <ChevronDown />
          </Button>
        </div>
        <div className="ml-auto flex items-center">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => step(-1)} disabled={zoom <= ZOOM_STEPS[0]} aria-label={t("reader.zoomOut", "Zoom out")}>
            <ZoomOut />
          </Button>
          <button type="button" onClick={() => setZoom(1)} className="tabular min-w-12 rounded-md px-1 py-1 text-xs font-medium text-muted-foreground hover:text-forest" title={t("reader.fit", "Fit to width")}>
            {Math.round(zoom * 100)}%
          </button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => step(1)} disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]} aria-label={t("reader.zoomIn", "Zoom in")}>
            <ZoomIn />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleFullscreen} aria-label={fullscreen ? t("reader.exitFullscreen", "Exit full screen") : t("reader.fullscreen", "Full screen")}>
            {fullscreen ? <Minimize2 /> : <Maximize2 />}
          </Button>
          {allowDownload && (
            <Button asChild variant="ghost" size="icon" className="h-9 w-9">
              <a href={src} target="_blank" rel="noreferrer" download aria-label={t("reader.download", "Download {{title}}", { title: title || "PDF" })}>
                <Download />
              </a>
            </Button>
          )}
        </div>
      </div>
      <div ref={scroller} className={cn("overflow-auto px-3 py-4", fullscreen ? "flex-1" : "h-[70vh] min-h-[24rem]")} tabIndex={0} aria-label={title || "PDF"}>
        {status === "loading" || !doc ? (
          <div className="mx-auto h-full max-w-3xl animate-pulse rounded bg-card" role="status" aria-label={t("reader.loading", "Loading document")} />
        ) : (
          <div className="space-y-4">
            {Array.from({ length: doc.numPages }, (_, index) => (
              <PdfPage key={index + 1} doc={doc} number={index + 1} width={width} zoom={zoom} onVisible={onVisible} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
