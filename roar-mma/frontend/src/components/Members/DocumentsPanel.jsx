import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useNotifications } from '../../contexts/NotificationContext';

export default function DocumentsPanel({ memberId }) {
  const queryClient = useQueryClient();
  const { error, success } = useNotifications();
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ doc_type: 'other', file_name: '', file_path: '', notes: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['member-documents', memberId],
    queryFn: async () => { const r = await api.get(`/api/waivers/documents/member/${memberId}`); return r.data; },
  });
  const documents = data?.documents || [];

  const uploadDoc = useMutation({
    mutationFn: (d) => api.post('/api/waivers/documents/upload', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['member-documents', memberId] }); setShowUpload(false); setUploadForm({ doc_type: 'other', file_name: '', file_path: '', notes: '' }); success('Document uploaded'); },
    onError: () => error('Failed to upload document'),
  });

  const deleteDoc = useMutation({
    mutationFn: (id) => api.delete(`/api/waivers/documents/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['member-documents', memberId] }); success('Document deleted'); },
    onError: () => error('Failed to delete document'),
  });

  const { data: waiversData } = useQuery({
    queryKey: ['member-waivers', memberId],
    queryFn: async () => { const r = await api.get(`/api/waivers/member/${memberId}`); return r.data; },
  });
  const waivers = waiversData?.waivers || [];

  const DOC_TYPE_LABELS = { waiver: 'Waiver', health: 'Health', insurance: 'Insurance', id: 'ID', other: 'Other' };

  function handleUpload(e) {
    e.preventDefault();
    if (!uploadForm.doc_type || !uploadForm.file_name) return;
    uploadDoc.mutate({ member_id: parseInt(memberId, 10), ...uploadForm });
  }

  return (
    <div>
      {/* Signed Waivers */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Signed Waivers</h3>
        {waivers.length === 0 ? (
          <p className="text-sm text-gray-500">No signed waivers.</p>
        ) : (
          <div className="space-y-2">
            {waivers.map(w => (
              <div key={w.id} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                <div>
                  <span className="text-sm font-medium text-green-800">{w.template_name}</span>
                  <span className="text-xs text-green-600 ml-2">Signed {new Date(w.signed_at).toLocaleDateString()}</span>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Signed</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Uploaded Documents */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Documents</h3>
        <button type="button" onClick={() => setShowUpload(v => !v)} className="text-xs text-red-600 hover:underline">{showUpload ? 'Cancel' : '+ Upload'}</button>
      </div>

      {showUpload && (
        <form onSubmit={handleUpload} className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select value={uploadForm.doc_type} onChange={(e) => setUploadForm(p => ({ ...p, doc_type: e.target.value }))} className="input text-sm w-full" aria-label="Document type">
                {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">File Name</label>
              <input type="text" value={uploadForm.file_name} onChange={(e) => setUploadForm(p => ({ ...p, file_name: e.target.value }))} className="input text-sm w-full" placeholder="e.g. insurance_card.pdf" aria-label="File name" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">File Path / URL</label>
            <input type="text" value={uploadForm.file_path} onChange={(e) => setUploadForm(p => ({ ...p, file_path: e.target.value }))} className="input text-sm w-full" placeholder="/uploads/docs/file.pdf" aria-label="File path" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input type="text" value={uploadForm.notes} onChange={(e) => setUploadForm(p => ({ ...p, notes: e.target.value }))} className="input text-sm w-full" aria-label="Notes" />
          </div>
          <button type="submit" disabled={!uploadForm.file_name} className="btn-primary text-sm">Upload</button>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading documents...</p>
      ) : documents.length === 0 ? (
        <p className="text-sm text-gray-500">No documents uploaded.</p>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => (
            <div key={doc.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-2">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex-shrink-0">{DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}</span>
                <div className="min-w-0">
                  <p className="text-sm text-gray-900 truncate">{doc.file_name}</p>
                  {doc.notes && <p className="text-xs text-gray-500 truncate">{doc.notes}</p>}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <span className="text-xs text-gray-400">{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                <button type="button" onClick={() => { if (confirm('Delete this document?')) deleteDoc.mutate(doc.id); }} className="text-xs text-red-500 hover:text-red-700 ml-2">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
