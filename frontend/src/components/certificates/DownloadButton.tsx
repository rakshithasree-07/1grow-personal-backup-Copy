"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { certificatesService } from "@/services/certificates.service";
import { toast } from "sonner";
import type { CertificateSnapshot } from "@/types/certificates";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface DownloadButtonProps {
  certificateId: string;
  certNumber?: string;
  studentName?: string;
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md";
}

function generatePdfFilename(studentName: string, certNumber: string): string {
  const sanitized = studentName
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
  return `${sanitized}_${certNumber}.pdf`;
}

export function DownloadButton({
  certificateId,
  certNumber,
  studentName,
  variant = "outline",
  size = "sm",
}: DownloadButtonProps) {
  const [loading, setLoading] = React.useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const data = await certificatesService.download(certificateId);
      const snapshot = data.snapshot;
      const certNum = data.certificate.certNumber;
      const name = studentName ?? snapshot.student?.name ?? "Student";
      const courseName = snapshot.courseName ?? "Course";
      const issuedDate = snapshot.issuedDate ?? new Date().toISOString().slice(0, 10);

      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.innerHTML = `
        <div id="cert-pdf" style="width:800px;padding:48px;border:8px double #b8860b;background:#fffef8;text-align:center;font-family:Georgia,serif;">
          <h1 style="font-size:2rem;color:#1a1a1a;margin:0 0 8px;">Certificate of Completion</h1>
          <p style="color:#666;margin-bottom:32px;">This is to certify that</p>
          <p style="font-size:1.75rem;font-weight:bold;color:#b8860b;margin:16px 0;">${name}</p>
          <p>has successfully completed</p>
          <p style="font-size:1.25rem;font-weight:bold;color:#b8860b;margin:16px 0;">${courseName}</p>
          <p style="margin-top:32px;font-size:0.875rem;color:#444;">Certificate No: ${certNum}<br>Issued: ${issuedDate}</p>
        </div>
      `;
      document.body.appendChild(container);

      const certElement = container.querySelector("#cert-pdf") as HTMLElement;
      const canvas = await html2canvas(certElement, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [800, 600],
      });

      pdf.addImage(imgData, "PNG", 0, 0, 800, 600);

      const filename = generatePdfFilename(name, certNum);
      pdf.save(filename);

      document.body.removeChild(container);
      toast.success("Certificate downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      loading={loading}
      leftIcon={<Download size={14} />}
      onClick={handleDownload}
    >
      Download
    </Button>
  );
}
