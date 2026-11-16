"use client";

import { useState, useEffect, useCallback } from "react";
import { Upload, FileText, Archive, RotateCcw, CheckCircle2, XCircle, Search, Eye, Download } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Button, Badge, Pagination, SearchBar, FilterBar, Modal, ConfirmModal, Card, StatCard, Input, Select, Textarea } from "@/components/ui";
import { DocumentGrid } from "../components/DocumentGrid";
import { UploadZone } from "../components/UploadZone";
import { getDocuments, createDocument, verifyDocument, rejectDocument, archiveDocument, restoreDocument, uploadFile, getFileDownloadUrl, downloadFile, getFileBlobUrl, type TrainingDocument } from "@/services/training";
import { toast } from "sonner";

export function DocumentsPage() {
  const [documents, setDocuments] = useState<TrainingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadStudentId, setUploadStudentId] = useState("");
  const [uploadType, setUploadType] = useState("OTHER");
  const [previewDoc, setPreviewDoc] = useState<TrainingDocument | null>(null);
  const [previewDocBlobUrl, setPreviewDocBlobUrl] = useState<string | null>(null);
  const [rejectDoc, setRejectDoc] = useState<TrainingDocument | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [archiveConfirm, setArchiveConfirm] = useState<TrainingDocument | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState<TrainingDocument | null>(null);
  const pageSize = 12;

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDocuments({ page, pageSize, search, status: activeFilters.status, type: activeFilters.type });
      setDocuments(res.data ?? []);
      setTotal(res.meta?.total ?? res.data?.length ?? 0);
    } catch {
      toast.error("Failed to load documents");
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, activeFilters]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleUpload = async (file: File) => {
    if (!uploadStudentId.trim()) {
      toast.error("Student ID is required");
      throw new Error("Student ID required");
    }
    try {
      const uploadRes = await uploadFile(file, uploadType);
      const uploadedFile = uploadRes.data;
      if (!uploadedFile?.id) {
        toast.error("Failed to upload file");
        return;
      }
      await createDocument({
        studentId: uploadStudentId.trim(),
        name: file.name,
        type: uploadType,
        fileUrl: getFileDownloadUrl(uploadedFile.id),
        fileSize: file.size,
        mimeType: file.type,
      });
      toast.success("Document uploaded successfully");
      setUploadOpen(false);
      setUploadStudentId("");
      setUploadType("OTHER");
      fetchDocuments();
    } catch {
      toast.error("Failed to upload document");
      throw new Error("Upload failed");
    }
  };

  const handleVerify = async (id: string) => {
    try {
      await verifyDocument(id);
      toast.success("Document verified");
      fetchDocuments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to verify document");
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    try {
      await rejectDocument(id, rejectReason);
      toast.success("Document rejected");
      setRejectDoc(null);
      setRejectReason("");
      fetchDocuments();
    } catch {
      toast.error("Failed to reject document");
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveDocument(id);
      toast.success("Document archived");
      setArchiveConfirm(null);
      fetchDocuments();
    } catch {
      toast.error("Failed to archive document");
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreDocument(id);
      toast.success("Document restored");
      setRestoreConfirm(null);
      fetchDocuments();
    } catch {
      toast.error("Failed to restore document");
    }
  };

  const filterDefs = [
    { key: "status", label: "Status", options: [
      { value: "PENDING", label: "Pending" },
      { value: "VERIFIED", label: "Verified" },
      { value: "REJECTED", label: "Rejected" },
      { value: "ARCHIVED", label: "Archived" },
    ]},
    { key: "type", label: "Type", options: [
      { value: "ID_PROOF", label: "ID Proof" },
      { value: "PHOTO", label: "Photo" },
      { value: "QUALIFICATION", label: "Qualification" },
      { value: "ADDRESS", label: "Address Proof" },
      { value: "OTHER", label: "Other" },
    ]},
  ];

  const pendingCount = documents.filter((d) => d.status === "PENDING").length;

  return (
    <PageContainer
      title="Documents"
      subtitle="Manage student documents and verification"
      actions={
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Upload size={16} /> Upload Document
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-6">
        <StatCard title="Total" value={total} icon={<FileText size={18} />} />
        <StatCard title="Pending" value={pendingCount} icon={<FileText size={18} />} />
        <StatCard title="Verified" value={documents.filter((d) => d.status === "VERIFIED").length} icon={<CheckCircle2 size={18} />} />
        <StatCard title="Rejected" value={documents.filter((d) => d.status === "REJECTED").length} icon={<XCircle size={18} />} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search documents…" className="max-w-xs" />
        <FilterBar filters={filterDefs} active={activeFilters} onChange={(k, v) => { setActiveFilters((p) => ({ ...p, [k]: v })); setPage(1); }} onClear={() => { setActiveFilters({}); setPage(1); }} />
      </div>

      <DocumentGrid
        documents={documents}
        loading={loading}
        onVerify={handleVerify}
        onReject={(id) => setRejectDoc(documents.find((d) => d.id === id) ?? null)}
        onArchive={(id) => setArchiveConfirm(documents.find((d) => d.id === id) ?? null)}
        onRestore={(id) => setRestoreConfirm(documents.find((d) => d.id === id) ?? null)}
        onPreview={(doc) => { setPreviewDoc(doc); if (doc.mimeType?.startsWith("image/")) getFileBlobUrl(doc.id, "documents").then(setPreviewDocBlobUrl).catch(() => setPreviewDocBlobUrl(null)); }}
      />

      <div className="mt-4">
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
      </div>

      <Modal open={uploadOpen} onClose={() => { setUploadOpen(false); setUploadStudentId(""); setUploadType("OTHER"); }} title="Upload Document" size="md">
        <div className="space-y-4">
          <Input
            label="Student ID"
            value={uploadStudentId}
            onChange={(e) => setUploadStudentId(e.target.value)}
            placeholder="Enter student UUID"
          />
          <Select
            label="Document Type"
            value={uploadType}
            onChange={(val) => setUploadType(val)}
            options={[
              { value: "ID_PROOF", label: "ID Proof" },
              { value: "PHOTO", label: "Photo" },
              { value: "QUALIFICATION", label: "Qualification" },
              { value: "ADDRESS", label: "Address Proof" },
              { value: "OTHER", label: "Other" },
            ]}
          />
          <UploadZone onUpload={handleUpload} />
        </div>
      </Modal>

      <Modal open={!!previewDoc} onClose={() => { if (previewDocBlobUrl) { URL.revokeObjectURL(previewDocBlobUrl); setPreviewDocBlobUrl(null); } setPreviewDoc(null); }} title={previewDoc?.name ?? "Document"} size="lg">
        {previewDoc && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <FileText size={24} className="text-primary" />
              <div>
                <p className="font-medium text-text-primary">{previewDoc.name}</p>
                <p className="text-sm text-text-secondary">Type: {previewDoc.type}{previewDoc.studentName ? ` • ${previewDoc.studentName}` : ""}</p>
              </div>
              <Badge
                variant={previewDoc.status === "VERIFIED" ? "success" : previewDoc.status === "REJECTED" ? "danger" : previewDoc.status === "ARCHIVED" ? "outline" : "warning"}
                size="sm"
              >
                {previewDoc.status}
              </Badge>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-surface-raised p-8 text-center">
              {previewDocBlobUrl ? (
                <img src={previewDocBlobUrl} alt={previewDoc.name} className="max-h-[300px] mx-auto object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <FileText size={48} className="text-text-disabled" />
                  <p className="text-sm text-text-secondary">{previewDoc.mimeType?.startsWith("image/") ? "Loading preview…" : "Preview not available"}</p>
                  <Button size="sm" onClick={() => downloadFile(previewDoc.id, "documents", previewDoc.name)}>
                    <Download size={16} /> Download
                  </Button>
                </div>
              )}
            </div>
            {previewDoc.remarks && (
              <div className="rounded-[var(--radius-sm)] border border-border bg-surface-raised p-3">
                <p className="text-xs font-medium text-text-secondary">Remarks</p>
                <p className="text-sm text-text-primary mt-1">{previewDoc.remarks}</p>
              </div>
            )}
            <div className="flex items-center justify-between pt-2">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => downloadFile(previewDoc.id, "documents", previewDoc.name)}>
                  <Download size={16} /> Download
                </Button>
              </div>
              <div className="flex gap-2">
                {previewDoc.status === "ARCHIVED" ? (
                  <Button size="sm" variant="outline" onClick={() => { if (previewDocBlobUrl) { URL.revokeObjectURL(previewDocBlobUrl); setPreviewDocBlobUrl(null); } setRestoreConfirm(previewDoc); setPreviewDoc(null); }}>
                    <RotateCcw size={14} /> Restore
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => { if (previewDocBlobUrl) { URL.revokeObjectURL(previewDocBlobUrl); setPreviewDocBlobUrl(null); } setArchiveConfirm(previewDoc); setPreviewDoc(null); }}>
                    <Archive size={14} /> Archive
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!rejectDoc} onClose={() => { setRejectDoc(null); setRejectReason(""); }} title="Reject Document" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Reject &ldquo;{rejectDoc?.name}&rdquo;? Provide a reason.
          </p>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection…"
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setRejectDoc(null); setRejectReason(""); }}>Cancel</Button>
            <Button variant="danger" onClick={() => rejectDoc && handleReject(rejectDoc.id)}>Reject</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!archiveConfirm}
        onClose={() => setArchiveConfirm(null)}
        onConfirm={async () => { if (archiveConfirm) await handleArchive(archiveConfirm.id); }}
        title="Archive Document"
        description={`Archive "${archiveConfirm?.name}"?`}
        confirmLabel="Archive"
        intent="warning"
      />

      <ConfirmModal
        open={!!restoreConfirm}
        onClose={() => setRestoreConfirm(null)}
        onConfirm={async () => { if (restoreConfirm) await handleRestore(restoreConfirm.id); }}
        title="Restore Document"
        description={`Restore "${restoreConfirm?.name}"?`}
        confirmLabel="Restore"
        intent="info"
      />
    </PageContainer>
  );
}