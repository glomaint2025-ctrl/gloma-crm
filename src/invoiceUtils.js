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

// Text printed on the invoice sheet. Every value can be overridden per document through
// `doc.custom` (edited in the "Customize printed text" panel). Overrides only affect the
// preview, print and PDF output; they are not saved to the database.
export const SHEET_TEXT_GROUPS = [
  {
    title: 'Heading & details',
    fields: [
      { key: 'heading', label: 'Document heading' },
      { key: 'numberLabel', label: 'Number label' },
      { key: 'dateLabel', label: 'Date label' },
      { key: 'dueLabel', label: 'Due date label' },
      { key: 'periodLabel', label: 'Service period label' }
    ]
  },
  {
    title: 'Parties',
    fields: [
      { key: 'issuedByTitle', label: '"Issued by" title' },
      { key: 'issuedBy', label: 'Issued by (company details)', multiline: true },
      { key: 'issuedToTitle', label: '"Issued to" title' }
    ]
  },
  {
    title: 'Pricing table',
    fields: [
      { key: 'pricingTitle', label: 'Section title' },
      { key: 'descHeader', label: 'Description column' },
      { key: 'qtyHeader', label: 'Qty column' },
      { key: 'unitHeader', label: 'Unit price column' },
      { key: 'amountHeader', label: 'Amount column' },
      { key: 'subtotalLabel', label: 'Subtotal label' },
      { key: 'discountLabel', label: 'Discount label' },
      { key: 'vatLabel', label: 'VAT label' },
      { key: 'totalLabel', label: 'Total label' },
      { key: 'advanceLabel', label: 'Advance label' },
      { key: 'balanceLabel', label: 'Balance label' },
      { key: 'wordsLabel', label: 'Amount in words label' },
      { key: 'wordsText', label: 'Amount in words text' }
    ]
  },
  {
    title: 'Bank details',
    fields: [
      { key: 'bankTitle', label: 'Section title' },
      { key: 'bankMethodLabel', label: 'Method label' },
      { key: 'bankMethod', label: 'Method' },
      { key: 'bankNameLabel', label: 'Bank name label' },
      { key: 'bankName', label: 'Bank name' },
      { key: 'bankAccountNameLabel', label: 'Account name label' },
      { key: 'bankAccountName', label: 'Account name' },
      { key: 'bankAccountNumberLabel', label: 'Account number label' },
      { key: 'bankAccountNumber', label: 'Account number' },
      { key: 'bankBranchLabel', label: 'Branch label' },
      { key: 'bankBranch', label: 'Branch' }
    ]
  },
  {
    title: 'Signatures & footer',
    fields: [
      { key: 'signLeft', label: 'Left signature block', multiline: true },
      { key: 'signRight', label: 'Right signature block', multiline: true },
      { key: 'footer', label: 'Footer text' }
    ]
  }
];

export const SHEET_TOGGLES = [
  { key: 'hideWords', label: 'Hide "Amount in words"' },
  { key: 'hideBank', label: 'Hide bank details' },
  { key: 'hideSignatures', label: 'Hide signature block' }
];

// Resolves every printed string for a document: the built-in default, or the override.
export function resolveSheetText(doc, useCustom = true) {
  const custom = (useCustom && doc.custom) || {};
  const typeConfig = DOC_TYPES[doc.doc_type] || DOC_TYPES.Invoice;
  const totals = calcTotals(doc);
  const bank = COMPANY_PROFILE.bank;
  const defaults = {
    heading: typeConfig.heading,
    numberLabel: typeConfig.numberLabel,
    dateLabel: 'DATE',
    dueLabel: 'DUE DATE',
    periodLabel: 'SERVICE PERIOD',
    issuedByTitle: 'ISSUED BY',
    issuedBy: [
      COMPANY_PROFILE.name,
      ...COMPANY_PROFILE.addressLines,
      `Phone: ${COMPANY_PROFILE.phone}`,
      `Email: ${COMPANY_PROFILE.email}`,
      COMPANY_PROFILE.vatNumber ? `VAT No: ${COMPANY_PROFILE.vatNumber}` : ''
    ].filter(Boolean).join('\n'),
    issuedToTitle: 'ISSUED TO',
    pricingTitle: 'PRICING & PACKAGE STRUCTURE',
    descHeader: 'DESCRIPTION',
    qtyHeader: 'QTY',
    unitHeader: 'UNIT PRICE',
    amountHeader: 'AMOUNT (LKR)',
    subtotalLabel: 'Subtotal',
    discountLabel: 'Discount',
    vatLabel: `VAT (${Number(doc.tax_rate) || 0}%)`,
    totalLabel: typeConfig.totalLabel,
    advanceLabel: 'Less: Advance received',
    balanceLabel: 'Balance Due',
    wordsLabel: 'Amount in Words:',
    wordsText: amountInWords(totals.advance > 0 ? totals.balance : totals.total),
    bankTitle: 'PAYMENT METHOD & BANK DETAILS',
    bankMethodLabel: 'Payment Method',
    bankMethod: bank.method,
    bankNameLabel: 'Bank Name',
    bankName: bank.bankName,
    bankAccountNameLabel: 'Account Name',
    bankAccountName: bank.accountName,
    bankAccountNumberLabel: 'Account Number',
    bankAccountNumber: bank.accountNumber,
    bankBranchLabel: 'Branch',
    bankBranch: bank.branch,
    signLeft: `Authorized By\n${COMPANY_PROFILE.authorizedByTitle}\n${COMPANY_PROFILE.name}`,
    signRight: 'Client Approval\nName: ___________________________\nSignature: ________________________',
    footer: `${COMPANY_PROFILE.name}  |  ${COMPANY_PROFILE.website}  |  ${COMPANY_PROFILE.email}  |  ${doc.doc_number}`
  };
  const text = {};
  for (const key of Object.keys(defaults)) {
    const override = custom[key];
    text[key] = typeof override === 'string' && override.trim() !== '' ? override : defaults[key];
  }
  return text;
}
