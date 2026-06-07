import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../../lib/api';

export default function SignWaiverModal({ template, onClose, onSigned, preselectedMemberId, isMinor, memberName }) {
  const [memberId, setMemberId] = useState(preselectedMemberId || '');
  const [guardianName, setGuardianName] = useState('');
  const [guardianRelation, setGuardianRelation] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;
  }, []);

  function startDrawing(e) {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasSignature(true);
  }

  function draw(e) {
    if (!isDrawing) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function stopDrawing() {
    setIsDrawing(false);
  }

  function getPos(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }

  const signMutation = useMutation({
    mutationFn: (data) => api.post('/api/waivers/sign', data),
    onSuccess: () => { onSigned(); },
    onError: () => { alert('Failed to sign waiver'); },
  });

  function handleSign() {
    if (!memberId || !hasSignature) return;
    const canvas = canvasRef.current;
    const signatureData = canvas.toDataURL('image/png');
    const payload = {
      member_id: parseInt(memberId, 10),
      template_id: template?.id,
      signature_data: signatureData,
    };
    if (isMinor || guardianName) {
      payload.guardian_name = guardianName;
      payload.guardian_relation = guardianRelation;
    }
    signMutation.mutate(payload);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="sign-title">
        <h2 id="sign-title" className="text-lg font-semibold text-gray-900 mb-4">Sign Waiver: {template?.name || 'Waiver'}</h2>

        {/* Waiver text */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 max-h-48 overflow-y-auto">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{template.body_text}</pre>
        </div>

        {/* Member info */}
        <div className="mb-4">
          {memberName ? (
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">Signing for: <strong>{memberName}</strong></div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Member ID</label>
              <input type="number" value={memberId} onChange={(e) => setMemberId(e.target.value)} className="input w-48" placeholder="Enter member ID" required aria-label="Member ID" />
            </div>
          )}
        </div>

        {/* Guardian info for minors */}
        {(isMinor || guardianName || guardianRelation) && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-3">
            <p className="text-sm font-medium text-yellow-800">Parent/Guardian Consent Required</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent/Guardian Name</label>
              <input type="text" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} className="input w-full" placeholder="Full name" aria-label="Parent name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
              <select value={guardianRelation} onChange={(e) => setGuardianRelation(e.target.value)} className="input w-full" aria-label="Relationship">
                <option value="">Select...</option>
                <option value="mother">Mother</option>
                <option value="father">Father</option>
                <option value="guardian">Legal Guardian</option>
                <option value="grandparent">Grandparent</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        )}

        {/* Signature canvas */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Signature</label>
          <div className="border-2 border-gray-300 rounded-lg bg-white">
            <canvas
              ref={canvasRef}
              className="w-full h-32 touch-none cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              aria-label="Signature canvas"
            />
          </div>
          <button type="button" onClick={clearCanvas} className="mt-1 text-xs text-gray-500 hover:text-gray-700 underline">Clear signature</button>
        </div>

        <p className="text-xs text-gray-500 mb-4">By signing above, you agree to the terms of this waiver.</p>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-outline text-sm">Cancel</button>
          <button type="button" onClick={handleSign} disabled={!memberId || !hasSignature || signMutation.isPending} className="btn-primary text-sm">
            {signMutation.isPending ? 'Signing...' : 'Sign Waiver'}
          </button>
        </div>
      </div>
    </div>
  );
}
