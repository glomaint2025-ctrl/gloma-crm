// Turns the Letters editor content into A4 pages, optionally on the Gloma letterhead
// (public/letterhead.jpg) on EVERY page. The text is rendered once to a tall image and cut
// into page-sized slices; cuts are only made between blocks (paragraphs, list items, table
// rows) so a line of text is never sliced in half.
//
// Geometry (CSS px at 96 dpi, A4 = 794 x 1123). The letterhead artwork has a header that ends
// at y = 149 and a navy footer band that starts at y = 1081.

export const PAGE_W = 794;
export const PAGE_H = 1123;
export const MARGIN_X = 64;
export const CONTENT_TOP = 165;
export const CONTENT_BOTTOM = 1065;
export const CONTENT_H = CONTENT_BOTTOM - CONTENT_TOP; // 900
export const CONTENT_W = PAGE_W - MARGIN_X * 2; // 666
// Without a letterhead, plain margins are used.
export const PLAIN_TOP = 72;
export const PLAIN_BOTTOM = PAGE_H - 72;

const SCALE = 2;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load the letterhead image.'));
    img.src = src;
  });
}

// Break candidates (bottom edges, px from the top of the content element).
function breakPoints(root) {
  const top = root.getBoundingClientRect().top;
  const points = [];
  root.querySelectorAll(':scope > *, li, tr').forEach(el => {
    points.push(el.getBoundingClientRect().bottom - top);
  });
  return points.sort((a, b) => a - b);
}

export function planLetterPages(totalHeight, points, pageHeight) {
  const pages = [];
  let start = 0;
  while (start < totalHeight - 1) {
    const limit = start + pageHeight;
    let end;
    if (totalHeight <= limit + 2) {
      end = totalHeight;
    } else {
      const fitting = points.filter(p => p > start + 40 && p <= limit);
      end = fitting.length ? Math.max(...fitting) : limit;
    }
    pages.push({ start, end });
    start = end;
  }
  if (pages.length === 0) pages.push({ start: 0, end: Math.max(totalHeight, 1) });
  return pages;
}

// `element` must be an off-screen, CONTENT_W px wide copy of the letter body.
// Returns one canvas per A4 page.
export async function letterToPageCanvases(element, { letterhead = true } = {}) {
  const { default: html2canvas } = await import('html2canvas');
  const rendered = await html2canvas(element, {
    scale: SCALE,
    backgroundColor: null,
    useCORS: true,
    logging: false,
    windowWidth: CONTENT_W,
    scrollX: 0,
    scrollY: 0
  });

  const totalHeight = element.getBoundingClientRect().height;
  const top = letterhead ? CONTENT_TOP : PLAIN_TOP;
  const pageContentHeight = (letterhead ? CONTENT_BOTTOM : PLAIN_BOTTOM) - top;
  const pages = planLetterPages(totalHeight, breakPoints(element), pageContentHeight);
  const bg = letterhead ? await loadImage('/letterhead.jpg') : null;
  const px = (v) => Math.round(v * SCALE);

  return pages.map(({ start, end }) => {
    const out = document.createElement('canvas');
    out.width = px(PAGE_W);
    out.height = px(PAGE_H);
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    if (bg) ctx.drawImage(bg, 0, 0, out.width, out.height);
    const sliceH = Math.min(end - start, rendered.height / SCALE - start);
    if (sliceH > 0) {
      ctx.drawImage(
        rendered, 0, px(start), rendered.width, px(sliceH),
        px(MARGIN_X), px(top), px(CONTENT_W), px(sliceH)
      );
    }
    return out;
  });
}

// Same as downloadLetterPdf, for an HTML string (used by the financial statements).
export async function downloadHtmlPdf(html, filename, options) {
  const el = document.createElement('div');
  el.className = 'letter-body';
  el.style.cssText = `position:fixed;left:-10000px;top:0;width:${CONTENT_W}px;background:transparent;font-family:Arial,sans-serif;font-size:13px;line-height:1.4;color:#111;`;
  el.innerHTML = `<style>.letter-body table{border-collapse:collapse;width:100%}.letter-body td,.letter-body th{border:1px solid #333;padding:5px 8px}</style>${html}`;
  document.body.appendChild(el);
  try {
    return await downloadLetterPdf(el, filename, options);
  } finally {
    el.remove();
  }
}

export async function downloadLetterPdf(element, filename, options) {
  const { jsPDF } = await import('jspdf');
  const canvases = await letterToPageCanvases(element, options);
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  const w = pdf.internal.pageSize.getWidth();
  const h = pdf.internal.pageSize.getHeight();
  canvases.forEach((canvas, i) => {
    if (i > 0) pdf.addPage();
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, w, h, undefined, 'FAST');
  });
  pdf.save(filename);
  return canvases.length;
}
