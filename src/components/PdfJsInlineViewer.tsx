import { useEffect, useRef, useState } from "react";

interface PdfJsInlineViewerProps {
  src: string;
  onError?: (err: unknown) => void;
}

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

const PDFJS_MAIN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

const loadPdfJs = () => {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PDFJS_MAIN;
    script.async = true;
    script.onload = () => resolve(window.pdfjsLib);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

export default function PdfJsInlineViewer({ src, onError }: PdfJsInlineViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfDocRef = useRef<any | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);

  useEffect(() => {
    let mounted = true;

    const renderPage = async (num: number) => {
      if (!mounted || !pdfDocRef.current) return;
      const page = await pdfDocRef.current.getPage(num);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const viewport = page.getViewport({ scale: 1.5 });
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: context, viewport }).promise;
    };

    const load = async () => {
      try {
        setError(null);
        setLoading(true);
        const pdfjsLib = await loadPdfJs();
        if (!mounted) return;
        if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
        }
        const task = pdfjsLib.getDocument({ url: src });
        const pdfDoc = await task.promise;
        pdfDocRef.current = pdfDoc;
        if (!mounted) return;
        setNumPages(pdfDoc.numPages);
        setPageNumber(1);
        await renderPage(1);
        setLoading(false);
      } catch (e) {
        setError(e);
        setLoading(false);
        onError?.(e);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [src]);

  const prev = async () => setPageNumber((p) => Math.max(1, p - 1));
  const next = async () => setPageNumber((p) => Math.min(numPages, p + 1));

  useEffect(() => {
    const rerender = async () => {
      const pdfDoc = pdfDocRef.current;
      if (!pdfDoc) return;
      const page = await pdfDoc.getPage(pageNumber);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext("2d");
      if (!context) return;
      const viewport = page.getViewport({ scale: 1.5 });
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: context, viewport }).promise;
    };
    if (!loading) rerender();
  }, [pageNumber, loading, src]);

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="flex items-center justify-between border-b p-2">
        <div className="text-sm">
          {loading ? "Loading PDF..." : error ? "Failed to load PDF" : `Page ${pageNumber} / ${numPages}`}
        </div>
        <div className="flex gap-2">
          <button onClick={prev} disabled={loading || pageNumber <= 1} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
          <button onClick={next} disabled={loading || pageNumber >= numPages} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto flex items-center justify-center p-2 bg-neutral-50">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
