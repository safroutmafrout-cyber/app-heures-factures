'use client';

import { jsPDF } from 'jspdf';

interface InvoicePDFData {
  // Company info
  companyName: string;
  tps: string;
  tvq: string;
  fullName: string;
  address: string;
  city: string;
  phone: string;
  // Client info
  clientName: string;
  clientAddress: string;
  clientCity: string;
  // Invoice info
  invoiceNumber: string | number;
  weekRange: string;
  description: string;
  date: string;
  // Entries
  entries: { date: string; description: string; hours: number }[];
  // Billing
  totalHours: number;
  normalHours: number;
  overtimeHours: number;
  holidayHours: number;
  rate: number;
  otMul: number;
  subtotal: number;
  tpsAmount: number;
  tvqAmount: number;
  total: number;
}

/**
 * Generate a professional PDF invoice using jsPDF directly.
 * No html2canvas dependency — works reliably on all devices.
 */
export async function generateInvoicePDF(data: InvoicePDFData): Promise<Blob> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const w = 210; // A4 width
  const margin = 15;
  const contentW = w - margin * 2;
  let y = margin;

  const money = (n: number) => n.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';

  // ===== HEADER =====
  // Company name
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(79, 70, 229); // indigo-600
  pdf.text(data.companyName, margin, y);

  // FACTURE title
  pdf.setFontSize(28);
  pdf.text('FACTURE', w - margin, y, { align: 'right' });

  y += 7;
  pdf.setFontSize(9);
  pdf.setTextColor(107, 114, 128); // gray-500
  pdf.setFont('helvetica', 'normal');
  pdf.text(`TPS ${data.tps}`, margin, y);
  pdf.text(`N° ${data.invoiceNumber}`, w - margin, y, { align: 'right' });
  
  y += 4;
  pdf.text(`TVQ ${data.tvq}`, margin, y);
  pdf.setFontSize(8);
  pdf.setTextColor(156, 163, 175); // gray-400
  pdf.text(`semaine ${data.weekRange}`, w - margin, y, { align: 'right' });

  y += 6;
  pdf.setTextColor(31, 41, 55); // gray-800
  pdf.setFontSize(9);
  pdf.text(data.fullName, margin, y);
  y += 4;
  pdf.text(data.address, margin, y);
  y += 4;
  pdf.text(data.city, margin, y);
  y += 4;
  pdf.text(data.phone, margin, y);

  // Indigo line
  y += 5;
  pdf.setDrawColor(79, 70, 229);
  pdf.setLineWidth(1);
  pdf.line(margin, y, w - margin, y);

  // ===== CLIENT INFO =====
  y += 8;
  pdf.setFontSize(7);
  pdf.setTextColor(156, 163, 175);
  pdf.setFont('helvetica', 'bold');
  pdf.text('FACTURÉ À', margin, y);
  pdf.text('DATE', w - margin, y, { align: 'right' });

  y += 5;
  pdf.setFontSize(10);
  pdf.setTextColor(31, 41, 55);
  pdf.text(data.clientName, margin, y);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.date, w - margin, y, { align: 'right' });

  y += 4;
  pdf.setFontSize(9);
  pdf.text(data.clientAddress, margin, y);
  y += 4;
  pdf.text(data.clientCity, margin, y);

  // ===== DETAIL TABLE =====
  y += 10;
  const col1 = margin;
  const col2 = margin + 30;
  const col3 = w - margin;

  // Header row (indigo bg)
  pdf.setFillColor(79, 70, 229);
  pdf.rect(margin, y - 5, contentW, 9, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  pdf.text('DATE', col1 + 2, y);
  pdf.text('DESCRIPTION', col2, y);
  pdf.text('HEURES', col3 - 2, y, { align: 'right' });

  y += 8;

  // Entry rows
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(31, 41, 55);

  for (let i = 0; i < data.entries.length; i++) {
    const entry = data.entries[i];
    if (i % 2 === 1) {
      pdf.setFillColor(249, 250, 251); // gray-50
      pdf.rect(margin, y - 3.5, contentW, 6, 'F');
    }
    pdf.setTextColor(31, 41, 55);
    pdf.text(entry.date, col1 + 2, y);
    pdf.text(entry.description, col2, y);
    pdf.text(entry.hours.toFixed(2), col3 - 2, y, { align: 'right' });
    y += 6;
  }

  // Total hours row
  pdf.setFillColor(243, 244, 246); // gray-100
  pdf.rect(margin, y - 3.5, contentW, 7, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.text('Total heures', col1 + 2, y);
  pdf.text(data.totalHours.toFixed(2), col3 - 2, y, { align: 'right' });

  // ===== BILLING SUMMARY =====
  y += 14;
  pdf.setFontSize(7);
  pdf.setTextColor(156, 163, 175);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CALCUL DE LA FACTURATION', margin, y);

  y += 6;
  const bCol1 = margin;
  const bCol2 = margin + 50;
  const bCol3 = margin + 85;
  const bCol4 = w - margin;

  // Billing header
  pdf.setDrawColor(229, 231, 235); // gray-200
  pdf.setLineWidth(0.5);
  pdf.line(margin, y + 1, w - margin, y + 1);
  pdf.setFontSize(7);
  pdf.setTextColor(107, 114, 128);
  pdf.text('TYPE', bCol1 + 2, y);
  pdf.text('HEURES', bCol2, y, { align: 'right' });
  pdf.text('TAUX', bCol3, y, { align: 'right' });
  pdf.text('MONTANT', bCol4 - 2, y, { align: 'right' });

  y += 7;
  pdf.setFontSize(9);
  pdf.setTextColor(31, 41, 55);
  pdf.setFont('helvetica', 'normal');

  // Normal hours
  if (data.normalHours > 0) {
    pdf.text('Heures normales', bCol1 + 2, y);
    pdf.text(data.normalHours.toFixed(2), bCol2, y, { align: 'right' });
    pdf.text(money(data.rate), bCol3, y, { align: 'right' });
    pdf.text(money(data.normalHours * data.rate), bCol4 - 2, y, { align: 'right' });
    pdf.setDrawColor(243, 244, 246);
    pdf.line(margin, y + 2, w - margin, y + 2);
    y += 7;
  }

  // Overtime
  if (data.overtimeHours > 0) {
    pdf.setTextColor(234, 88, 12); // orange-600
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Overtime (${data.otMul}x)`, bCol1 + 2, y);
    pdf.text(data.overtimeHours.toFixed(2), bCol2, y, { align: 'right' });
    pdf.text(money(data.rate * data.otMul), bCol3, y, { align: 'right' });
    pdf.text(money(data.overtimeHours * data.rate * data.otMul), bCol4 - 2, y, { align: 'right' });
    pdf.setDrawColor(243, 244, 246);
    pdf.line(margin, y + 2, w - margin, y + 2);
    y += 7;
    pdf.setFont('helvetica', 'normal');
  }

  // Holidays
  if (data.holidayHours > 0) {
    pdf.setTextColor(124, 58, 237); // purple-600
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Jours fériés (${data.otMul}x)`, bCol1 + 2, y);
    pdf.text(data.holidayHours.toFixed(2), bCol2, y, { align: 'right' });
    pdf.text(money(data.rate * data.otMul), bCol3, y, { align: 'right' });
    pdf.text(money(data.holidayHours * data.rate * data.otMul), bCol4 - 2, y, { align: 'right' });
    y += 7;
    pdf.setFont('helvetica', 'normal');
  }

  // ===== TOTALS =====
  y += 6;
  const tCol1 = w - margin - 70;
  const tCol2 = w - margin;

  pdf.setTextColor(31, 41, 55);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Sous-total', tCol1, y);
  pdf.text(money(data.subtotal), tCol2, y, { align: 'right' });
  y += 5;
  pdf.text('TPS (5%)', tCol1, y);
  pdf.text(money(data.tpsAmount), tCol2, y, { align: 'right' });
  y += 5;
  pdf.text('TVQ (9,975%)', tCol1, y);
  pdf.text(money(data.tvqAmount), tCol2, y, { align: 'right' });

  y += 3;
  pdf.setDrawColor(79, 70, 229);
  pdf.setLineWidth(0.8);
  pdf.line(tCol1 - 2, y, tCol2, y);

  y += 6;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(79, 70, 229);
  pdf.text('Total', tCol1, y);
  pdf.text(money(data.total), tCol2, y, { align: 'right' });

  // ===== FOOTER BRANDING =====
  const footerY = 278; // near bottom of A4
  const centerX = w / 2;

  // Full-width indigo line — identical to header line
  pdf.setDrawColor(79, 70, 229);
  pdf.setLineWidth(1);
  pdf.line(margin, footerY - 12, w - margin, footerY - 12);

  // Z logo — large bold indigo
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(79, 70, 229);
  pdf.text('Z', centerX - 18, footerY - 1);

  // Vertical indigo bar — thick, matching the | from the identity
  pdf.setDrawColor(79, 70, 229);
  pdf.setLineWidth(1.5);
  pdf.line(centerX - 9, footerY - 7, centerX - 9, footerY + 3);

  // "Zairi ERP" — bold dark
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(31, 41, 55);
  pdf.text('Zairi ERP', centerX - 5, footerY - 2);

  // "SOFTWARE SOLUTIONS" — indigo uppercase
  pdf.setFontSize(5.5);
  pdf.setTextColor(79, 70, 229);
  pdf.text('SOFTWARE SOLUTIONS', centerX - 5, footerY + 1.5);

  // Tagline — subtle gray
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(5);
  pdf.setTextColor(156, 163, 175);
  pdf.text('Gestion d\'heures & facturation intelligente', centerX, footerY + 6, { align: 'center' });

  return pdf.output('blob');
}

/**
 * Download a PDF file.
 */
export function downloadPDF(blob: Blob, filename: string = 'facture.pdf') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Get the invoice HTML for email embedding.
 */
export function getInvoiceHTML(element: HTMLElement): string {
  return element.innerHTML;
}
