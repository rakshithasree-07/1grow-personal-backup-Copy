"use client";

import { useState, useRef, useCallback } from "react";
import { Move, Trash2, Plus, Eye, Download, Image as ImageIcon, Type, Calendar, AlignLeft } from "lucide-react";
import { Button, Input, Select, Textarea, ColorPicker } from "@/components/ui";
import type { CertificateField } from "@/types/certificates";

type FieldType = CertificateField["type"];
type ViewMode = "design" | "preview";

interface Props {
  initialFields?: CertificateField[];
  initialBackgroundUrl?: string;
  initialName?: string;
  onSave: (data: { name: string; fields: CertificateField[]; backgroundUrl?: string; htmlContent: string; cssStyles?: string }) => Promise<void>;
  saving?: boolean;
}

const FIELD_TYPES: { type: FieldType; label: string; icon: React.ReactNode }[] = [
  { type: "studentName", label: "Student Name", icon: <Type size={14} /> },
  { type: "courseName", label: "Course Name", icon: <Type size={14} /> },
  { type: "certNumber", label: "Certificate No.", icon: <AlignLeft size={14} /> },
  { type: "issuedDate", label: "Issued Date", icon: <Calendar size={14} /> },
  { type: "tenantName", label: "Tenant Name", icon: <Type size={14} /> },
  { type: "tenantLogo", label: "Tenant Logo", icon: <ImageIcon size={14} /> },
  { type: "text", label: "Custom Text", icon: <Type size={14} /> },
];

const DEFAULT_FIELD = (type: FieldType): CertificateField => ({
  id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  type,
  label: FIELD_TYPES.find((f) => f.type === type)?.label ?? type,
  x: 100,
  y: 100,
  width: type === "tenantLogo" ? 100 : 300,
  height: type === "tenantLogo" ? 100 : 50,
  fontSize: type === "tenantName" ? 28 : type === "studentName" ? 36 : 24,
  fontFamily: "serif",
  color: "#1a1a1a",
  alignment: "center",
  required: false,
  defaultValue: "",
  placeholder: `[${FIELD_TYPES.find((f) => f.type === type)?.label ?? type}]`,
});

const CANVAS_WIDTH = 842;
const CANVAS_HEIGHT = 595;

