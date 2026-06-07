import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../lib/api';
import { generateWaiverPdf } from '../lib/waiverPdf';

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

function StepMember({ onFound, onGuest }) {
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query);
  const { data, isLoading } = useQuery({
    queryKey: ['kiosk-lookup', debounced],
    queryFn: () => api.get(`/api/waivers/kiosk/lookup?q=${encodeURIComponent(debounced)}`).then(r => r?.members || []),
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
      <div className="text-center pt-2">
        <button type="button" onClick={onGuest} className="text-sm text-red-600 hover:text-red-700 underline">New guest? Sign waiver as guest</button>
      </div>
    </div>
  );
}

function StepGuestInfo({ onContinue }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', email: '' });

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Guest Waiver</h2>
        <p className="text-gray-500">Enter your details to sign as a guest</p>
      </div>
      <div className="max-w-md mx-auto space-y-3">
        <input type="text" value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} placeholder="First Name *" className="input text-lg w-full" />
        <input type="text" value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} placeholder="Last Name *" className="input text-lg w-full" />
        <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="Phone *" className="input text-lg w-full" />
        <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Email (optional)" className="input text-lg w-full" />
      </div>
      <button type="button" onClick={() => onContinue(form)} disabled={!form.first_name || !form.last_name || !form.phone}
        className="w-full bg-red-600 text-white py-3 rounded-xl text-lg font-medium hover:bg-red-700 disabled:opacity-40 transition-colors">Continue to Waiver</button>
    </div>
  );
}

