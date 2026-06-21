import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateWaiverPdf } from './waiverPdf';

const mockDoc = vi.hoisted(() => ({
  setFontSize: vi.fn(),
  setFont: vi.fn(),
  text: vi.fn(),
  line: vi.fn(),
  setLineWidth: vi.fn(),
  splitTextToSize: vi.fn(() => ['line1', 'line2']),
  addPage: vi.fn(),
  addImage: vi.fn(),
  output: vi.fn(() => new Blob()),
}));

let throwOnConstruct = false;

vi.mock('jspdf', () => ({
  jsPDF: function() {
    if (throwOnConstruct) throw new Error('Constructor failed');
    return mockDoc;
  },
}));

describe('generateWaiverPdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates a PDF blob with valid data', () => {
    const result = generateWaiverPdf(
      { signed_at: '2025-01-15T10:00:00Z', body_text: 'Waiver body text', signature_data: 'data:image/png;base64,abc' },
      { first_name: 'John', last_name: 'Doe', email: 'john@test.com', date_of_birth: '1990-01-01' }
    );
    expect(result).toBeInstanceOf(Blob);
    expect(mockDoc.setFontSize).toHaveBeenCalled();
    expect(mockDoc.text).toHaveBeenCalledWith(expect.stringContaining('ROAR MMA'), expect.any(Number), expect.any(Number), expect.any(Object));
    expect(mockDoc.text).toHaveBeenCalledWith(expect.stringContaining('WAIVER OF LIABILITY'), expect.any(Number), expect.any(Number), expect.any(Object));
  });

  it('includes member name in PDF', () => {
    generateWaiverPdf(
      { signed_at: '2025-01-15T10:00:00Z', body_text: 'Body', signature_data: null },
      { first_name: 'Jane', last_name: 'Smith', email: 'jane@test.com', date_of_birth: '1985-05-10' }
    );
    expect(mockDoc.text).toHaveBeenCalledWith(expect.stringContaining('Jane'), expect.any(Number), expect.any(Number));
  });

  it('includes member email in PDF', () => {
    generateWaiverPdf(
      { signed_at: '2025-01-15T10:00:00Z', body_text: 'Body' },
      { first_name: 'John', last_name: 'Doe', email: 'john@test.com', date_of_birth: '1990-01-01' }
    );
    expect(mockDoc.text).toHaveBeenCalledWith(expect.stringContaining('john@test.com'), expect.any(Number), expect.any(Number));
  });

  it('handles missing member fields gracefully', () => {
    const result = generateWaiverPdf(
      { signed_at: '2025-01-15T10:00:00Z', body_text: 'Body' },
      {}
    );
    expect(result).toBeInstanceOf(Blob);
    expect(mockDoc.text).toHaveBeenCalledWith(expect.stringContaining('Member:'), expect.any(Number), expect.any(Number));
  });

  it('handles missing body_text', () => {
    generateWaiverPdf(
      { signed_at: '2025-01-15T10:00:00Z', body_text: '' },
      { first_name: 'John', last_name: 'Doe', email: 'john@test.com', date_of_birth: '1990-01-01' }
    );
    expect(mockDoc.splitTextToSize).toHaveBeenCalledWith('', expect.any(Number));
  });

  it('adds signature image when signature_data present', () => {
    generateWaiverPdf(
      { signed_at: '2025-01-15T10:00:00Z', body_text: 'Body', signature_data: 'data:image/png;base64,sig123' },
      { first_name: 'John', last_name: 'Doe', email: 'john@test.com', date_of_birth: '1990-01-01' }
    );
    expect(mockDoc.addImage).toHaveBeenCalledWith('data:image/png;base64,sig123', 'PNG', expect.any(Number), expect.any(Number), 80, 30);
  });

  it('shows placeholder when signature image fails to add', () => {
    mockDoc.addImage.mockImplementationOnce(() => { throw new Error('bad image'); });
    generateWaiverPdf(
      { signed_at: '2025-01-15T10:00:00Z', body_text: 'Body', signature_data: 'data:image/png;base64,bad' },
      { first_name: 'John', last_name: 'Doe', email: 'john@test.com', date_of_birth: '1990-01-01' }
    );
    expect(mockDoc.text).toHaveBeenCalledWith(expect.stringContaining('[Signature image unavailable]'), expect.any(Number), expect.any(Number));
  });

  it('output blob is called with correct format', () => {
    generateWaiverPdf(
      { signed_at: '2025-01-15T10:00:00Z', body_text: 'Body' },
      { first_name: 'John', last_name: 'Doe', email: 'john@test.com', date_of_birth: '1990-01-01' }
    );
    expect(mockDoc.output).toHaveBeenCalledWith('blob');
  });

  it('adds page when content overflows past y=250', () => {
    mockDoc.splitTextToSize.mockReturnValue(Array.from({ length: 50 }, (_, i) => `line${i}`));
    generateWaiverPdf(
      { signed_at: '2025-01-15T10:00:00Z', body_text: 'A'.repeat(500) },
      { first_name: 'John', last_name: 'Doe', email: 'john@test.com', date_of_birth: '1990-01-01' }
    );
    expect(mockDoc.addPage).toHaveBeenCalled();
  });

  it('returns null when generation throws', () => {
    throwOnConstruct = true;
    const result = generateWaiverPdf(
      { signed_at: '2025-01-15T10:00:00Z', body_text: 'Body' },
      { first_name: 'John', last_name: 'Doe' }
    );
    expect(result).toBeNull();
    throwOnConstruct = false;
  });

  it('uses current date when signed_at is missing', () => {
    generateWaiverPdf(
      { body_text: 'Body' },
      { first_name: 'John', last_name: 'Doe', email: 'john@test.com', date_of_birth: '1990-01-01' }
    );
    expect(mockDoc.text).toHaveBeenCalledWith(expect.stringContaining('Signed:'), expect.any(Number), expect.any(Number));
  });
});
