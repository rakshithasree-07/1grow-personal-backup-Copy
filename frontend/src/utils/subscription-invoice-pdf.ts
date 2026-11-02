import { jsPDF } from "jspdf";
import type { SubscriptionInvoice, SubscriptionInvoicePayment } from "@/services/subscription.service";

export interface SubscriptionInvoicePdfData {
  invoice: SubscriptionInvoice;
  planName: string;
  tenantName: string;
  tenantEmail?: string | null;
  tenantPhone?: string | null;
}

export function formatCurrency(amount: number, currency = "INR"): string {
  const symbol = currency === "INR" ? "₹" : `${currency} `;
  return `${symbol}${Number(amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export async function generateSubscriptionInvoicePdf(
  data: SubscriptionInvoicePdfData,
  mode: "download" | "view" = "download",
): Promise<Blob | string> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  const primary: [number, number, number] = [79, 70, 229];
  const ink: [number, number, number] = [30, 41, 59];
  const muted: [number, number, number] = [100, 116, 139];

  const inv = data.invoice;
  const fmt = (n: number) => formatCurrency(n, inv.currency);
  const payments = inv.payments ?? [];

  let y = margin;

  // ─── Header band ────────────────────────────────────────────────────────
  doc.setFillColor(...primary);
  doc.rect(margin, y, contentWidth, 30, "F");

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth - margin - 30, y + 5, 30, 20, 3, 3, "F");
  doc.setFontSize(16);
  doc.setTextColor(...primary);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", pageWidth - margin - 15, y + 18, { align: "center" });

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(data.tenantName || "1Grow", margin + 6, y + 13);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(226, 232, 240);
  if (data.tenantEmail) doc.text(data.tenantEmail, margin + 6, y + 19);
  if (data.tenantPhone) doc.text(data.tenantPhone, margin + 6, y + 24);

  y += 30 + 10;

  // ─── Meta grid ──────────────────────────────────────────────────────────
  const metaCols: Array<[string, string]> = [
    ["Invoice #", inv.invoiceNumber],
    ["Plan", data.planName],
    ["Issued", inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : "—"],
    ["Due Date", inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"],
    ["Status", inv.status.toUpperCase()],
    ["Paid On", inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : "—"],
  ];

  doc.setFontSize(7.5);
  metaCols.forEach(([label, value], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = margin + col * (contentWidth / 3);
    const yy = y + row * 14;

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...muted);
    doc.text(label.toUpperCase(), x, yy);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...ink);
    doc.text(value, x, yy + 5);
  });
  y += 2 * 14 + 4;

  // ─── Divider ────────────────────────────────────────────────────────────
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ─── Summary table ──────────────────────────────────────────────────────
  const tableLeft = margin;
  const tableRight = pageWidth - margin;
  const rowHeight = 9;

  const headerY = y;
  doc.setFillColor(241, 245, 249);
  doc.rect(tableLeft, headerY, contentWidth, rowHeight, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...muted);
  doc.text("DESCRIPTION", tableLeft + 4, headerY + 6);
  doc.text("AMOUNT", tableRight - 4, headerY + 6, { align: "right" });
  y += rowHeight;

  const itemY = y;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...ink);
  doc.setFontSize(9);
  doc.text(`Subscription charge — ${data.planName}`, tableLeft + 4, itemY + 5);
  doc.text(fmt(inv.amount), tableRight - 4, itemY + 5, { align: "right" });
  y += rowHeight;

  doc.setDrawColor(226, 232, 240);
  doc.line(tableLeft, y, tableRight, y);
  y += 3;

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal", tableLeft + 4, y + 4);
  doc.text(fmt(inv.amount), tableRight - 4, y + 4, { align: "right" });
  y += 7;

  doc.text("Tax", tableLeft + 4, y + 4);
  doc.text(fmt(inv.tax), tableRight - 4, y + 4, { align: "right" });
  y += 9;

  doc.setFillColor(238, 242, 255);
  doc.rect(tableLeft, y, contentWidth, rowHeight, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("TOTAL", tableLeft + 4, y + 6);
  doc.text(fmt(inv.totalAmount), tableRight - 4, y + 6, { align: "right" });
  y += rowHeight + 4;

  // ─── Payments ───────────────────────────────────────────────────────────
  if (payments.length > 0) {
    y += 4;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primary);
    doc.text("PAYMENT DETAILS", margin, y);
    y += 7;

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...muted);
    doc.text("DATE", margin, y);
    doc.text("REFERENCE", margin + 42, y);
    doc.text("AMOUNT", tableRight - 4, y, { align: "right" });
    y += 3;
    doc.line(margin, y, tableRight, y);
    y += 3;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...ink);
    payments.forEach((p: SubscriptionInvoicePayment) => {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = margin;
      }
      doc.text(p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "—", margin, y + 4);
      doc.text(p.gatewayRef ?? "—", margin + 42, y + 4);
      doc.text(fmt(p.amount), tableRight - 4, y + 4, { align: "right" });
      y += 7;
    });
    y += 4;
  }

  // ─── Footer ─────────────────────────────────────────────────────────────
  const footerY = pageHeight - 16;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 6, tableRight, footerY - 6);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...muted);
  doc.text("Thank you for subscribing with 1Grow.", margin, footerY);
  doc.text(
    `Generated on ${new Date().toLocaleString()}`,
    tableRight,
    footerY,
    { align: "right" },
  );

  if (mode === "download") return doc.output("blob");
  return doc.output("datauristring");
}

export function downloadSubscriptionInvoicePdf(
  data: SubscriptionInvoicePdfData,
  filename?: string,
) {
  generateSubscriptionInvoicePdf(data, "download").then((blob) => {
    const url = URL.createObjectURL(blob as Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename ?? `invoice-${data.invoice.invoiceNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}