function StepWaiver({ member, template, templates, onSigned, onSelectTemplate, isGuest }) {
  const [signed, setSigned] = useState(false);
  const [guardianName, setGuardianName] = useState('');
  const [guardianRelation, setGuardianRelation] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('email');
  const [deliveryContact, setDeliveryContact] = useState(member.email || '');
  const signedDataRef = useRef(null);

  const isMinor = !isGuest && member.date_of_birth && new Date(member.date_of_birth) > new Date(Date.now() - 18 * 365 * 86400000);

  const signMutation = useMutation({
    mutationFn: isGuest
      ? (data) => api.post('/api/waivers/kiosk/guest-sign', data)
      : (data) => api.post('/api/waivers/kiosk/sign', data),
    onSuccess: (resp) => onSigned(signedDataRef.current, isGuest ? member : null),
    onError: (err) => alert(err?.response?.data?.error || err?.error || 'Signing failed'),
  });

  const handleSign = () => {
    if (!signed) { alert('Please provide your signature'); return; }
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const signatureData = canvas.toDataURL('image/png');
    signedDataRef.current = { member, template, signatureData, signedAt: new Date().toISOString() };
    if (isGuest) {
      signMutation.mutate({ first_name: member.first_name, last_name: member.last_name, phone: member.phone, email: member.email || undefined, template_id: template.id, signature_data: signatureData, delivery_method: deliveryMethod, delivery_contact: deliveryContact });
    } else {
      signMutation.mutate({ member_id: member.id, template_id: template.id, signature_data: signatureData, guardian_name: isMinor ? guardianName : null, guardian_relation: isMinor ? guardianRelation : null, delivery_method: deliveryMethod, delivery_contact: deliveryContact });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Sign Waiver</h2>
        <p className="text-gray-500">{member.first_name} {member.last_name} · {template?.name || ''}</p>
      </div>

      {templates?.length > 1 && (
        <div className="flex gap-2 justify-center">
          {templates.map(t => (
            <button key={t.id} type="button" onClick={() => onSelectTemplate(t)}
              className={`text-xs px-3 py-1.5 rounded-full border ${template?.id === t.id ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-300 hover:border-red-300'}`}>
              {t.name}
            </button>
          ))}
        </div>
      )}

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

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Preference</label>
        <div className="flex gap-3 mb-2">
          {['email', 'sms'].map(m => (
            <label key={m} className="flex items-center gap-1 text-sm cursor-pointer">
              <input type="radio" checked={deliveryMethod === m} onChange={() => { setDeliveryMethod(m); setDeliveryContact(m === 'email' ? member.email : member.phone); }} className="accent-red-600" />
              {m === 'email' ? 'Email' : 'SMS'}
            </label>
          ))}
        </div>
        <input type={deliveryMethod === 'email' ? 'email' : 'tel'} value={deliveryContact} onChange={e => setDeliveryContact(e.target.value)}
          className="input text-sm w-full" placeholder={deliveryMethod === 'email' ? 'Email address' : 'Phone number'} />
      </div>

      <button type="button" onClick={handleSign} disabled={!signed || signMutation.isPending || (isMinor && (!guardianName.trim() || !guardianRelation))}
        className="w-full bg-red-600 text-white py-3 rounded-xl text-lg font-medium hover:bg-red-700 disabled:opacity-40 transition-colors"
      >{signMutation.isPending ? 'Submitting...' : 'Sign & Submit'}</button>
    </div>
  );
}

function StepComplete({ member, downloadData, isGuest, leadMessage }) {
  function handleDownload() {
    if (!downloadData) return;
    const pdfBlob = generateWaiverPdf(
      { body_text: downloadData.template?.body_text, signature_data: downloadData.signatureData, signed_at: downloadData.signedAt },
      { first_name: downloadData.member?.first_name, last_name: downloadData.member?.last_name, email: downloadData.member?.email, date_of_birth: downloadData.member?.date_of_birth }
    );
    if (!pdfBlob) { alert('Failed to generate PDF'); return; }
    const url = window.URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = (downloadData.signedAt || '').split('T')[0] || 'unknown';
    a.download = `waiver-${downloadData.member?.first_name || ''}-${downloadData.member?.last_name || ''}-${dateStr}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="text-center space-y-4 py-8">
      <div className="text-6xl">✅</div>
      <h2 className="text-2xl font-bold text-gray-900">Waiver Signed!</h2>
      <p className="text-gray-500">Thank you, <span className="font-medium text-gray-900">{member.first_name} {member.last_name}</span>.</p>
      {leadMessage && <p className="text-sm text-green-600 font-medium">{leadMessage}</p>}
      <p className="text-sm text-gray-400">A copy has been queued for delivery to your email/phone.</p>
      <div className="flex gap-3 justify-center mt-4">
        <button type="button" onClick={handleDownload} className="btn-outline text-sm">Download PDF</button>
        <button type="button" onClick={() => window.location.reload()} className="bg-red-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-red-700">Sign for Another Person</button>
      </div>
    </div>
  );
}

function StepPinUnlock({ onCorrect, onBack }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const attemptsRef = useRef(parseInt(localStorage.getItem('kiosk_pin_attempts') || '0', 10));

  useEffect(() => {
    if (locked && lockTimer > 0) {
      const t = setInterval(() => {
        setLockTimer(prev => {
          if (prev <= 1) { clearInterval(t); setLocked(false); setError(''); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(t);
    }
  }, [locked, lockTimer]);

  const handleDigit = (d) => {
    if (locked || pin.length >= 4) return;
    const newPin = pin + d;
    setPin(newPin);
    if (newPin.length === 4) verifyPin(newPin);
  };

  const handleClear = () => { setPin(''); setError(''); };

  const verifyPin = async (enteredPin) => {
    try {
      const resp = await api.post('/api/waivers/kiosk/verify-pin', { pin: enteredPin });
      if (resp?.valid) {
        setPin('');
        setError('');
        localStorage.removeItem('kiosk_pin_attempts');
        onCorrect();
      } else {
        handleWrong();
      }
    } catch {
      handleWrong();
    }
  };

  const handleWrong = () => {
    attemptsRef.current += 1;
    localStorage.setItem('kiosk_pin_attempts', String(attemptsRef.current));
    setPin('');
    if (attemptsRef.current >= 3) {
      setLocked(true);
      setLockTimer(30);
      setError('Too many attempts. Locked for 30s.');
      setTimeout(() => { attemptsRef.current = 0; localStorage.removeItem('kiosk_pin_attempts'); }, 30000);
    } else {
      setError(`Wrong PIN. ${3 - attemptsRef.current} attempts remaining.`);
    }
  };

  const digits = [['1','2','3'],['4','5','6'],['7','8','9'],['clear','0','back']];

  return (
    <div className="space-y-4 text-center">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Staff Unlock</h2>
      <p className="text-gray-500">Staff: enter PIN to end kiosk mode</p>

      <div className="flex justify-center gap-2 my-4">
        {[0,1,2,3].map(i => (
          <div key={i} className={`w-4 h-4 rounded-full border-2 ${pin.length > i ? 'bg-red-600 border-red-600' : 'border-gray-300'}`} />
        ))}
      </div>

      {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
      {locked && <p className="text-sm text-orange-600 font-medium">Locked for {lockTimer}s</p>}

      <div className="max-w-xs mx-auto">
        {digits.map((row, ri) => (
          <div key={ri} className="flex gap-2 mb-2">
            {row.map(d => (
              <button key={d} type="button" onClick={() => { if (d === 'clear') handleClear(); else if (d === 'back') { setPin(p => p.slice(0, -1)); setError(''); } else handleDigit(d); }}
                disabled={locked}
                className={`flex-1 py-4 text-xl font-bold rounded-xl transition-colors ${locked ? 'bg-gray-100 text-gray-300' : d === 'clear' || d === 'back' ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-white border-2 border-gray-200 text-gray-900 hover:border-red-300 hover:bg-red-50'}`}
              >{d === 'clear' ? 'C' : d === 'back' ? '⌫' : d}</button>
            ))}
          </div>
        ))}
      </div>

      <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 underline">Back to start</button>
    </div>
  );
}

