// Turns the on-screen A4 sheets (invoices, quotations, payslips) into a downloadable PDF.
// The libraries are loaded on demand so they do not slow down the first page load.

const PAGE_WIDTH_PX = 794; // A4 at 96 dpi, the fixed width of every sheet

async function renderToCanvas(element) {
  const { default: html2canvas } = await import('html2canvas');
  return html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    windowWidth: PAGE_WIDTH_PX,
    scrollX: 0,
    scrollY: 0
  });
}

// Each element becomes one or more A4 pages (a sheet taller than one page continues on the next).
export async function buildPdf(elements) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  let firstPage = true;

  for (const element of elements) {
    const canvas = await renderToCanvas(element);
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const imgH = (canvas.height * pageW) / canvas.width;
    const pages = Math.max(1, Math.ceil(imgH / pageH - 0.01));

    for (let page = 0; page < pages; page += 1) {
      if (!firstPage) pdf.addPage();
      firstPage = false;
      pdf.addImage(imgData, 'JPEG', 0, -page * pageH, pageW, imgH, undefined, 'FAST');
    }
  }
  return pdf;
}

export async function downloadElementsAsPdf(elements, filename) {
  const list = Array.from(elements).filter(Boolean);
  if (list.length === 0) throw new Error('Nothing to export.');
  const pdf = await buildPdf(list);
  pdf.save(filename);
}

// Safe file name from free text (document numbers, employee names).
export function pdfFileName(...parts) {
  const name = parts.filter(Boolean).join('-').replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');
  return `${name || 'document'}.pdf`;
}
