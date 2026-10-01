// Company identity and bank details printed on every quotation / invoice.
// Edit these values to change what appears on generated documents.
export const COMPANY_PROFILE = {
  name: 'Gloma International Pvt Ltd',
  addressLines: ['15/1/8, Mattegoda Junction, Pannipitya, Kottawa'],
  phone: '011 711 0174',
  email: 'info@glomaint.com',
  website: 'glomaint.com',
  // Optional: leave blank to hide the line on the document.
  vatNumber: '',
  bank: {
    method: 'Bank Deposit / Online Transfer',
    bankName: 'Sampath Bank',
    accountName: 'Gloma International Pvt Ltd',
    accountNumber: '105214039150',
    branch: 'Kottawa'
  },
  authorizedByTitle: 'Account Management Team'
};

export const DOC_TYPES = {
  Quotation: {
    prefix: 'QTN',
    heading: 'QUOTATION',
    numberLabel: 'QUOTATION NUMBER',
    totalLabel: 'Total Amount Due',
    defaultNotes:
      'This quotation is valid for 14 days from the date of issue. Any additional work, advertising spend or third-party costs outside the scope listed above will be discussed and approved separately.'
  },
  'Advance Invoice': {
    prefix: 'ADV',
    heading: 'ADVANCE INVOICE',
    numberLabel: 'INVOICE NUMBER',
    totalLabel: 'Advance Payment Due',
    defaultNotes:
      'This is an advance payment invoice. The advance received will be deducted from the final invoice for this project.'
  },
  Invoice: {
    prefix: 'INV',
    heading: 'INVOICE',
    numberLabel: 'INVOICE NUMBER',
    totalLabel: 'Total Amount Due',
    defaultNotes: 'Thank you for your business. Please settle the balance by the due date shown above.'
  }
};

export const DOC_STATUSES = ['Draft', 'Sent', 'Paid', 'Cancelled'];

const pad = (n, width) => String(n).padStart(width, '0');

// Next sequential number for a document type and year, e.g. QTN-2026-003.
export function nextDocNumber(docType, existingDocs = [], date = new Date()) {
  const prefix = (DOC_TYPES[docType] || DOC_TYPES.Invoice).prefix;
  const year = date.getFullYear();
  const stem = `${prefix}-${year}-`;
  const highest = existingDocs.reduce((max, doc) => {
    if (!doc.doc_number || !doc.doc_number.startsWith(stem)) return max;
    const seq = parseInt(doc.doc_number.slice(stem.length), 10);
    return Number.isFinite(seq) ? Math.max(max, seq) : max;
  }, 0);
  return `${stem}${pad(highest + 1, 3)}`;
}

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export function lineAmount(item) {
  return round2((Number(item.qty) || 0) * (Number(item.unit_price) || 0));
}

// Totals shown at the bottom of a document. Discount is a flat amount taken off
// the subtotal before VAT; any advance already received is deducted last.
export function calcTotals({ items = [], discount = 0, tax_rate = 0, advance_paid = 0 }) {
  const subtotal = round2(items.reduce((sum, item) => sum + lineAmount(item), 0));
  const discountAmount = Math.min(round2(Number(discount) || 0), subtotal);
  const taxable = round2(subtotal - discountAmount);
  const taxAmount = round2(taxable * ((Number(tax_rate) || 0) / 100));
  const total = round2(taxable + taxAmount);
  const advance = Math.min(round2(Number(advance_paid) || 0), total);
  const balance = round2(total - advance);
  return { subtotal, discountAmount, taxAmount, total, advance, balance };
}

export function formatMoney(value) {
  return (Number(value) || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

const ONES = [
  'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const SCALES = [
  [1e9, 'Billion'],
  [1e6, 'Million'],
  [1e3, 'Thousand']
];

function belowThousandInWords(n) {
  const parts = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest) {
    if (rest < 20) {
      parts.push(ONES[rest]);
    } else {
      const unit = rest % 10;
      parts.push(unit ? `${TENS[Math.floor(rest / 10)]} ${ONES[unit]}` : TENS[Math.floor(rest / 10)]);
    }
  }
  return parts.join(' ');
}

function integerInWords(n) {
  if (n === 0) return 'Zero';
  const parts = [];
  let remaining = n;
  for (const [size, label] of SCALES) {
    if (remaining >= size) {
      parts.push(`${belowThousandInWords(Math.floor(remaining / size))} ${label}`);
      remaining %= size;
    }
  }
  if (remaining) parts.push(belowThousandInWords(remaining));
  return parts.join(' ');
}

// 35000 -> "Rupees Thirty Five Thousand Only", 1250.5 -> "... and Fifty Cents Only"
export function amountInWords(amount) {
  const value = round2(Math.max(0, Number(amount) || 0));
  const rupees = Math.floor(value);
  const cents = Math.round((value - rupees) * 100);
  let words = `Rupees ${integerInWords(rupees)}`;
  if (cents) words += ` and ${integerInWords(cents)} Cents`;
  return `${words} Only`;
}

export function formatLongDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(`${String(dateStr).substring(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
