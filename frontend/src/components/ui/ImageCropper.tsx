"use client";

import * as React from "react";
import { Camera, ZoomIn, ZoomOut, RotateCw, Check, X, ImageIcon, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

const MAX_SIZE_BEFORE_COMPRESS = 200 * 1024;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const AVATAR_SIZE = 512;
const CROP_SIZE = 240;
const CONTAINER_SIZE = 300;
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.1;

interface Offset {
  x: number;
  y: number;
}

interface ImageCropperProps {
  currentAvatar: string | null;
  onSave: (file: File) => Promise<void>;
  disabled?: boolean;
}

function canvasToFile(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to process image"));
          return;
        }
        resolve(new File([blob], `avatar-${Date.now()}.jpg`, { type: mimeType }));
      },
      mimeType,
      quality,
    );
  });
}

function compressImage(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let w = img.width;
      let h = img.height;
      if (w > maxSize || h > maxSize) {
        const ratio = Math.min(maxSize / w, maxSize / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.6));
    };
    img.onerror = reject;
    img.src = url;
  });
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ImageCropper({ currentAvatar, onSave, disabled }: ImageCropperProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const dragState = React.useRef<{ startX: number; startY: number; startOffset: Offset } | null>(null);

  const [open, setOpen] = React.useState(false);
  const [source, setSource] = React.useState<string | null>(null);
  const [naturalW, setNaturalW] = React.useState(0);
  const [naturalH, setNaturalH] = React.useState(0);
  const [zoom, setZoom] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);
  const [offset, setOffset] = React.useState<Offset>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [preparing, setPreparing] = React.useState(false);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [isDropActive, setIsDropActive] = React.useState(false);

  const baseScale = React.useMemo(() => {
    if (!naturalW || !naturalH) return 0;
    const effW = rotation % 180 === 0 ? naturalW : naturalH;
    const effH = rotation % 180 === 0 ? naturalH : naturalW;
    return CROP_SIZE / Math.min(effW, effH);
  }, [naturalW, naturalH, rotation]);

  const displayScale = baseScale * zoom;

  const clampOffset = React.useCallback((next: Offset, currentZoom: number, currentRotation: number): Offset => {
    if (!baseScale) return { x: 0, y: 0 };
    const scale = baseScale * currentZoom;
    const effW = currentRotation % 180 === 0 ? naturalW : naturalH;
    const effH = currentRotation % 180 === 0 ? naturalH : naturalW;
    const maxX = Math.max(0, (effW * scale) / 2 - CROP_SIZE / 2);
    const maxY = Math.max(0, (effH * scale) / 2 - CROP_SIZE / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, next.x)),
      y: Math.max(-maxY, Math.min(maxY, next.y)),
    };
  }, [baseScale, naturalW, naturalH]);

  const resetCropState = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  const loadSourceIntoCropper = async (dataUrl: string) => {
    const img = new Image();
    img.onload = () => {
      setNaturalW(img.naturalWidth);
      setNaturalH(img.naturalHeight);
      setSource(dataUrl);
      resetCropState();
      setOpen(true);
    };
    img.src = dataUrl;
  };

  const processFile = async (file: File | undefined) => {
    setFileError(null);
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFileError("Please choose an image file (PNG, JPG, GIF or WebP).");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError("Image is too large. Please choose a file under 10MB.");
      return;
    }

    setPreparing(true);
    try {
      const dataUrl = file.size > MAX_SIZE_BEFORE_COMPRESS
        ? await compressImage(file, 800)
        : await readFile(file);
      await loadSourceIntoCropper(dataUrl);
    } catch {
      setFileError("Could not read that image. Please try another file.");
    } finally {
      setPreparing(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    await processFile(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDrop = async (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsDropActive(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    await processFile(file);
  };

  const applyZoom = (next: number) => {
    const clampedZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next));
    setZoom(clampedZoom);
    setOffset((prev) => clampOffset(prev, clampedZoom, rotation));
  };

  const applyRotation = () => {
    const nextRotation = (rotation + 90) % 360;
    setRotation(nextRotation);
    setOffset((prev) => clampOffset(prev, zoom, nextRotation));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    containerRef.current.setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, startOffset: offset };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    const next = {
      x: dragState.current.startOffset.x + dx,
      y: dragState.current.startOffset.y + dy,
    };
    setOffset(clampOffset(next, zoom, rotation));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (containerRef.current?.hasPointerCapture(e.pointerId)) {
      containerRef.current.releasePointerCapture(e.pointerId);
    }
    dragState.current = null;
    setIsDragging(false);
  };

  const handleCropConfirm = async () => {
    if (!source || !naturalW || !naturalH) return;
    setSaving(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = AVATAR_SIZE;
      canvas.height = AVATAR_SIZE;
      const ctx = canvas.getContext("2d")!;
      const scaleRatio = AVATAR_SIZE / CROP_SIZE;

      const img = new Image();
      img.src = source;
      await new Promise((resolve) => { img.onload = resolve; });

      ctx.save();
      ctx.translate(AVATAR_SIZE / 2, AVATAR_SIZE / 2);
      ctx.translate(offset.x * scaleRatio, offset.y * scaleRatio);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(displayScale * scaleRatio, displayScale * scaleRatio);
      ctx.drawImage(img, -naturalW / 2, -naturalH / 2, naturalW, naturalH);
      ctx.restore();

      const file = await canvasToFile(canvas, "image/jpeg", 0.85);
      await onSave(file);
      setOpen(false);
      setSource(null);
    } catch {
      // Error handled by onSave caller
    } finally {
      setSaving(false);
    }
  };

  const dispW = naturalW * displayScale;
  const dispH = naturalH * displayScale;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || preparing}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDropActive(true);
        }}
        onDragLeave={() => setIsDropActive(false)}
        onDrop={handleDrop}
        className={cn(
          "absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface transition-colors",
          currentAvatar
            ? "bg-surface-raised text-text-secondary hover:text-text-primary"
            : "bg-primary text-primary-foreground hover:bg-primary/90",
          isDropActive && "ring-2 ring-primary ring-offset-2",
        )}
        aria-label="Upload photo (click or drag and drop an image)"
        title="Upload photo"
      >
        {preparing ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
      </button>

      {fileError && !open && (
        <p className="absolute top-full mt-1 flex w-48 items-start gap-1 text-xs text-danger">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {fileError}
        </p>
      )}

      {open && source && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => !saving && setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <ImageIcon size={18} className="text-text-secondary" />
                <h3 className="text-base font-semibold text-text-primary">Crop Profile Picture</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded p-1 text-text-secondary hover:bg-surface-overlay hover:text-text-primary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col items-center gap-4 py-5">
              <div
                ref={containerRef}
                className="relative touch-none select-none overflow-hidden rounded-lg bg-black/80"
                style={{ width: CONTAINER_SIZE, height: CONTAINER_SIZE, cursor: isDragging ? "grabbing" : "grab" }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                {dispW > 0 && dispH > 0 && (
                  <img
                    src={source}
                    alt="Crop preview"
                    className="absolute pointer-events-none"
                    style={{
                      width: dispW,
                      height: dispH,
                      top: (CONTAINER_SIZE - dispH) / 2,
                      left: (CONTAINER_SIZE - dispW) / 2,
                      transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg)`,
                    }}
                    draggable={false}
                  />
                )}

                <div
                  className="pointer-events-none absolute rounded-full border-2 border-white"
                  style={{
                    width: CROP_SIZE,
                    height: CROP_SIZE,
                    top: (CONTAINER_SIZE - CROP_SIZE) / 2,
                    left: (CONTAINER_SIZE - CROP_SIZE) / 2,
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
                  }}
                />
              </div>

              <div className="flex w-full max-w-xs items-center gap-3 px-5">
                <button
                  type="button"
                  onClick={() => applyZoom(zoom - ZOOM_STEP)}
                  disabled={zoom <= ZOOM_MIN}
                  aria-label="Zoom out"
                  className="text-text-secondary hover:text-text-primary disabled:opacity-40 transition-colors"
                >
                  <ZoomOut size={18} />
                </button>
                <input
                  type="range"
                  min={ZOOM_MIN}
                  max={ZOOM_MAX}
                  step={ZOOM_STEP}
                  value={zoom}
                  onChange={(e) => applyZoom(Number(e.target.value))}
                  aria-label="Zoom"
                  className="flex-1 accent-primary"
                />
                <button
                  type="button"
                  onClick={() => applyZoom(zoom + ZOOM_STEP)}
                  disabled={zoom >= ZOOM_MAX}
                  aria-label="Zoom in"
                  className="text-text-secondary hover:text-text-primary disabled:opacity-40 transition-colors"
                >
                  <ZoomIn size={18} />
                </button>
                <div className="mx-1 h-5 w-px bg-border" />
                <button
                  type="button"
                  onClick={applyRotation}
                  aria-label="Rotate 90 degrees"
                  title="Rotate"
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  <RotateCw size={18} />
                </button>
              </div>
            </div>

            <p className="text-center text-xs text-text-secondary mb-3 px-5">
              Drag the photo to reposition, use the slider to zoom. The final image will be saved as {AVATAR_SIZE}x{AVATAR_SIZE}px.
            </p>

            <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-4">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" onClick={handleCropConfirm} loading={saving}>
                <Check size={16} className="mr-1.5" />
                Save Photo
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
