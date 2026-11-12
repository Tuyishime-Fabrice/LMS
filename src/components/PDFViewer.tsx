interface PDFViewerProps {
  url: string;
  title?: string;
}

export default function PDFViewer({ url, title }: PDFViewerProps) {
  return (
    <div className="relative w-full h-[600px] bg-muted rounded-lg overflow-hidden border">
      <iframe
        src={url}
        title={title || "PDF Document"}
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}
