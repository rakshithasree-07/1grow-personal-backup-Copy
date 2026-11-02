"use client";

import React from "react";
import { useState, useEffect, useCallback } from "react";
import { Upload, File, Download, Archive, RotateCcw, FileText, Image, Film, Music, Search, Grid3X3, List, Eye } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Button, Badge, Pagination, SearchBar, Card, CardHeader, CardBody, Modal, Skeleton, ConfirmModal, FilterBar } from "@/components/ui";
import { UploadZone } from "../components/UploadZone";
import { getFiles, uploadFile, archiveFile, restoreFile, downloadFile, getFileBlobUrl, type TrainingFile } from "@/services/training";
import { cn } from "@/lib/cn";
import { toast } from "sonner";

const categoryIcons: Record<string, React.ReactNode> = {
  image: <Image size={18} />,
  video: <Film size={18} />,
  audio: <Music size={18} />,
  document: <FileText size={18} />,
};

const categoryLabels: Record<string, string> = {
  image: "Images",
  video: "Videos",
  audio: "Audio",
  document: "Documents",
  other: "Other",
};

export function FilesPage() {
  const [files, setFiles] = useState<TrainingFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeCategory, setActiveCategory] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<TrainingFile | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState<TrainingFile | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState<TrainingFile | null>(null);
  const pageSize = 20;

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFiles({
        page,
        pageSize,
        search,
        category: activeCategory,
        isArchived: activeFilters.isArchived === "archived" ? true : activeFilters.isArchived === "active" ? false : undefined,
      });
      setFiles(res.data ?? []);
      setTotal(res.meta?.total ?? res.data?.length ?? 0);
    } catch {
      toast.error("Failed to load files");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, activeCategory, activeFilters]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const handleUpload = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const category = ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext) ? "image"
      : ["mp4", "webm", "mov"].includes(ext) ? "video"
      : ["mp3", "wav", "ogg"].includes(ext) ? "audio"
      : ["pdf", "doc", "docx", "xls", "xlsx", "txt"].includes(ext) ? "document"
      : "other";
    try {
      await uploadFile(file, category);
      toast.success("File uploaded successfully");
      fetchFiles();
    } catch (err) {
      throw err instanceof Error ? err : new Error("Upload failed");
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveFile(id);
      toast.success("File archived");
      setArchiveConfirm(null);
      fetchFiles();
    } catch {
      toast.error("Failed to archive file");
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreFile(id);
      toast.success("File restored");
      setRestoreConfirm(null);
      fetchFiles();
    } catch {
      toast.error("Failed to restore file");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const categories = [...new Set(files.map((f) => f.category).filter(Boolean))] as string[];

  const filterDefs = [
    { key: "isArchived", label: "Status", options: [
      { value: "active", label: "Active" },
      { value: "archived", label: "Archived" },
    ]},
  ];

  return (
    <PageContainer
      title="Files"
      subtitle="Manage uploaded files and media"
      actions={
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Upload size={16} /> Upload Files
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search files…" className="max-w-xs" />
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveCategory("")}
              className={cn("rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition-colors", !activeCategory ? "bg-primary text-primary-foreground" : "text-text-secondary hover:text-text-primary")}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat === activeCategory ? "" : cat)}
                className={cn("rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition-colors", cat === activeCategory ? "bg-primary text-primary-foreground" : "text-text-secondary hover:text-text-primary")}
              >
                {categoryLabels[cat] ?? cat}
              </button>
            ))}
          </div>
        </div>
        <FilterBar filters={filterDefs} active={activeFilters} onChange={(k, v) => { setActiveFilters((p) => ({ ...p, [k]: v })); setPage(1); }} onClear={() => { setActiveFilters({}); setPage(1); }} />
        <div className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-border p-0.5">
          <button onClick={() => setViewMode("grid")} className={cn("rounded-[var(--radius-xs)] p-1.5", viewMode === "grid" ? "bg-surface-overlay" : "text-text-secondary")} aria-label="Grid view">
            <Grid3X3 size={14} />
          </button>
          <button onClick={() => setViewMode("list")} className={cn("rounded-[var(--radius-xs)] p-1.5", viewMode === "list" ? "bg-surface-overlay" : "text-text-secondary")} aria-label="List view">
            <List size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className={viewMode === "grid" ? "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" : "space-y-2"}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className={viewMode === "grid" ? "h-[120px]" : "h-[52px]"} />
          ))}
        </div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
          <File size={40} className="mb-3 text-text-disabled" />
          <p className="text-sm font-medium">No files found</p>
          <p className="text-xs mt-1">Upload files to get started</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {files.map((file) => (
            <div
              key={file.id}
              className="rounded-[var(--radius-md)] border border-border bg-surface p-4 transition-colors hover:border-primary/30"
            >
              <div className="flex items-center justify-center h-16 mb-3 rounded-[var(--radius-sm)] bg-surface-raised">
                {(file.category && categoryIcons[file.category]) ?? <File size={24} className="text-text-secondary" />}
              </div>
              <p className="text-sm font-medium text-text-primary truncate">{file.name}</p>
              <p className="text-xs text-text-secondary">{file.size != null ? formatSize(file.size) : "—"}</p>
              {file.isArchived && <Badge size="sm" variant="outline" className="mt-1">Archived</Badge>}
              <div className="mt-3 flex items-center justify-end gap-1 border-t border-border pt-1.5">
                <button onClick={() => { setPreviewFile(file); if (file.mimeType?.startsWith("image/")) getFileBlobUrl(file.id, "files").then(setPreviewBlobUrl).catch(() => setPreviewBlobUrl(null)); }} title="Preview" className="rounded p-1.5 text-text-secondary hover:bg-surface-overlay transition-colors">
                  <Eye size={14} />
                </button>
                <button onClick={() => downloadFile(file.id, "files", file.name)} title="Download" className="rounded p-1.5 text-text-secondary hover:bg-surface-overlay transition-colors">
                  <Download size={14} />
                </button>
                {file.isArchived ? (
                  <button onClick={() => setRestoreConfirm(file)} title="Restore" className="rounded p-1.5 text-text-secondary hover:bg-surface-overlay transition-colors">
                    <RotateCcw size={14} />
                  </button>
                ) : (
                  <button onClick={() => setArchiveConfirm(file)} title="Archive" className="rounded p-1.5 text-text-secondary hover:bg-surface-overlay transition-colors">
                    <Archive size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-border px-4 py-2.5 transition-colors hover:bg-surface-overlay">
              {(file.category && categoryIcons[file.category]) ?? <File size={16} className="text-text-secondary shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary truncate">{file.name}</p>
                <p className="text-xs text-text-secondary">{file.size != null ? formatSize(file.size) : "—"} • {file.category ?? "other"}</p>
              </div>
              <Badge size="sm" variant={file.isArchived ? "outline" : "success"}>{file.isArchived ? "Archived" : "Active"}</Badge>
              <div className="flex items-center gap-0.5">
                <button onClick={() => downloadFile(file.id, "files", file.name)} title="Download" className="flex items-center gap-1 rounded px-2 py-1 text-xs text-text-secondary hover:bg-surface-overlay transition-colors">
                  <Download size={13} /> Download
                </button>
                {file.isArchived ? (
                  <button onClick={() => setRestoreConfirm(file)} title="Restore" className="flex items-center gap-1 rounded px-2 py-1 text-xs text-text-secondary hover:bg-surface-overlay transition-colors">
                    <RotateCcw size={13} /> Restore
                  </button>
                ) : (
                  <button onClick={() => setArchiveConfirm(file)} title="Archive" className="flex items-center gap-1 rounded px-2 py-1 text-xs text-text-secondary hover:bg-surface-overlay transition-colors">
                    <Archive size={13} /> Archive
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
      </div>

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Files" size="md">
        <UploadZone onUpload={handleUpload} />
      </Modal>

      <Modal open={!!previewFile} onClose={() => { if (previewBlobUrl) { URL.revokeObjectURL(previewBlobUrl); setPreviewBlobUrl(null); } setPreviewFile(null); }} title={previewFile?.name ?? "File"} size="lg">
        {previewFile && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {(previewFile.category && categoryIcons[previewFile.category]) ?? <File size={24} className="text-primary" />}
              <div>
                <p className="font-medium text-text-primary">{previewFile.name}</p>
                <p className="text-sm text-text-secondary">
                  {previewFile.size != null ? formatSize(previewFile.size) : "—"}
                  {previewFile.mimeType ? ` • ${previewFile.mimeType}` : ""}
                  {previewFile.category ? ` • ${categoryLabels[previewFile.category] ?? previewFile.category}` : ""}
                </p>
              </div>
              <Badge size="sm" variant={previewFile.isArchived ? "outline" : "success"}>{previewFile.isArchived ? "Archived" : "Active"}</Badge>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-surface-raised p-8 text-center">
              {previewBlobUrl ? (
                <img src={previewBlobUrl} alt={previewFile.name} className="max-h-[300px] mx-auto object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  {(previewFile.category && categoryIcons[previewFile.category]) ?? <File size={48} className="text-text-disabled" />}
                  <p className="text-sm text-text-secondary">{previewFile.mimeType?.startsWith("image/") ? "Loading preview…" : "Preview not available"}</p>
                  <Button size="sm" onClick={() => downloadFile(previewFile.id, "files", previewFile.name)}>
                    <Download size={16} /> Download
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between pt-2">
              <Button size="sm" variant="outline" onClick={() => downloadFile(previewFile.id, "files", previewFile.name)}>
                <Download size={16} /> Download
              </Button>
              <div className="flex gap-2">
                {previewFile.isArchived ? (
                  <Button size="sm" variant="outline" onClick={() => { if (previewBlobUrl) { URL.revokeObjectURL(previewBlobUrl); setPreviewBlobUrl(null); } setRestoreConfirm(previewFile); setPreviewFile(null); }}>
                    <RotateCcw size={14} /> Restore
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => { if (previewBlobUrl) { URL.revokeObjectURL(previewBlobUrl); setPreviewBlobUrl(null); } setArchiveConfirm(previewFile); setPreviewFile(null); }}>
                    <Archive size={14} /> Archive
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!archiveConfirm}
        onClose={() => setArchiveConfirm(null)}
        onConfirm={async () => { if (archiveConfirm) await handleArchive(archiveConfirm.id); }}
        title="Archive File"
        description={`Archive "${archiveConfirm?.name}"?`}
        confirmLabel="Archive"
        intent="warning"
      />

      <ConfirmModal
        open={!!restoreConfirm}
        onClose={() => setRestoreConfirm(null)}
        onConfirm={async () => { if (restoreConfirm) await handleRestore(restoreConfirm.id); }}
        title="Restore File"
        description={`Restore "${restoreConfirm?.name}"?`}
        confirmLabel="Restore"
        intent="info"
      />
    </PageContainer>
  );
}