import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileDown } from 'lucide-react';
import { downloadElementsAsPdf } from '../pdfExport';

// A "Download PDF" button. `sheets` are the full-size A4 sheets (React nodes) to export,
// one per page; they are rendered off-screen so the on-screen preview can stay scaled.
export default function PdfDownload({ sheets = [], filename, label = 'Download PDF', className = 'btn-secondary' }) {
  const hostRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (!hostRef.current) return;
    setBusy(true);
    try {
      await downloadElementsAsPdf(hostRef.current.children, filename);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Could not create the PDF. Try Print / Save as PDF instead.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className={className} onClick={handleClick} disabled={busy}>
        <FileDown size={15} /> {busy ? 'Creating PDF...' : label}
      </button>
      {createPortal(
        <div ref={hostRef} className="pdf-host" aria-hidden="true" style={{ position: 'fixed', left: '-10000px', top: 0, width: '794px' }}>
          {sheets.map((sheet, index) => <div key={index} style={{ width: '794px' }}>{sheet}</div>)}
        </div>,
        document.body
      )}
    </>
  );
}
