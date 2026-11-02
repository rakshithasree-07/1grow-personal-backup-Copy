import type { PaginatedMeta, PaginatedResult } from "@/types/attendance";

export type CertificateStatusFilter = "ACTIVE" | "REVOKED";

export interface CertificateField {
  id: string;
  type: "text" | "date" | "image" | "tenantName" | "tenantLogo" | "certNumber" | "studentName" | "courseName" | "issuedDate";
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  alignment?: "left" | "center" | "right";
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
}

export interface CertificateSnapshot {
  certificateId?: string;
  certNumber?: string;
  templateId?: string;
  issuedDate?: string;
  courseName?: string;
  student?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  batch?: {
    id: string;
    name: string;
    code?: string | null;
  } | null;
  template?: {
    id: string;
    name: string;
  };
  [key: string]: unknown;
}

export interface Certificate {
  id: string;
  tenantId: string;
  studentId: string;
  templateId: string;
  certNumber: string;
  courseName: string;
  issuedDate: string;
  revokedAt?: string | null;
  pdfUrl?: string | null;
  data: CertificateSnapshot;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
  };
  template?: {
    id: string;
    name: string;
    orientation?: string;
    paperSize?: string;
  };
  verifications?: Array<{ id: string; verifiedAt: string }>;
}

export interface CertificateTemplate {
  id: string;
  tenantId: string;
  name: string;
  htmlContent: string;
  cssStyles?: string | null;
  fields?: CertificateField[] | null;
  variables?: Record<string, unknown> | null;
  backgroundUrl?: string | null;
  orientation?: string;
  paperSize?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CertificateListParams {
  page?: number;
  pageSize?: number;
  studentId?: string;
  status?: CertificateStatusFilter;
}

export interface CreateCertificatePayload {
  studentId: string;
  templateId: string;
  batchId?: string;
  courseName?: string;
  issuedDate?: string;
  data?: Record<string, unknown>;
}

export interface GenerateBulkCertificatePayload {
  batchId: string;
  templateId: string;
  studentIds?: string[];
  issuedDate?: string;
}

export interface CertificateDownloadData {
  certificate: {
    id: string;
    certNumber: string;
    courseName: string;
    issuedDate: string;
    student: { id: string; name: string; phone?: string; email?: string | null };
    template: { id: string; name: string; orientation?: string; paperSize?: string };
  };
  snapshot: CertificateSnapshot;
}

export interface CertificateVerificationResult {
  valid: boolean;
  message?: string;
  studentName?: string;
  courseName?: string;
  issuedDate?: string;
  certNumber?: string;
  revokedAt?: string;
}

export type { PaginatedMeta, PaginatedResult };
