// Turns the on-screen A4 sheets (invoices, quotations, payslips) into a downloadable PDF.
// The libraries are loaded on demand so they do not slow down the first page load.
//
// A sheet is rendered once to a tall image, then cut into A4 pages: the header goes on the
// first page, the footer (with "Page x of y") at the bottom of EVERY page, and page breaks are
// only made between rows/blocks so nothing is sliced through the middle. A sheet marks its
// parts with data attributes:
//   data-pdf-header / data-pdf-body / data-pdf-footer  - the three regions
//   data-pdf-block   - a block that should not be split
//   data-pdf-keep    - never break right after this element (titles, table header row)
//   data-pdf-pagenum - where "Page x of y" is written
//   data-pdf-frame   - the on-screen page frame (hidden in the render; drawn per page instead)

const PAGE_WIDTH_PX = 794; // A4 at 96 dpi, the fixed width of every sheet
const PAGE_HEIGHT_PX = 1123;
const SCALE = 2;
const NEXT_PAGE_TOP_PX = 44; // space above the content on pages after the first
const FRAME_INSET_PX = 14;
const NAVY = '#0F1729';

async function renderToCanvas(element) {
  const { default: html2canvas } = await import('html2canvas');
  return html2canvas(element, {
    scale: SCALE,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    windowWidth: PAGE_WIDTH_PX,
    scrollX: 0,
    scrollY: 0,
    ignoreElements: (el) => !!(el.hasAttribute && el.hasAttribute('data-pdf-frame'))
  });
}

// Where the page breaks go for one rendered sheet (all values in CSS pixels from the sheet top).
export function planPages({ headerBottom, footerTop, footerHeight, breakPoints, tables = [] }) {
  const pages = [];
  let start = headerBottom;
  let first = true;

  while (start < footerTop - 1) {
    const base = first ? headerBottom : NEXT_PAGE_TOP_PX;
    // A page that starts inside a table repeats that table's column header row.
    const repeat = first ? null : tables.find(t => start > t.tableTop + 1 && start < t.tableBottom - 2) || null;
    const top = base + (repeat ? repeat.headHeight : 0);
    const available = PAGE_HEIGHT_PX - footerHeight - top;
    const limit = start + available;

    let end;
    // A small tolerance so a sheet that is exactly one page tall stays on one page.
    if (footerTop <= limit + 2) {
      end = footerTop;
    } else {
      const fitting = breakPoints.filter(b => b > start + 40 && b <= limit);
      end = fitting.length ? Math.max(...fitting) : limit;
    }
    pages.push({ start, end, top, base, repeat, first });
    start = end;
    first = false;
  }

  if (pages.length === 0) pages.push({ start: headerBottom, end: footerTop, top: headerBottom, first: true });
  return pages;
}

function measureSheet(wrapper) {
  const wrapperTop = wrapper.getBoundingClientRect().top;
  const rel = (el) => {
    const box = el.getBoundingClientRect();
    return { top: box.top - wrapperTop, bottom: box.bottom - wrapperTop };
  };

  const header = wrapper.querySelector('[data-pdf-header]');
  const footer = wrapper.querySelector('[data-pdf-footer]');
  const sheetHeight = wrapper.getBoundingClientRect().height;

  const headerBottom = header ? rel(header).bottom : 0;
  const footerTop = footer ? rel(footer).top : sheetHeight;
  const footerHeight = footer ? sheetHeight - footerTop : 0;

  const candidates = wrapper.querySelectorAll('[data-pdf-body] [data-pdf-block], [data-pdf-body] tr');
  const breakPoints = [];
  candidates.forEach(el => {
    if (el.hasAttribute('data-pdf-keep')) return;
    breakPoints.push(rel(el).bottom);
  });
  breakPoints.sort((a, b) => a - b);

  const tables = [];
  wrapper.querySelectorAll('[data-pdf-body] table').forEach(table => {
    const head = table.querySelector('thead');
    if (!head) return;
    const t = rel(table);
    const h = rel(head);
    tables.push({ tableTop: t.top, tableBottom: t.bottom, headTop: h.top, headBottom: h.bottom, headHeight: h.bottom - h.top });
  });

  return { headerBottom, footerTop, footerHeight, breakPoints, tables, sheetHeight };
}

// One canvas per A4 page for a sheet element.
export async function sheetToPageCanvases(wrapper) {
  const canvas = await renderToCanvas(wrapper);
  const metrics = measureSheet(wrapper);
  const pages = planPages(metrics);
  const px = (v) => Math.round(v * SCALE);
  const pageNumBox = wrapper.querySelector('[data-pdf-pagenum]');
  const pageNumRel = pageNumBox
    ? (() => {
        const wrapperBox = wrapper.getBoundingClientRect();
        const box = pageNumBox.getBoundingClientRect();
        return { right: box.right - wrapperBox.left, middle: (box.top + box.bottom) / 2 - wrapperBox.top - metrics.footerTop };
      })()
    : null;

  return pages.map((page, index) => {
    const out = document.createElement('canvas');
    out.width = canvas.width;
    out.height = px(PAGE_HEIGHT_PX);
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);

    if (page.first && metrics.headerBottom > 0) {
      ctx.drawImage(canvas, 0, 0, canvas.width, px(metrics.headerBottom), 0, 0, canvas.width, px(metrics.headerBottom));
    }
    if (page.repeat) {
      ctx.drawImage(
        canvas, 0, px(page.repeat.headTop), canvas.width, px(page.repeat.headHeight),
        0, px(page.base), canvas.width, px(page.repeat.headHeight)
      );
    }
    ctx.drawImage(
      canvas, 0, px(page.start), canvas.width, px(page.end - page.start),
      0, px(page.top), canvas.width, px(page.end - page.start)
    );
    if (metrics.footerHeight > 0) {
      ctx.drawImage(
        canvas, 0, px(metrics.footerTop), canvas.width, px(metrics.footerHeight),
        0, px(PAGE_HEIGHT_PX - metrics.footerHeight), canvas.width, px(metrics.footerHeight)
      );
    }

    // Page frame (the same double border the sheet shows on screen).
    // Sheets that mark themselves data-pdf-noframe (the half-page payslip) get no frame.
    if (!wrapper.querySelector('[data-pdf-noframe]')) {
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 1.5 * SCALE;
      ctx.strokeRect(px(FRAME_INSET_PX), px(FRAME_INSET_PX), out.width - px(FRAME_INSET_PX * 2), out.height - px(FRAME_INSET_PX * 2));
    }

    // "Page x of y" only matters when the document has more than one page.
    if (pages.length > 1 && pageNumRel) {
      ctx.fillStyle = NAVY;
      ctx.font = `${11 * SCALE}px 'Segoe UI', Arial, sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Page ${index + 1} of ${pages.length}`, px(pageNumRel.right), px(PAGE_HEIGHT_PX - metrics.footerHeight + pageNumRel.middle));
    }
    return out;
  });
}

// Each element becomes one or more A4 pages.
export async function buildPdf(elements) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  let firstPage = true;

  for (const element of elements) {
    const pageCanvases = await sheetToPageCanvases(element);
    for (const pageCanvas of pageCanvases) {
      if (!firstPage) pdf.addPage();
      firstPage = false;
      pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pageW, pageH, undefined, 'FAST');
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
