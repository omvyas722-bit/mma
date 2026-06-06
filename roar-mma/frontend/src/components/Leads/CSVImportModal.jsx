import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useNotifications } from '../../contexts/NotificationContext';

function parseCSV(text) {
  const lines = [];
  let current = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',' || ch === '\t') { current.push(field.trim()); field = ''; }
      else if (ch === '\n' || (ch === '\r' && next === '\n')) { current.push(field.trim()); if (current.length > 0 && current.some(f => f)) lines.push(current); current = []; field = ''; if (ch === '\r') i++; }
      else if (ch === '\r') { current.push(field.trim()); if (current.length > 0 && current.some(f => f)) lines.push(current); current = []; field = ''; }
      else { field += ch; }
    }
  }
  if (field.trim() || current.length > 0) { current.push(field.trim()); if (current.some(f => f)) lines.push(current); }
  return lines;
}

export default function CSVImportModal({ isOpen, onClose }) {
  const [step, setStep] = useState('upload');
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [fieldMapping, setFieldMapping] = useState({});
  const [preview, setPreview] = useState([]);
  const fileRef = useRef(null);
  const queryClient = useQueryClient();
  const { success, error } = useNotifications();

  const importMutation = useMutation({
    mutationFn: (leads) => api.post('/api/leads/import', { leads }),
    onSuccess: (res) => { queryClient.invalidateQueries({ queryKey: ['leads'] }); success(`Imported ${res.data.imported} leads${res.data.errors?.length ? ` (${res.data.errors.length} errors)` : ''}`); setStep('upload'); setRows([]); setHeaders([]); onClose(); },
    onError: (err) => error(err?.response?.data?.error || 'Import failed'),
  });

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target.result;
        const parsed = parseCSV(text);
        if (parsed.length < 2) { error('CSV must have a header row and at least one data row'); return; }
      const hdrs = parsed[0];
      const data = parsed.slice(1);
      setHeaders(hdrs);
      setRows(data);
      setPreview(data.slice(0, 5));
      const autoMap = {};
      const known = { firstname: 'first_name', first: 'first_name', givenname: 'first_name', lastname: 'last_name', last: 'last_name', surname: 'last_name', given_name: 'first_name', family_name: 'last_name', fname: 'first_name', lname: 'last_name', e: 'email', e_mail: 'email', email_address: 'email', phone: 'phone', telephone: 'phone', mobile: 'phone', tel: 'phone', cell: 'phone', source: 'source', lead_source: 'source', notes: 'notes', comment: 'notes', interest: 'interest_level', stage: 'stage', status: 'stage', location: 'location', branch: 'location' };
      hdrs.forEach(h => { const key = h.replace(/['"]/g, '').trim().toLowerCase(); autoMap[h] = known[key] || ''; });
      setFieldMapping(autoMap);
      setStep('map');
      } catch (e) { error('Failed to parse CSV file: ' + (e.message || 'Invalid format')); }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    const leads = rows.map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        const target = fieldMapping[h];
        if (target && row[i] && row[i].trim()) obj[target] = row[i].trim();
      });
      return obj;
    });
    importMutation.mutate(leads);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="csv-import-title">
        <h2 id="csv-import-title" className="text-lg font-semibold text-gray-900 mb-4">Import Leads from CSV</h2>

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-red-300 transition-colors cursor-pointer" onClick={() => fileRef.current?.click()}>
              <p className="text-gray-500 mb-2">Upload a CSV file</p>
              <p className="text-xs text-gray-400">The first row should contain column headers (name, email, phone, source, etc.)</p>
              <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" onChange={handleFile} className="hidden" />
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-700 mb-1">Required: at least one of first_name, email, or phone</p>
              <p className="text-xs text-gray-500">Optional: last_name, source, notes, interest_level, location, stage</p>
            </div>
          </div>
        )}

        {step === 'map' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{rows.length} rows found. Map CSV columns to lead fields:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                  <th className="px-3 py-2">CSV Column</th>
                  <th className="px-3 py-2">Maps To</th>
                  <th className="px-3 py-2">Preview (first row)</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {headers.map((h, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-900">{h}</td>
                      <td className="px-3 py-2">
                        <select value={fieldMapping[h]} onChange={e => setFieldMapping(prev => ({ ...prev, [h]: e.target.value }))} className="input text-xs py-1" aria-label={`Map ${h}`}>
                          <option value="">Skip</option>
                          <option value="first_name">First Name</option>
                          <option value="last_name">Last Name</option>
                          <option value="email">Email</option>
                          <option value="phone">Phone</option>
                          <option value="source">Source</option>
                          <option value="notes">Notes</option>
                          <option value="interest_level">Interest Level</option>
                          <option value="location">Location</option>
                          <option value="stage">Stage/Status</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 text-gray-500">{rows[0]?.[i]?.substring(0, 40) || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {preview.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Preview ({preview.length} rows):</p>
                <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">{JSON.stringify(preview.map(r => { const o = {}; headers.forEach((h, i) => { const t = fieldMapping[h]; if (t) o[t] = r[i]; }); return o; }), null, 2)}</pre>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setStep('upload')} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Back</button>
              <button type="button" onClick={handleImport} disabled={importMutation.isPending} className="bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-40">
                {importMutation.isPending ? 'Importing...' : `Import ${rows.length} Leads`}
              </button>
            </div>

            {importMutation.isError && <p className="text-sm text-red-600">Import failed. See console for details.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
