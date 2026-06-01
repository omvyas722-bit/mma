import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../lib/api';

function useDebounce(val, ms = 400) {
  const [debounced, setDebounced] = useState(val);
  useEffect(() => { const t = setTimeout(() => setDebounced(val), ms); return () => clearTimeout(t); }, [val, ms]);
  return debounced;
}

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

function StepMember({ onFound }) {
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query);
  const { data, isLoading } = useQuery({
    queryKey: ['kiosk-lookup', debounced],
    queryFn: () => api.get(`/api/waivers/kiosk/lookup?q=${encodeURIComponent(debounced)}`).then(r => r.data?.members || []),
    enabled: debounced.length >= 3,
  });

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome to Roar MMA</h2>
        <p className="text-gray-500">Find yourself to sign your waiver</p>
      </div>
      <div className="max-w-md mx-auto">
        <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name, phone, or email..." autoFocus
          className="input text-lg w-full text-center py-3" aria-label="Search members" />
      </div>
      {debounced.length >= 3 && (
        <div className="max-w-md mx-auto space-y-2">
          {isLoading && <div className="text-center text-gray-400 py-4 animate-pulse">Searching...</div>}
          {!isLoading && data?.length === 0 && <p className="text-center text-gray-400 py-4">No members found. Try a different search.</p>}
          {data?.map(m => (
            <button key={m.id} type="button" onClick={() => onFound(m)}
              className="w-full text-left p-4 border border-gray-200 rounded-xl hover:border-red-300 hover:bg-red-50 transition-colors">
              <p className="font-medium text-gray-900">{m.first_name} {m.last_name}</p>
              <p className="text-sm text-gray-500">{m.phone}{m.email ? ` · ${m.email}` : ''}{m.plan_name ? ` · ${m.plan_name}` : ''}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StepWaiver({ member, template, onSigned }) {
  const [signed, setSigned] = useState(false);
  const [guardianName, setGuardianName] = useState('');
  const [guardianRelation, setGuardianRelation] = useState('');

  const isMinor = member.date_of_birth && new Date(member.date_of_birth) > new Date(Date.now() - 18 * 365 * 86400000);

  const signMutation = useMutation({
    mutationFn: (data) => api.post('/api/waivers/kiosk/sign', data),
    onSuccess: () => onSigned(),
    onError: (err) => alert(err?.response?.data?.error || 'Signing failed'),
  });

  const handleSign = () => {
    if (!signed) { alert('Please provide your signature'); return; }
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const signatureData = canvas.toDataURL('image/png');
    signMutation.mutate({ member_id: member.id, template_id: template.id, signature_data: signatureData, guardian_name: isMinor ? guardianName : null, guardian_relation: isMinor ? guardianRelation : null });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Sign Waiver</h2>
        <p className="text-gray-500">{member.first_name} {member.last_name}{template ? ` · ${template.name}` : ''}</p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 max-h-60 overflow-y-auto">
        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{template?.body_text || 'Loading...'}</pre>
      </div>

      {isMinor && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-yellow-800">This member is under 18. A parent or guardian must sign.</p>
          <input type="text" value={guardianName} onChange={e => setGuardianName(e.target.value)} placeholder="Parent/Guardian Full Name" className="input text-sm w-full" />
          <select value={guardianRelation} onChange={e => setGuardianRelation(e.target.value)} className="input text-sm w-full" aria-label="Relationship">
            <option value="">Select relationship...</option>
            <option value="parent">Parent</option>
            <option value="guardian">Legal Guardian</option>
            <option value="grandparent">Grandparent</option>
            <option value="sibling">Sibling (18+)</option>
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Signature</label>
        <SignaturePad onChange={setSigned} />
        <p className="text-xs text-gray-400 mt-1">By signing above, you agree to the terms of this waiver.</p>
      </div>

      <button type="button" onClick={handleSign} disabled={!signed || signMutation.isPending || (isMinor && (!guardianName.trim() || !guardianRelation))}
        className="w-full bg-red-600 text-white py-3 rounded-xl text-lg font-medium hover:bg-red-700 disabled:opacity-40 transition-colors"
      >{signMutation.isPending ? 'Submitting...' : 'Sign & Submit'}</button>

      <p className="text-xs text-gray-400 text-center">A signed copy will be sent to your email or phone.</p>
    </div>
  );
}

function StepComplete({ member }) {
  return (
    <div className="text-center space-y-4 py-8">
      <div className="text-6xl">✅</div>
      <h2 className="text-2xl font-bold text-gray-900">Waiver Signed!</h2>
      <p className="text-gray-500">Thank you, <span className="font-medium text-gray-900">{member.first_name} {member.last_name}</span>.</p>
      <p className="text-sm text-gray-400">A copy has been queued for delivery to your email/phone.</p>
      <button type="button" onClick={() => window.location.reload()} className="bg-red-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-red-700 mt-4">Sign for Another Person</button>
    </div>
  );
}

export default function KioskWaiver() {
  const [step, setStep] = useState('member');
  const [member, setMember] = useState(null);
  const [template, setTemplate] = useState(null);

  const { data: templatesData } = useQuery({
    queryKey: ['kiosk-templates'],
    queryFn: () => api.get('/api/waivers/kiosk/templates').then(r => r.data?.templates || []),
  });

  const handleFound = (m) => {
    setMember(m);
    setTemplate(templatesData?.[0] || null);
    setStep('waiver');
  };

  const handleSigned = () => setStep('complete');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-6 sm:p-8">
          {step === 'member' && <StepMember onFound={handleFound} />}
          {step === 'waiver' && <StepWaiver member={member} template={template} onSigned={handleSigned} />}
          {step === 'complete' && <StepComplete member={member} />}
        </div>
      </div>
    </div>
  );
}
