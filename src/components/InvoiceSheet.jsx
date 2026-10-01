import React from 'react';
import {
  COMPANY_PROFILE,
  DOC_TYPES,
  calcTotals,
  lineAmount,
  formatMoney,
  amountInWords,
  formatLongDate
} from '../invoiceUtils';

// Print-ready A4 layout for quotations and invoices. Uses fixed colours (not the
// app theme variables) so the printed/PDF output looks the same in light and dark mode.
const COLORS = {
  navy: '#0F1729',
  gold: '#C9A877',
  goldSoft: '#F5EFE3',
  border: '#D5DEE9',
  label: '#4A5568',
  text: '#111827',
  muted: '#52606D',
  panel: '#F8FAFC'
};

const bulletise = (line) => (/^\s*[-*]\s+/.test(line) ? line.replace(/^\s*[-*]\s+/, '• ') : line);

export default function InvoiceSheet({ doc }) {
  const typeConfig = DOC_TYPES[doc.doc_type] || DOC_TYPES.Invoice;
  const items = Array.isArray(doc.items) ? doc.items : [];
  const totals = calcTotals(doc);
  const showQtyColumns = items.some(item => Number(item.qty) !== 1);
  const isQuotation = doc.doc_type === 'Quotation';
  const bank = COMPANY_PROFILE.bank;
  const hasAdvanceRow = totals.advance > 0;
  const showBreakdown = totals.discountAmount > 0 || totals.taxAmount > 0 || hasAdvanceRow;

  return (
    <div className="invoice-sheet" style={s.sheet}>
      <div style={s.header}>
        <div style={s.logoBox}>
          <img src="/logo.png" alt="Gloma" style={s.logo} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={s.heading}>{typeConfig.heading}</div>
          {doc.service_title && <div style={s.headerSub}>{doc.service_title}</div>}
          <div style={s.headerNumber}>{doc.doc_number}</div>
        </div>
      </div>
      <div style={s.goldBar} />

      <div style={s.body}>
        <div style={s.metaTable}>
          <div style={s.metaCell}>
            <div style={s.metaLabel}>{typeConfig.numberLabel}</div>
            <div>{doc.doc_number}</div>
          </div>
          <div style={s.metaCell}>
            <div style={s.metaLabel}>DATE</div>
            <div>{formatLongDate(doc.issue_date)}</div>
          </div>
          {!isQuotation && doc.due_date && (
            <div style={s.metaCell}>
              <div style={s.metaLabel}>DUE DATE</div>
              <div>{formatLongDate(doc.due_date)}</div>
            </div>
          )}
          {doc.service_period && (
            <div style={{ ...s.metaCell, borderRight: 'none' }}>
              <div style={s.metaLabel}>SERVICE PERIOD</div>
              <div>{doc.service_period}</div>
            </div>
          )}
        </div>

        <div style={s.partiesRow}>
          <div style={s.partyCol}>
            <div style={s.partyHeader}>ISSUED BY</div>
            <div style={s.partyBody}>
              <div>{COMPANY_PROFILE.name}</div>
              {COMPANY_PROFILE.addressLines.map(line => <div key={line}>{line}</div>)}
              <div>Phone: {COMPANY_PROFILE.phone}</div>
              <div>Email: {COMPANY_PROFILE.email}</div>
              {COMPANY_PROFILE.vatNumber && <div>VAT No: {COMPANY_PROFILE.vatNumber}</div>}
            </div>
          </div>
          <div style={{ ...s.partyCol, borderLeft: `1px solid ${COLORS.navy}` }}>
            <div style={s.partyHeader}>ISSUED TO</div>
            <div style={s.partyBody}>
              <div style={{ fontWeight: 600 }}>{doc.client_name || '-'}</div>
              {doc.client_address && <div style={{ whiteSpace: 'pre-line' }}>{doc.client_address}</div>}
              {doc.client_contact_person && <div>Attn: {doc.client_contact_person}</div>}
              {doc.client_contact && <div>{doc.client_contact}</div>}
            </div>
          </div>
        </div>

        <div style={s.sectionTitle}>PRICING &amp; PACKAGE STRUCTURE</div>
        <table style={s.itemsTable}>
          <thead>
            <tr>
              <th style={{ ...s.th, textAlign: 'center' }}>DESCRIPTION</th>
              {showQtyColumns && <th style={{ ...s.th, width: '60px' }}>QTY</th>}
              {showQtyColumns && <th style={{ ...s.th, width: '110px' }}>UNIT PRICE</th>}
              <th style={{ ...s.th, width: '150px' }}>AMOUNT (LKR)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td style={s.td}>
                  <div>{item.description}</div>
                  {(item.details || '').split('\n').filter(l => l.trim()).map((line, i) => (
                    <div key={i} style={s.detailLine}>{bulletise(line)}</div>
                  ))}
                </td>
                {showQtyColumns && <td style={{ ...s.td, textAlign: 'center' }}>{Number(item.qty) || 0}</td>}
                {showQtyColumns && <td style={{ ...s.td, textAlign: 'right' }}>{formatMoney(item.unit_price)}</td>}
                <td style={{ ...s.td, textAlign: 'center', fontWeight: 700 }}>{formatMoney(lineAmount(item))}</td>
              </tr>
            ))}

            {showBreakdown && (
              <tr>
                <td style={{ ...s.td, textAlign: 'right' }} colSpan={showQtyColumns ? 3 : 1}>Subtotal</td>
                <td style={{ ...s.td, textAlign: 'center' }}>{formatMoney(totals.subtotal)}</td>
              </tr>
            )}
            {totals.discountAmount > 0 && (
              <tr>
                <td style={{ ...s.td, textAlign: 'right' }} colSpan={showQtyColumns ? 3 : 1}>Discount</td>
                <td style={{ ...s.td, textAlign: 'center' }}>- {formatMoney(totals.discountAmount)}</td>
              </tr>
            )}
            {totals.taxAmount > 0 && (
              <tr>
                <td style={{ ...s.td, textAlign: 'right' }} colSpan={showQtyColumns ? 3 : 1}>VAT ({Number(doc.tax_rate)}%)</td>
                <td style={{ ...s.td, textAlign: 'center' }}>{formatMoney(totals.taxAmount)}</td>
              </tr>
            )}

            <tr style={{ backgroundColor: COLORS.goldSoft }}>
              <td style={{ ...s.td, fontWeight: 700, borderBottom: `1.5px solid ${COLORS.navy}` }} colSpan={showQtyColumns ? 3 : 1}>
                {typeConfig.totalLabel}
              </td>
              <td style={{ ...s.td, textAlign: 'center', fontWeight: 700, borderBottom: `1.5px solid ${COLORS.navy}` }}>
                {formatMoney(totals.total)}
              </td>
            </tr>

            {hasAdvanceRow && (
              <>
                <tr>
                  <td style={{ ...s.td, textAlign: 'right' }} colSpan={showQtyColumns ? 3 : 1}>Less: Advance received</td>
                  <td style={{ ...s.td, textAlign: 'center' }}>- {formatMoney(totals.advance)}</td>
                </tr>
                <tr style={{ backgroundColor: COLORS.goldSoft }}>
                  <td style={{ ...s.td, fontWeight: 700, borderBottom: `1.5px solid ${COLORS.navy}` }} colSpan={showQtyColumns ? 3 : 1}>
                    Balance Due
                  </td>
                  <td style={{ ...s.td, textAlign: 'center', fontWeight: 700, borderBottom: `1.5px solid ${COLORS.navy}` }}>
                    {formatMoney(totals.balance)}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>

        <div style={s.wordsBox}>
          Amount in Words: {amountInWords(hasAdvanceRow ? totals.balance : totals.total)}
        </div>

        <div style={s.sectionTitle}>PAYMENT METHOD &amp; BANK DETAILS</div>
        <table style={s.bankTable}>
          <tbody>
            {[
              ['Payment Method', bank.method],
              ['Bank Name', bank.bankName],
              ['Account Name', bank.accountName],
              ['Account Number', bank.accountNumber],
              ['Branch', bank.branch]
            ].map(([label, value], idx) => (
              <tr key={label} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : COLORS.panel }}>
                <td style={s.bankLabel}>{label}</td>
                <td style={s.bankValue}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {doc.notes && (
          <div style={s.noteBox}>
            {doc.notes.split('\n').map((line, i) => <div key={i}>{line}</div>)}
          </div>
        )}

        <div style={s.signRow}>
          <div style={s.signCol}>
            <div>Authorized By</div>
            <div>{COMPANY_PROFILE.authorizedByTitle}</div>
            <div>{COMPANY_PROFILE.name}</div>
          </div>
          <div style={{ ...s.signCol, borderLeft: `1px solid ${COLORS.border}` }}>
            <div>Client Approval</div>
            <div>Name: ___________________________</div>
            <div style={{ marginTop: '4px' }}>Signature: ________________________</div>
          </div>
        </div>
      </div>

      <div style={s.footer}>
        <span>{COMPANY_PROFILE.name} &nbsp;|&nbsp; {COMPANY_PROFILE.website} &nbsp;|&nbsp; {COMPANY_PROFILE.email}</span>
        <span>{doc.doc_number}</span>
      </div>
    </div>
  );
}

const s = {
  sheet: {
    width: '794px',
    minHeight: '1123px',
    backgroundColor: '#FFFFFF',
    color: COLORS.text,
    fontFamily: "'Segoe UI', 'DejaVu Sans', Arial, sans-serif",
    fontSize: '13px',
    lineHeight: 1.45,
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    WebkitPrintColorAdjust: 'exact',
    printColorAdjust: 'exact'
  },
  header: {
    backgroundColor: COLORS.navy,
    padding: '34px 56px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logoBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: '14px',
    padding: '8px 16px',
    width: '170px',
    height: '82px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  logo: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' },
  heading: { color: '#FFFFFF', fontSize: '34px', fontWeight: 800, letterSpacing: '1px', lineHeight: 1.1 },
  headerSub: { color: '#D8DEE9', fontSize: '13px', marginTop: '10px' },
  headerNumber: { color: COLORS.gold, fontWeight: 700, fontSize: '13px', marginTop: '8px' },
  goldBar: { height: '5px', backgroundColor: COLORS.gold },
  body: { padding: '28px 56px 20px', flex: 1 },
  metaTable: {
    display: 'flex',
    border: `1px solid ${COLORS.border}`,
    marginBottom: '20px'
  },
  metaCell: {
    flex: 1,
    padding: '9px 12px',
    borderRight: `1px solid ${COLORS.border}`
  },
  metaLabel: { fontSize: '10.5px', fontWeight: 700, color: COLORS.label, letterSpacing: '0.4px', marginBottom: '4px' },
  partiesRow: { display: 'flex', border: `1px solid ${COLORS.navy}`, marginBottom: '16px' },
  partyCol: { flex: 1 },
  partyHeader: {
    backgroundColor: COLORS.navy,
    color: '#8E9AAF',
    fontSize: '10.5px',
    fontWeight: 700,
    letterSpacing: '0.4px',
    padding: '9px 12px'
  },
  partyBody: { padding: '10px 12px', minHeight: '82px' },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: 800,
    color: COLORS.navy,
    margin: '14px 0 8px',
    letterSpacing: '0.2px'
  },
  itemsTable: { width: '100%', borderCollapse: 'collapse' },
  th: {
    backgroundColor: COLORS.navy,
    color: '#FFFFFF',
    fontSize: '11.5px',
    fontWeight: 700,
    padding: '11px 12px',
    textAlign: 'center',
    border: `1px solid ${COLORS.navy}`
  },
  td: {
    padding: '10px 12px',
    border: `1px solid ${COLORS.border}`,
    verticalAlign: 'middle'
  },
  detailLine: { color: COLORS.muted, fontSize: '12px' },
  wordsBox: {
    border: `1px solid ${COLORS.border}`,
    backgroundColor: COLORS.panel,
    padding: '10px 12px',
    margin: '14px 0 6px'
  },
  bankTable: { width: '100%', borderCollapse: 'collapse', border: `1px solid ${COLORS.border}` },
  bankLabel: { padding: '8px 12px', fontWeight: 700, width: '28%', borderBottom: `1px solid ${COLORS.border}`, borderRight: `1px solid ${COLORS.border}` },
  bankValue: { padding: '8px 12px', borderBottom: `1px solid ${COLORS.border}` },
  noteBox: {
    marginTop: '16px',
    padding: '10px 12px',
    backgroundColor: COLORS.goldSoft,
    border: `1px solid ${COLORS.gold}`,
    color: COLORS.muted,
    fontSize: '11.5px'
  },
  signRow: { display: 'flex', border: `1px solid ${COLORS.border}`, marginTop: '16px' },
  signCol: { flex: 1, padding: '12px', minHeight: '70px' },
  footer: {
    backgroundColor: COLORS.navy,
    color: '#FFFFFF',
    fontSize: '11px',
    padding: '18px 56px',
    display: 'flex',
    justifyContent: 'space-between'
  }
};