function StepKioskEnded({ onRestart }) {
  return (
    <div className="text-center space-y-4 py-8">
      <div className="text-6xl">🔒</div>
      <h2 className="text-2xl font-bold text-gray-900">Kiosk Mode Ended</h2>
      <p className="text-gray-500">The kiosk has been locked. A staff member can unlock it to start again.</p>
      <div className="flex gap-3 justify-center mt-4">
        <button type="button" onClick={onRestart} className="bg-red-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-red-700">Start New Waiver</button>
        <button type="button" onClick={() => window.location.href = '/dashboard'} className="btn-outline text-sm">Exit to Dashboard</button>
      </div>
    </div>
  );
}

export default function KioskWaiver() {
  const [step, setStep] = useState('member');
  const [member, setMember] = useState(null);
  const [template, setTemplate] = useState(null);
  const [downloadData, setDownloadData] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [leadMessage, setLeadMessage] = useState('');

  const { data: templatesData } = useQuery({
    queryKey: ['kiosk-templates'],
    queryFn: () => api.get('/api/waivers/kiosk/templates').then(r => r?.templates || []),
  });

  const handleFound = (m) => {
    setMember(m);
    setIsGuest(false);
    setTemplate(templatesData?.[0] || null);
    setStep('waiver');
  };

  const handleGuest = () => {
    setStep('guest-info');
  };

  const handleGuestContinue = (guestData) => {
    // Create a temporary member-like object with a negative ID
    const guestMember = { ...guestData, id: -Date.now(), date_of_birth: null };
    setMember(guestMember);
    setIsGuest(true);
    setTemplate(templatesData?.[0] || null);
    setStep('waiver');
  };

  const handleSigned = async (data, guestData) => {
    setDownloadData(data);
    if (guestData) setLeadMessage("You've been added to our leads list");
    setStep('complete');
  };

  const handleSelectTemplate = (t) => setTemplate(t);

  const handlePinCorrect = () => {
    setStep('kiosk-ended');
  };

  const handlePinBack = () => {
    setStep('member');
  };

  const handleRestart = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-6 sm:p-8">
          {step === 'member' && <StepMember onFound={handleFound} onGuest={handleGuest} />}
          {step === 'guest-info' && <StepGuestInfo onContinue={handleGuestContinue} />}
          {step === 'waiver' && <StepWaiver member={member} template={template} templates={templatesData} onSigned={handleSigned} onSelectTemplate={handleSelectTemplate} isGuest={isGuest} />}
          {step === 'complete' && <StepComplete member={member} downloadData={downloadData} isGuest={isGuest} leadMessage={leadMessage} />}
          {step === 'unlock' && <StepPinUnlock onCorrect={handlePinCorrect} onBack={handlePinBack} />}
          {step === 'kiosk-ended' && <StepKioskEnded onRestart={handleRestart} />}
        </div>
        {step !== 'member' && step !== 'guest-info' && step !== 'unlock' && step !== 'kiosk-ended' && (
          <div className="flex justify-center mt-4">
            <button type="button" onClick={() => setStep('unlock')} className="text-xs text-gray-400 hover:text-gray-600 underline">Staff: End Kiosk Mode</button>
          </div>
        )}
      </div>
    </div>
  );
}
