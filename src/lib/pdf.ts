'use client';

/**
 * Generate a PDF from a DOM element (the invoice preview).
 * Uses html2canvas to capture the element as an image, then
 * embeds it into a jsPDF document.
 */
export async function generateInvoicePDF(
  element: HTMLElement,
  filename: string = 'facture.pdf'
): Promise<Blob> {
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');

  // Capture the element as a canvas
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const imgWidth = 210; // A4 width mm
  const pageHeight = 297; // A4 height mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const pdf = new jsPDF('p', 'mm', 'a4');
  let heightLeft = imgHeight;
  let position = 0;

  // First page
  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  // Additional pages if needed
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

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
 * Extracts the invoice container's innerHTML for inline email.
 */
export function getInvoiceHTML(element: HTMLElement): string {
  return element.innerHTML;
}
