import { jsPDF } from 'jspdf';

export function generateWaiverPdf(waiverData, memberData) {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const margin = 20;
    const pw = 210;
    let y = margin;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ROAR MMA', pw / 2, y, { align: 'center' });
    y += 8;
    doc.text('WAIVER OF LIABILITY', pw / 2, y, { align: 'center' });
    y += 10;

    doc.setLineWidth(0.5);
    doc.line(margin, y, pw - margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Member: ${memberData.first_name || ''} ${memberData.last_name || ''}`, margin, y);
    y += 6;
    doc.text(`Email: ${memberData.email || 'N/A'}`, margin, y);
    y += 6;
    doc.text(`DOB: ${memberData.date_of_birth || 'N/A'}`, margin, y);
    y += 6;
    doc.text(`Signed: ${waiverData.signed_at || new Date().toISOString()}`, margin, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Waiver Text', margin, y);
    y += 6;
    doc.setLineWidth(0.3);
    doc.line(margin, y, pw - margin, y);
    y += 6;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const bodyLines = doc.splitTextToSize(waiverData.body_text || '', pw - 2 * margin);
    doc.text(bodyLines, margin, y);
    y += bodyLines.length * 5 + 10;

    if (y > 250) {
      doc.addPage();
      y = margin;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Signature', margin, y);
    y += 6;
    doc.setLineWidth(0.3);
    doc.line(margin, y, pw - margin, y);
    y += 4;

    if (waiverData.signature_data) {
      try {
        doc.addImage(waiverData.signature_data, 'PNG', margin, y, 80, 30);
        y += 34;
      } catch (e) {
        doc.setFontSize(10);
        doc.text('[Signature image unavailable]', margin, y + 5);
        y += 10;
      }
    }
    y += 6;

    y = Math.max(y, 270);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pw - margin, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('This is a legally binding document', pw / 2, y, { align: 'center' });

    return doc.output('blob');
  } catch (err) {
    console.error('PDF generation failed:', err);
    return null;
  }
}