export function CertificateTemplateDesigner({ initialFields, initialBackgroundUrl, initialName, onSave, saving }: Props) {
  const [name, setName] = useState(initialName ?? "");
  const [fields, setFields] = useState<CertificateField[]>(initialFields ?? []);
  const [backgroundUrl, setBackgroundUrl] = useState(initialBackgroundUrl ?? "");
  const [viewMode, setViewMode] = useState<ViewMode>("design");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; fieldX: number; fieldY: number } | null>(null);
  const [resizing, setResizing] = useState<{ id: string; startX: number; startY: number; fieldW: number; fieldH: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const addField = useCallback((type: FieldType) => {
    const field = DEFAULT_FIELD(type);
    setFields((prev) => [...prev, field]);
    setSelectedId(field.id);
  }, []);

  const updateField = useCallback((id: string, updates: Partial<CertificateField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }, []);

  const removeField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  }, []);

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    if (viewMode !== "design") return;
    e.preventDefault();
    const field = fields.find((f) => f.id === id);
    if (!field) return;
    setDragging({ id, startX: e.clientX, startY: e.clientY, fieldX: field.x, fieldY: field.y });
  };

  const handleResizeStart = (e: React.MouseEvent, id: string) => {
    if (viewMode !== "design") return;
    e.preventDefault();
    e.stopPropagation();
    const field = fields.find((f) => f.id === id);
    if (!field) return;
    setResizing({ id, startX: e.clientX, startY: e.clientY, fieldW: field.width, fieldH: field.height });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragging) {
      const dx = e.clientX - dragging.startX;
      const dy = e.clientY - dragging.startY;
      updateField(dragging.id, {
        x: Math.max(0, Math.min(CANVAS_WIDTH - 50, dragging.fieldX + dx)),
        y: Math.max(0, Math.min(CANVAS_HEIGHT - 30, dragging.fieldY + dy)),
      });
    }
    if (resizing) {
      const dx = e.clientX - resizing.startX;
      const dy = e.clientY - resizing.startY;
      updateField(resizing.id, {
        width: Math.max(50, resizing.fieldW + dx),
        height: Math.max(30, resizing.fieldH + dy),
      });
    }
  }, [dragging, resizing, updateField]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setResizing(null);
  }, []);

  const selectedField = fields.find((f) => f.id === selectedId);

  const renderFieldPreview = (field: CertificateField) => {
    const style: React.CSSProperties = {
      position: "absolute",
      left: field.x,
      top: field.y,
      width: field.width,
      height: field.height,
      fontSize: field.fontSize,
      fontFamily: field.fontFamily,
      color: field.color,
      textAlign: field.alignment,
      cursor: viewMode === "design" ? "move" : "default",
      border: viewMode === "design" ? "1px dashed #94a3b8" : "none",
      borderRadius: 2,
      padding: 4,
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
      justifyContent: field.alignment === "center" ? "center" : field.alignment === "right" ? "flex-end" : "flex-start",
    };

    if (field.type === "tenantLogo") {
      return (
        <div key={field.id} style={style}>
          <img src={backgroundUrl || "/placeholder-logo.png"} alt="Logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        </div>
      );
    }

    if (viewMode === "design") {
      return (
        <div
          key={field.id}
          style={style}
          onMouseDown={(e) => handleMouseDown(e, field.id)}
          onClick={() => setSelectedId(field.id)}
        >
          <span className="text-xs text-text-secondary truncate">{field.placeholder || field.label}</span>
          <div
            style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, cursor: "se-resize", background: "#6366f1" }}
            onMouseDown={(e) => handleResizeStart(e, field.id)}
          />
        </div>
      );
    }

    return null;
  };

  const generateHtml = useCallback(() => {
    const bgStyle = backgroundUrl ? `background-image: url('${backgroundUrl}'); background-size: cover;` : "";
    const fieldStyles = fields.map((f) => {
      if (f.type === "tenantLogo") return "";
      return `
        <div style="position: absolute; left: ${f.x}px; top: ${f.y}px; width: ${f.width}px; height: ${f.height}px; font-size: ${f.fontSize}px; font-family: ${f.fontFamily}; color: ${f.color}; text-align: ${f.alignment}; display: flex; align-items: center; justify-content: ${f.alignment === "center" ? "center" : f.alignment === "right" ? "flex-end" : "flex-start"};">
          {{${f.id}}}
        </div>`;
    }).join("\n");

    const logoSvg = backgroundUrl ? `<img src="${backgroundUrl}" style="max-width: 100px; max-height: 100px;" />` : "";

    return `
      <div style="position: relative; width: ${CANVAS_WIDTH}px; height: ${CANVAS_HEIGHT}px; ${bgStyle} overflow: hidden;">
        ${logoSvg}
        ${fieldStyles}
      </div>`;
  }, [fields, backgroundUrl]);

  const handleSave = async () => {
    await onSave({
      name,
      fields,
      backgroundUrl: backgroundUrl || undefined,
      htmlContent: generateHtml(),
      cssStyles: `
        @page { size: landscape; margin: 0; }
        body { margin: 0; padding: 0; }
      `,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <Input
          placeholder="Template Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex items-center gap-2">
          <Button
            size="xs"
            variant={viewMode === "design" ? "primary" : "outline"}
            onClick={() => setViewMode("design")}
          >
            Design
          </Button>
          <Button
            size="xs"
            variant={viewMode === "preview" ? "primary" : "outline"}
            onClick={() => setViewMode("preview")}
          >
            <Eye size={14} /> Preview
          </Button>
          <Button size="xs" onClick={handleSave} loading={saving}>
            <Download size={14} /> Save Template
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Left Sidebar - Field Palette */}
        <div className="w-44 shrink-0 space-y-1">
          <p className="text-xs font-medium text-text-secondary mb-2">Add Fields</p>
          {FIELD_TYPES.map((ft) => (
            <button
              key={ft.type}
              onClick={() => addField(ft.type)}
              className="flex items-center gap-2 w-full rounded-[var(--radius-xs)] px-2.5 py-1.5 text-xs text-text-secondary hover:bg-surface-overlay transition-colors"
            >
              {ft.icon}
              {ft.label}
              <Plus size={12} className="ml-auto" />
            </button>
          ))}
        </div>

        {/* Canvas */}
        <div className="flex-1">
          <div
            ref={canvasRef}
            className="relative mx-auto border border-border rounded-[var(--radius-sm)] bg-white shadow-[var(--shadow-2)]"
            style={{ width: CANVAS_WIDTH / 2, height: CANVAS_HEIGHT / 2, overflow: "hidden" }}
            onMouseMove={handleMouseMove as any}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {backgroundUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={backgroundUrl}
                alt="Background"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
            )}
            {fields.map(renderFieldPreview)}
            {fields.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-text-disabled text-xs">
                Add fields from the left panel
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Properties */}
        <div className="w-56 shrink-0 space-y-3">
          <p className="text-xs font-medium text-text-secondary mb-2">Properties</p>

          <div className="space-y-2">
            <label className="text-xs text-text-secondary">Background Image URL</label>
            <Input
              placeholder="https://..."
              value={backgroundUrl}
              onChange={(e) => setBackgroundUrl(e.target.value)}
             
            />
          </div>

          {selectedField && (
            <div className="space-y-2 border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">{selectedField.label}</p>
                <button onClick={() => removeField(selectedField.id)} className="text-danger hover:text-danger-700">
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input label="X" type="number" value={selectedField.x} onChange={(e) => updateField(selectedField.id, { x: Number(e.target.value) })} />
                <Input label="Y" type="number" value={selectedField.y} onChange={(e) => updateField(selectedField.id, { y: Number(e.target.value) })} />
                <Input label="Width" type="number" value={selectedField.width} onChange={(e) => updateField(selectedField.id, { width: Number(e.target.value) })} />
                <Input label="Height" type="number" value={selectedField.height} onChange={(e) => updateField(selectedField.id, { height: Number(e.target.value) })} />
              </div>

              {selectedField.type !== "tenantLogo" && (
                <>
                  <Input label="Font Size" type="number" value={selectedField.fontSize ?? 24} onChange={(e) => updateField(selectedField.id, { fontSize: Number(e.target.value) })} />
                  <Select
                    label="Font Family"
                    value={selectedField.fontFamily ?? "serif"}
                    onChange={(val) => updateField(selectedField.id, { fontFamily: val })}
                    options={[
                      { value: "serif", label: "Serif" },
                      { value: "sans-serif", label: "Sans Serif" },
                      { value: "monospace", label: "Monospace" },
                      { value: "cursive", label: "Cursive" },
                    ]}
                  />
                  <div>
                    <label className="text-xs text-text-secondary mb-1 block">Color</label>
                    <input
                      type="color"
                      value={selectedField.color ?? "#1a1a1a"}
                      onChange={(e) => updateField(selectedField.id, { color: e.target.value })}
                      className="w-full h-8 rounded cursor-pointer"
                    />
                  </div>
                  <Select
                    label="Alignment"
                    value={selectedField.alignment ?? "center"}
                    onChange={(val) => updateField(selectedField.id, { alignment: val as any })}
                    options={[
                      { value: "left", label: "Left" },
                      { value: "center", label: "Center" },
                      { value: "right", label: "Right" },
                    ]}
                  />
                  {selectedField.type === "text" && (
                    <Input label="Default Value" value={selectedField.defaultValue ?? ""} onChange={(e) => updateField(selectedField.id, { defaultValue: e.target.value })} />
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
