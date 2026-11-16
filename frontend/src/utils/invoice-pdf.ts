import { jsPDF } from "jspdf";

export interface InvoicePdfData {
  invoiceNumber: string;
  studentName?: string;
  courseName?: string;
  feePlanName?: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  issueDate: string;
  dueDate: string;
  status: string;
  notes?: string | null;
  payments?: Array<{ amount: number; createdAt: string }>;
  tenantName?: string;
  tenantAddress?: string;
  tenantEmail?: string;
  tenantPhone?: string;
  studentEmail?: string;
  studentPhone?: string;
  studentAddress?: string;
}

export async function generateInvoicePdf(
  data: InvoicePdfData,
  mode: "download" | "view" = "download",
): Promise<Blob | string> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const primaryColor: [number, number, number] = [99, 102, 241];

  let y = margin;

  // ─── Header ────────────────────────────────────────────────────
  doc.setFontSize(24);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text(data.tenantName ?? "1Grow", margin, y);
  y += 5;
  if (data.tenantAddress) {
    doc.text(data.tenantAddress, margin, y);
    y += 5;
  }
  if (data.tenantEmail || data.tenantPhone) {
    doc.text([data.tenantEmail, data.tenantPhone].filter(Boolean).join(" | "), margin, y);
    y += 5;
  }

  // ─── Invoice Meta ───────────────────────────────────────────────
  y += 5;
  const metaY = y;
  const metaItems = [
    { label: "Invoice #", value: data.invoiceNumber },
    { label: "Issue Date", value: data.issueDate ? new Date(data.issueDate).toLocaleDateString() : "-" },
    { label: "Due Date", value: data.dueDate ? new Date(data.dueDate).toLocaleDateString() : "-" },
    { label: "Status", value: data.status.toUpperCase() },
  ];

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  metaItems.forEach((item, i) => {
    doc.setFont("helvetica", "bold");
    doc.text(item.label, margin + (contentWidth / 4) * i, metaY);
    doc.setFont("helvetica", data.status === "paid" ? "bold" : "normal");
    const color = item.label === "Status" && data.status === "paid" ? [34, 197, 94] : [50, 50, 50];
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(item.value, margin + (contentWidth / 4) * i, metaY + 4);
    doc.setTextColor(50, 50, 50);
  });
  y = metaY + 12;

  // ─── Divider ────────────────────────────────────────────────────
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ─── Bill To ────────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("BILL TO", margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.text(data.studentName || "Valued Customer", margin, y);
  y += 5;
  if (data.studentEmail) {
    doc.text(data.studentEmail, margin, y);
    y += 5;
  }
  if (data.studentPhone) {
    doc.text(data.studentPhone, margin, y);
    y += 5;
  }

  if (data.courseName) {
    doc.text(`Course: ${data.courseName}`, margin, y);
    y += 5;
  }

  y += 5;

  // ─── Divider ────────────────────────────────────────────────────
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ─── Amount Summary ─────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("AMOUNT SUMMARY", margin, y);
  y += 8;

  const summaryItems = [
    { label: "Total Amount", value: `INR ${data.totalAmount.toLocaleString("en-IN")}`, bold: true },
    { label: "Paid Amount", value: `INR ${data.paidAmount.toLocaleString("en-IN")}`, bold: false },
    { label: "Due Amount", value: `INR ${data.dueAmount.toLocaleString("en-IN")}`, bold: true },
  ];

  summaryItems.forEach((item) => {
    doc.setFont("helvetica", item.bold ? "bold" : "normal");
    doc.setFontSize(10);
    const color: [number, number, number] = item.label === "Due Amount" && data.dueAmount > 0 ? [220, 50, 50] : [50, 50, 50];
    doc.setTextColor(...color);
    doc.text(item.label, margin, y);
    doc.text(item.value, pageWidth - margin - doc.getTextWidth(item.value), y, { align: "left" });
    y += 7;
  });

  y += 3;

  // ─── Payment Bar ────────────────────────────────────────────────
  if (data.totalAmount > 0) {
    const barY = y;
    const barWidth = contentWidth;
    const barHeight = 6;
    const paidPct = Math.min(100, Math.round((data.paidAmount / data.totalAmount) * 100));

    doc.setFillColor(230, 230, 230);
    doc.roundedRect(margin, barY, barWidth, barHeight, 2, 2, "F");
    const fillColor = paidPct >= 100 ? [34, 197, 94] : paidPct > 0 ? [99, 102, 241] : [200, 200, 200];
    doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
    doc.roundedRect(margin, barY, (barWidth * paidPct) / 100, barHeight, 2, 2, "F");

    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(`${paidPct}% paid`, margin + 4, barY + 4);
    y = barY + 12;
  }

  // ─── Payment History ────────────────────────────────────────────
  if (data.payments && data.payments.length > 0) {
    y += 3;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("PAYMENT HISTORY", margin, y);
    y += 7;

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(120, 120, 120);
    doc.text("Date", margin, y);
    doc.text("Amount", margin + 60, y);
    y += 4;

    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 3;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    data.payments.forEach((p) => {
      if (y > 270) {
        doc.addPage();
        y = margin;
      }
      doc.text(new Date(p.createdAt).toLocaleDateString(), margin, y);
      doc.text(`INR ${p.amount.toLocaleString("en-IN")}`, margin + 60, y);
      y += 5;
    });
    y += 3;
  }

  // ─── Notes ──────────────────────────────────────────────────────
  if (data.notes) {
    y += 3;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(120, 120, 120);
    doc.text("Notes:", margin, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    const lines = doc.splitTextToSize(data.notes, contentWidth);
    lines.forEach((line: string) => {
      if (y > 280) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 4;
    });
  }

  // ─── Footer ─────────────────────────────────────────────────────
  const footerY = 285;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.setFont("helvetica", "normal");
  doc.text("Thank you for your business!", margin, footerY, { align: "left" });
  doc.text(`Generated on ${new Date().toLocaleString()}`, pageWidth - margin, footerY, {
    align: "right",
  });

  if (mode === "download") {
    return doc.output("blob");
  }
  return doc.output("datauristring");
}

export function downloadInvoicePdf(data: InvoicePdfData, filename?: string) {
  generateInvoicePdf(data, "download").then((blob) => {
    const url = URL.createObjectURL(blob as Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename ?? `invoice-${data.invoiceNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}
