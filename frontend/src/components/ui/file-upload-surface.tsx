import React, { useId, useState } from "react";
import { CheckCircle2, Loader2, Upload, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./button";

interface FileUploadSurfaceProps {
  inputRef?: React.RefObject<HTMLInputElement>;
  accept: string;
  formats: string[];
  title: string;
  description: string;
  onFile: (file: File) => void | Promise<void>;
  fileName?: string | null;
  busy?: boolean;
  disabled?: boolean;
  error?: string | null;
  onClear?: () => void;
  compact?: boolean;
  className?: string;
}

export const FileUploadSurface: React.FC<FileUploadSurfaceProps> = ({
  inputRef,
  accept,
  formats,
  title,
  description,
  onFile,
  fileName,
  busy = false,
  disabled = false,
  error,
  onClear,
  compact = false,
  className,
}) => {
  const generatedId = useId().replace(/:/g, "");
  const inputId = `file-upload-${generatedId}`;
  const descriptionId = `${inputId}-description`;
  const errorId = `${inputId}-error`;
  const internalRef = React.useRef<HTMLInputElement>(null);
  const resolvedRef = inputRef ?? internalRef;
  const [dragActive, setDragActive] = useState(false);
  const inactive = disabled || busy;

  const selectFile = (file?: File) => {
    if (!file || inactive) return;
    void onFile(file);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={resolvedRef}
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={inactive}
        aria-describedby={error ? `${descriptionId} ${errorId}` : descriptionId}
        onChange={(event) => {
          selectFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={inactive}
        aria-describedby={error ? `${descriptionId} ${errorId}` : descriptionId}
        onClick={() => resolvedRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!inactive) setDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!inactive) setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            setDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          selectFile(event.dataTransfer.files?.[0]);
        }}
        className={cn(
          "group flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card text-center transition-[border-color,background-color,transform,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
          compact ? "min-h-24 gap-2 p-4" : "min-h-32 gap-2.5 p-6 sm:p-8",
          dragActive
            ? "scale-[0.99] border-primary bg-primary/10 shadow-[0_4px_0_0_hsl(var(--border))]"
            : "hover:border-primary/60 hover:bg-muted/30",
          error && "border-destructive bg-destructive/5",
        )}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
          {busy ? (
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          ) : fileName ? (
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Upload className="h-6 w-6" aria-hidden="true" />
          )}
        </span>
        <span className="text-sm font-semibold text-foreground">
          {busy ? "Processing file..." : fileName ? fileName : title}
        </span>
        <span id={descriptionId} className="text-xs text-muted-foreground">
          {fileName ? "Select or drop another file to replace it" : description}
        </span>
        <span className="flex flex-wrap justify-center gap-1.5" aria-label="Accepted file formats">
          {formats.map((format) => (
            <span
              key={format}
              className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
            >
              {format}
            </span>
          ))}
        </span>
      </button>
      <div className="flex min-h-5 items-start justify-between gap-3">
        {error ? (
          <p id={errorId} className="text-xs font-semibold text-destructive" role="alert">
            {error}
          </p>
        ) : (
          <span />
        )}
        {fileName && onClear && !busy ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-7 shrink-0 text-xs"
          >
            <X className="h-3.5 w-3.5" /> Clear file
          </Button>
        ) : null}
      </div>
    </div>
  );
};
