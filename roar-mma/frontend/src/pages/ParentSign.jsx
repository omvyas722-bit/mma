import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../lib/api';

function SignaturePad({ onChange }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;
  }, []);

  const getPos = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (e.touches) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const startDrawing = useCallback((e) => {
    e.preventDefault();
    const ctx = ctxRef.current; if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    onChange?.(true);
  }, [getPos, onChange]);

  const draw = useCallback((e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = ctxRef.current; if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y); ctx.stroke();
  }, [isDrawing, getPos]);

  const stopDrawing = useCallback(() => setIsDrawing(false), []);

  const clear = () => {
    const canvas = canvasRef.current; const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange?.(false);
  };

  return (
    <div className="border-2 border-gray-300 rounded-xl bg-white overflow-hidden touch-none">
      <canvas ref={canvasRef} className="w-full h-40 cursor-crosshair"
        onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
        onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
      <button type="button" onClick={clear} className="w-full text-center text-xs text-gray-500 py-1.5 hover:text-gray-700 bg-gray-50 border-t border-gray-200">Clear Signature</button>
    </div>
  );
}

export default function ParentSign() {
  const { token } = useParams();
  const [signed, setSigned] = useState(false);
  const [parentName, setParentName] = useState('');
  const [parentRelation, setParentRelation] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, error: fetchError } = useQuery({
    queryKey: ['parent-sign', token],
    queryFn: () => api.get(`/api/waivers/parent-sign/${token}`),
    enabled: !!token,
  });

  const signMutation = useMutation({
    mutationFn: (body) => api.post(`/api/waivers/parent-sign/${token}`, body),
    onSuccess: () => setSubmitted(true),
    onError: (err) => alert(err?.response?.data?.error || err?.error || 'Failed to sign waiver'),
  });

  const handleSign = () => {
    if (!signed) { alert('Please provide your signature'); return; }
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const signatureData = canvas.toDataURL('image/png');
    signMutation.mutate({ signature_data: signatureData, parent_name: parentName, parent_relation: parentRelation });
  };

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-gray-400 animate-pulse">Loading waiver...</div>
    </div>
  );

  if (fetchError || !data?.pending) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Link Invalid or Expired</h1>
        <p className="text-gray-500">This waiver signing link is no longer valid. Please contact ROAR MMA for a new link.</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full text-center">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Waiver Signed!</h1>
        <p className="text-gray-500">Thank you for signing the waiver for <span className="font-medium text-gray-900">{data.pending.first_name} {data.pending.last_name}</span>.</p>
        <p className="text-sm text-gray-400 mt-2">You can close this page.</p>
      </div>
    </div>
  );

  const pending = data?.pending;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-6 sm:p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Parent Waiver Signature</h1>
            <p className="text-gray-500">Signing for <span className="font-medium text-gray-900">{pending.first_name} {pending.last_name}</span></p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 max-h-60 overflow-y-auto">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{data.waiver_text}</pre>
          </div>

          <div className="space-y-3">
            <input type="text" value={parentName} onChange={e => setParentName(e.target.value)} placeholder="Your Full Name (Parent/Guardian)" className="input text-sm w-full" />
            <select value={parentRelation} onChange={e => setParentRelation(e.target.value)} className="input text-sm w-full" aria-label="Relationship">
              <option value="">Select relationship...</option>
              <option value="parent">Parent</option>
              <option value="guardian">Legal Guardian</option>
              <option value="grandparent">Grandparent</option>
              <option value="sibling">Sibling (18+)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Signature</label>
            <SignaturePad onChange={setSigned} />
            <p className="text-xs text-gray-400 mt-1">By signing above, you agree to the terms of this waiver.</p>
          </div>

          <button type="button" onClick={handleSign} disabled={!signed || signMutation.isPending || !parentName.trim()}
            className="w-full bg-red-600 text-white py-3 rounded-xl text-lg font-medium hover:bg-red-700 disabled:opacity-40 transition-colors"
          >{signMutation.isPending ? 'Submitting...' : 'Sign & Submit'}</button>
        </div>
      </div>
    </div>
  );
}
