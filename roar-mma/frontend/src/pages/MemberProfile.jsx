import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api from '../lib/api';
import { formatDate, formatCurrency, formatPhone, calculateAge } from '../lib/formatters';
import EditMemberModal from '../components/Members/EditMemberModal';
import ConfirmDialog from '../components/Shared/ConfirmDialog';
import { PageLoader } from '../components/Shared/Spinner';
import { useNotifications } from '../contexts/NotificationContext';
import StudentCoachingPanel from '../components/Coaching/StudentCoachingPanel';
import DocumentsPanel from '../components/Members/DocumentsPanel';

const DISCIPLINE_COLORS = { bjj: '#6600CC', muay_thai: '#FF6B35', wrestling: '#4CAF50', kids_bjj: '#FFD700', judo: '#1565C0' };
const DISCIPLINE_LABELS = { bjj: 'BJJ', muay_thai: 'Muay Thai', wrestling: 'Wrestling', kids_bjj: 'Kids BJJ', judo: 'Judo' };

export default function MemberProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { error, success } = useNotifications();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showChangePlan, setShowChangePlan] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAddComp, setShowAddComp] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const { data: member, isLoading } = useQuery({
    queryKey: ['member', id],
    queryFn: async () => { const r = await api.get(`/api/members/${id}`); return r.data; },
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['member-attendance', id],
    queryFn: async () => { const r = await api.get(`/api/members/${id}/attendance`); return r.data; },
  });

  const { data: attStats } = useQuery({
    queryKey: ['member-attendance-stats', id],
    queryFn: async () => { const r = await api.get(`/api/members/${id}/attendance-stats`); return r.data; },
    staleTime: 60000,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['member-payments', id],
    queryFn: async () => { const r = await api.get(`/api/members/${id}/transactions`); return r.data; },
  });

  const { data: disciplines = [] } = useQuery({
    queryKey: ['member-disciplines', id],
    queryFn: async () => { const r = await api.get(`/api/members/${id}/disciplines`); return r.data; },
  });

  const { data: enrolledClasses = [] } = useQuery({
    queryKey: ['member-enrolled', id],
    queryFn: async () => { const r = await api.get(`/api/members/${id}/enrolled-classes`); return r.data; },
  });

  const { data: notes = [], refetch: refetchNotes } = useQuery({
    queryKey: ['member-notes', id],
    queryFn: async () => { const r = await api.get(`/api/members/${id}/notes`); return r.data; },
  });

  const { data: ptSessions = [] } = useQuery({
    queryKey: ['member-pt', id],
    queryFn: async () => { const r = await api.get(`/api/members/${id}/pt-sessions`); return r.data; },
  });

  const { data: competitions = [], refetch: refetchComps } = useQuery({
    queryKey: ['member-comps', id],
    queryFn: async () => { const r = await api.get(`/api/members/${id}/competitions`); return r.data; },
    enabled: member?.is_fighter === 1,
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ['member-referrals', id],
    queryFn: async () => { const r = await api.get(`/api/members/${id}/referrals`); return r.data; },
  });

  const { data: makeups = [] } = useQuery({
    queryKey: ['member-makeups', id],
    queryFn: async () => { const r = await api.get(`/api/makeup-classes/member/${id}`); return r.data?.makeups || []; },
  });

  const deleteMember = useMutation({
    mutationFn: async () => { await api.delete(`/api/members/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries(['members']); navigate('/members'); },
    onError: (err) => { console.error(err); error('Failed to delete member'); }
  });

  const cancelMember = useMutation({
    mutationFn: async () => { await api.post(`/api/members/${id}/cancel`); },
    onSuccess: () => { queryClient.invalidateQueries(['member', id]); success('Membership cancelled'); setShowCancelDialog(false); },
    onError: (err) => { error(err.response?.data?.error || 'Failed to cancel'); }
  });

  const pauseMember = useMutation({
    mutationFn: async (data) => { await api.post(`/api/members/${id}/pause`, data); },
    onSuccess: () => { queryClient.invalidateQueries(['member', id]); success('Membership paused'); setShowPauseDialog(false); },
    onError: (err) => { error(err.response?.data?.error || 'Failed to pause'); }
  });

  const changePlan = useMutation({
    mutationFn: async (data) => { await api.post(`/api/members/${id}/change-plan`, data); },
    onSuccess: () => { queryClient.invalidateQueries(['member', id]); success('Plan changed'); setShowChangePlan(false); },
    onError: (err) => { error(err.response?.data?.error || 'Failed to change plan'); }
  });

  const addNote = useMutation({
    mutationFn: async (data) => { await api.post(`/api/members/${id}/notes`, data); },
    onSuccess: () => { refetchNotes(); setShowAddNote(false); success('Note added'); },
    onError: (err) => { error('Failed to add note'); }
  });

  const addComp = useMutation({
    mutationFn: async (data) => { await api.post(`/api/members/${id}/competitions`, data); },
    onSuccess: () => { refetchComps(); setShowAddComp(false); success('Competition logged'); },
    onError: (err) => { error('Failed to add competition'); }
  });

  if (isLoading) return <PageLoader />;
  if (!member) return <div>Member not found</div>;

  const age = member.date_of_birth ? calculateAge(member.date_of_birth) : null;
  const isFighter = member.is_fighter === 1 || disciplines.some(d => d.discipline === 'fighter');
  const planOptions = ['1x', '2x', 'unlimited', 'casual'];
  const tabs = ['overview', 'attendance', 'payments', 'classes-pt', 'notes', 'coaching', 'documents', ...(isFighter ? ['fighter'] : [])];

  return (
    <div>
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {(member.first_name || '?')[0]}{(member.last_name || '?')[0]}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{member.first_name} {member.last_name}</h1>
                <p className="text-gray-600">{member.email}</p>
                <p className="text-gray-600">{formatPhone(member.phone)}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button type="button" onClick={() => setShowChangePlan(true)} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Change Plan</button>
              <button type="button" onClick={() => setShowPauseDialog(true)} className="px-3 py-1.5 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">Pause</button>
              <button type="button" onClick={() => setShowCancelDialog(true)} className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Cancel</button>
              <button type="button" onClick={() => setShowEditModal(true)} className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700">Edit</button>
            </div>
          </div>

          <div className="flex gap-2 mt-4 flex-wrap items-center">
            <StatusBadge status={member.status} />
            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 capitalize">{member.membership_type || 'adult'}</span>
            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 capitalize">{member.plan || 'No plan'}</span>
            {member.location && <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">{member.location.replace('_', ' ')}</span>}
            {isFighter && <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 font-bold">FIGHTER ★</span>}
            {member.parent_id && <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">Family</span>}
            <span className={`px-2 py-0.5 text-xs rounded-full ${member.waiver_signed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{member.waiver_signed ? '✓ Waiver Signed' : '⚠ No Waiver'}</span>
            {disciplines.map(d => (
              <span key={d.discipline} className="px-2 py-0.5 text-xs rounded-full" style={{ backgroundColor: (DISCIPLINE_COLORS[d.discipline] || '#666') + '20', color: DISCIPLINE_COLORS[d.discipline] || '#666', border: `1px solid ${DISCIPLINE_COLORS[d.discipline] || '#666'}40` }}>
                {DISCIPLINE_LABELS[d.discipline] || d.discipline}: {d.belt_name}
              </span>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200">
          <nav className="flex overflow-x-auto">
            {['overview', 'attendance', 'payments', 'classes-pt', 'notes', 'coaching', 'documents', ...(isFighter ? ['fighter'] : [])].map(tab => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${activeTab === tab ? 'border-b-2 border-red-500 text-red-600' : 'text-gray-500 hover:text-gray-700'}`}>
                {tab === 'classes-pt' ? 'Classes & PT' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
            <dl className="space-y-3">
              <InfoRow label="Date of Birth" value={member.date_of_birth ? formatDate(member.date_of_birth) : 'Not provided'} />
              {age && <InfoRow label="Age" value={`${age} years`} />}
              <InfoRow label="Gender" value={member.gender ? member.gender.charAt(0).toUpperCase() + member.gender.slice(1) : 'Not provided'} />
              <InfoRow label="Address" value={member.address || 'Not provided'} />
              <InfoRow label="Suburb" value={member.suburb || 'Not provided'} />
              <InfoRow label="Postcode" value={member.postcode || 'Not provided'} />
            </dl>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Membership Details</h2>
            <dl className="space-y-3">
              <InfoRow label="Status" value={<StatusBadge status={member.status} />} />
              <InfoRow label="Type" value={(member.membership_type || 'adult').replace('_', ' ')} />
              <InfoRow label="Plan" value={member.plan || 'Not set'} />
              <InfoRow label="Joined" value={member.joined_date ? formatDate(member.joined_date) : 'Not set'} />
              <InfoRow label="Location" value={member.location?.replace('_', ' ') || 'Not set'} />
              {member.trial_end_date && <InfoRow label="Trial Ends" value={formatDate(member.trial_end_date)} />}
              {member.pause_start && <InfoRow label="Paused" value={`${formatDate(member.pause_start)} → ${member.pause_end ? formatDate(member.pause_end) : 'open'}`} />}
              {member.cancellation_date && <InfoRow label="Cancelled" value={formatDate(member.cancellation_date)} />}
              <InfoRow label="Health Score" value={<HealthScoreBadge score={member.health_score} />} />
            </dl>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Disciplines & Belt Levels</h2>
            {disciplines.length === 0 ? <p className="text-gray-500 text-sm">No disciplines tracked</p> : (
              <div className="space-y-3">
                {disciplines.map(d => (
                  <div key={d.discipline} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{DISCIPLINE_LABELS[d.discipline] || d.discipline}</p>
                      <p className="text-lg font-bold" style={{ color: d.color_code || '#666' }}>{d.belt_name}</p>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      {d.current_stripes > 0 && <p>{d.current_stripes} stripe{d.current_stripes > 1 ? 's' : ''}</p>}
                      <p>Since {formatDate(d.belt_awarded_date)}</p>
                      <p>{d.classes_attended_since_belt} classes</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Emergency Contact</h2>
            <dl className="space-y-3">
              <InfoRow label="Name" value={member.emergency_contact_name || 'Not provided'} />
              <InfoRow label="Phone" value={member.emergency_contact_phone ? formatPhone(member.emergency_contact_phone) : 'Not provided'} />
            </dl>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Medical & Goals</h2>
            <div className="space-y-4">
              <div><h3 className="text-sm font-medium text-gray-700 mb-1">Medical Conditions</h3><p className="text-gray-600">{member.medical_conditions || 'None reported'}</p></div>
              <div><h3 className="text-sm font-medium text-gray-700 mb-1">Training Goals</h3><p className="text-gray-600">{member.goals || 'Not specified'}</p></div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Referrals</h2>
            {referrals.length === 0 ? <p className="text-gray-500 text-sm">No referrals</p> : (
              <div className="space-y-2">
                {referrals.map(r => (
                  <div key={r.id} className="flex justify-between items-center p-2 border-b border-gray-100">
                    <span className="text-sm text-gray-900">{r.referred_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'redeemed' ? 'bg-green-100 text-green-700' : r.status === 'issued' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{r.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {makeups.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Makeup Classes</h2>
              <div className="space-y-2">
                {makeups.map(m => (
                  <div key={m.id} className="flex justify-between items-center p-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm text-gray-900">Original: {m.original_date ? formatDate(m.original_date) : 'N/A'}</p>
                      {m.expires_at && <p className="text-xs text-gray-500">Expires: {formatDate(m.expires_at)}</p>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${m.used_at ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>{m.used_at ? 'Used' : 'Available'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Enrolled Classes This Week</h2>
            {enrolledClasses.length === 0 ? <p className="text-gray-500 text-sm">No classes enrolled this week</p> : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Class</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Instructor</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {enrolledClasses.map(c => (
                      <tr key={c.id}>
                        <td className="px-4 py-2 text-sm">{formatDate(c.date)}</td>
                        <td className="px-4 py-2 text-sm font-medium">{c.class_name}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{c.start_time}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{c.instructor_name || '—'}</td>
                        <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${c.attended_at ? 'bg-green-100 text-green-700' : c.booking_status === 'confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{c.attended_at ? 'Attended' : c.booking_status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Streak Stats */}
          {attStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{attStats.currentStreak}</p>
                <p className="text-xs text-gray-500 mt-1">Current Streak</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{attStats.longestStreak}</p>
                <p className="text-xs text-gray-500 mt-1">Longest Streak</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <p className="text-3xl font-bold text-gray-900">{attStats.totalAttendance}</p>
                <p className="text-xs text-gray-500 mt-1">Total Classes</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <p className="text-3xl font-bold text-indigo-600">{attStats.thisMonth}</p>
                <p className="text-xs text-gray-500 mt-1">This Month</p>
              </div>
            </div>
          )}

          {/* Heatmap (12 weeks) */}
          {attStats?.heatmap && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Attendance Heatmap (12 weeks)</h3>
              <div className="flex gap-0.5">
                {Array.from({ length: 7 }, (_, dayIdx) => (
                  <div key={dayIdx} className="flex flex-col gap-0.5">
                    {attStats.heatmap.filter(d => d.day === dayIdx).map(d => (
                      <div key={d.date} className={`w-3 h-3 rounded-sm ${d.attended ? 'bg-green-500' : 'bg-gray-100'}`} title={`${d.date}: ${d.attended ? 'Attended' : 'No class'}`} />
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                <span>Less</span>
                <div className="w-3 h-3 rounded-sm bg-gray-100" />
                <div className="w-3 h-3 rounded-sm bg-green-500" />
                <span>More</span>
              </div>
            </div>
          )}

          {/* Attendance Table */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Attendance History</h2>
            {attendance.length === 0 ? <p className="text-gray-500 text-center py-8">No attendance records</p> : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Checked In</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {attendance.map(r => (
                      <tr key={r.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(r.date)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.class_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.start_time}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.attended_at ? new Date(r.attended_at).toLocaleTimeString() : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Payment History</h2>
          {payments.length === 0 ? <p className="text-gray-500 text-center py-8">No payment records</p> : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(p.processed_at || p.created_at)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{p.description || p.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">${formatCurrency(p.amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap"><PaymentStatusBadge status={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'classes-pt' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">PT Sessions</h2>
            {ptSessions.length === 0 ? <p className="text-gray-500 text-sm">No PT sessions</p> : (
              <div className="space-y-3">
                {ptSessions.map(s => (
                  <div key={s.id} className="flex justify-between items-center p-3 border border-gray-100 rounded-lg">
                    <div><p className="text-sm font-medium">{formatDate(s.session_date)}</p><p className="text-xs text-gray-500">Coach: {s.coach_name}</p></div>
                    <span className="text-xs text-gray-500">{s.package_name || 'Single'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Enrolled Classes This Week</h2>
            {enrolledClasses.length === 0 ? <p className="text-gray-500 text-sm">No classes</p> : (
              <div className="space-y-2">
                {enrolledClasses.map(c => (
                  <div key={c.id} className="flex justify-between items-center p-2 border-b border-gray-100">
                    <div><p className="text-sm font-medium">{c.class_name}</p><p className="text-xs text-gray-500">{formatDate(c.date)} {c.start_time}</p></div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.attended_at ? 'bg-green-100 text-green-700' : c.booking_status === 'confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{c.attended_at ? 'Attended' : c.booking_status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Notes & Timeline</h2>
            <button type="button" onClick={() => setShowAddNote(true)} className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">+ Add Note</button>
          </div>
          {notes.length === 0 ? <p className="text-gray-500 text-center py-8">No notes recorded</p> : (
            <div className="space-y-3">
              {notes.map(n => (
                <div key={n.id} className="border-l-4 border-red-200 pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <p className="text-sm text-gray-900">{n.content}</p>
                    <span className="text-xs text-gray-400 ml-4">{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs text-gray-400">{n.author_name || 'System'}</span>
                    {n.note_type !== 'general' && <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{n.note_type}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'fighter' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Fighter Record & Competition History</h2>
            <button type="button" onClick={() => setShowAddComp(true)} className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">+ Log Competition</button>
          </div>
          {competitions.length === 0 ? <p className="text-gray-500 text-center py-8">No competitions logged</p> : (
            <>
              <div className="flex gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-4 text-center flex-1"><p className="text-2xl font-bold text-green-700">{competitions.filter(c => c.result === 'win').length}</p><p className="text-xs text-green-600">Wins</p></div>
                <div className="bg-red-50 rounded-lg p-4 text-center flex-1"><p className="text-2xl font-bold text-red-700">{competitions.filter(c => c.result === 'loss').length}</p><p className="text-xs text-red-600">Losses</p></div>
                <div className="bg-gray-50 rounded-lg p-4 text-center flex-1"><p className="text-2xl font-bold text-gray-700">{competitions.filter(c => c.result === 'draw' || c.result === 'nc').length}</p><p className="text-xs text-gray-500">Draws/NC</p></div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Event</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Opponent</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Discipline</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Result</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Method</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {competitions.map(c => (
                      <tr key={c.id}>
                        <td className="px-4 py-2 text-sm">{formatDate(c.event_date)}</td>
                        <td className="px-4 py-2 text-sm font-medium">{c.event_name}</td>
                        <td className="px-4 py-2 text-sm">{c.opponent_name || '—'}</td>
                        <td className="px-4 py-2 text-sm capitalize">{c.discipline}</td>
                        <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.result === 'win' ? 'bg-green-100 text-green-700' : c.result === 'loss' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{c.result.toUpperCase()}</span></td>
                        <td className="px-4 py-2 text-sm capitalize">{c.method || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'coaching' && (
        <div className="bg-white rounded-lg shadow p-6">
          <StudentCoachingPanel member={member} />
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="bg-white rounded-lg shadow p-6">
          <DocumentsPanel memberId={member.id} />
        </div>
      )}

      <EditMemberModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} member={member} />
      <ConfirmDialog isOpen={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} onConfirm={() => deleteMember.mutate()} title="Delete Member" message={`Delete ${member.first_name} ${member.last_name}? This archives their account.`} confirmText="Archive" type="danger" />
      <ConfirmDialog isOpen={showCancelDialog} onClose={() => setShowCancelDialog(false)} onConfirm={() => cancelMember.mutate()} title="Cancel Membership" message={`Cancel ${member.first_name}'s membership? They can rejoin anytime.`} confirmText="Cancel Membership" type="danger" />
      <PauseDialog isOpen={showPauseDialog} onClose={() => setShowPauseDialog(false)} onConfirm={pauseMember.mutate} />
      <ChangePlanDialog isOpen={showChangePlan} onClose={() => setShowChangePlan(false)} onConfirm={changePlan.mutate} currentPlan={member.plan} plans={planOptions} />
      <AddNoteDialog isOpen={showAddNote} onClose={() => setShowAddNote(false)} onConfirm={addNote.mutate} />
      <AddCompetitionDialog isOpen={showAddComp} onClose={() => setShowAddComp(false)} onConfirm={addComp.mutate} />
    </div>
  );
}

function InfoRow({ label, value }) {
  return <div className="flex justify-between py-2 border-b border-gray-100"><dt className="text-sm font-medium text-gray-500">{label}</dt><dd className="text-sm text-gray-900">{value}</dd></div>;
}

function StatusBadge({ status }) {
  const colors = { active: 'bg-green-100 text-green-700', trial: 'bg-yellow-100 text-yellow-700', paused: 'bg-gray-100 text-gray-500', cancelled: 'bg-red-100 text-red-700', overdue: 'bg-orange-100 text-orange-700' };
  return <span className={`px-2 py-0.5 text-xs rounded-full ${colors[status] || 'bg-gray-100 text-gray-500'} capitalize`}>{status}</span>;
}

function PaymentStatusBadge({ status }) {
  const colors = { paid: 'bg-green-100 text-green-700', completed: 'bg-green-100 text-green-700', pending: 'bg-yellow-100 text-yellow-700', failed: 'bg-red-100 text-red-700', refunded: 'bg-gray-100 text-gray-500' };
  return <span className={`text-xs px-2 py-0.5 rounded-full ${colors[status] || 'bg-gray-100 text-gray-500'} capitalize`}>{status}</span>;
}

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b"><h3 className="text-lg font-semibold">{title}</h3><button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button></div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function PauseDialog({ isOpen, onClose, onConfirm }) {
  const [start, setStart] = useState(new Date().toISOString().split('T')[0]);
  const [end, setEnd] = useState('');
  if (!isOpen) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pause Membership">
      <div className="space-y-3">
        <div><label className="block text-sm font-medium text-gray-700">Start Date</label><input type="date" value={start} onChange={e => setStart(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
        <div><label className="block text-sm font-medium text-gray-700">End Date</label><input type="date" value={end} onChange={e => setEnd(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
        <p className="text-xs text-gray-500">Hold fee: $0.71/day. Max 84 days.</p>
        <button type="button" onClick={() => { if (start && end) onConfirm({ pause_start: start, pause_end: end }); }} className="w-full py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm font-medium">Confirm Pause</button>
      </div>
    </Modal>
  );
}

function ChangePlanDialog({ isOpen, onClose, onConfirm, currentPlan, plans }) {
  const [plan, setPlan] = useState(currentPlan || plans[0]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  if (!isOpen) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Change Membership Plan">
      <div className="space-y-3">
        <div><label className="block text-sm font-medium text-gray-700">New Plan</label>
          <select value={plan} onChange={e => setPlan(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
            {plans.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
          </select>
        </div>
        <div><label className="block text-sm font-medium text-gray-700">Effective Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
        <button type="button" onClick={() => onConfirm({ plan, effective_date: date })} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Change Plan</button>
      </div>
    </Modal>
  );
}

function AddNoteDialog({ isOpen, onClose, onConfirm }) {
  const [type, setType] = useState('general');
  const [content, setContent] = useState('');
  if (!isOpen) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Note">
      <div className="space-y-3">
        <div><label className="block text-sm font-medium text-gray-700">Type</label>
          <select value={type} onChange={e => setType(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
            {['general', 'call', 'meeting', 'incident', 'achievement', 'complaint'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div><label className="block text-sm font-medium text-gray-700">Note</label><textarea value={content} onChange={e => setContent(e.target.value)} rows={3} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="Enter note..." /></div>
        <button type="button" onClick={() => { if (content.trim()) onConfirm({ note_type: type, content }); }} className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">Add Note</button>
      </div>
    </Modal>
  );
}

function AddCompetitionDialog({ isOpen, onClose, onConfirm }) {
  const [data, setData] = useState({ event_name: '', event_date: '', opponent_name: '', weight_class: '', discipline: 'mma', result: 'win', method: '', round: '', notes: '' });
  if (!isOpen) return null;
  const set = (k, v) => setData(p => ({ ...p, [k]: v }));
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Competition">
      <div className="space-y-3 max-h-96 overflow-y-auto">
        <div><label className="block text-sm font-medium text-gray-700">Event Name</label><input value={data.event_name} onChange={e => set('event_name', e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium text-gray-700">Date</label><input type="date" value={data.event_date} onChange={e => set('event_date', e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
          <div><label className="block text-sm font-medium text-gray-700">Discipline</label><select value={data.discipline} onChange={e => set('discipline', e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">{['mma', 'boxing', 'bjj', 'muay_thai', 'wrestling'].map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}</select></div>
        </div>
        <div><label className="block text-sm font-medium text-gray-700">Opponent</label><input value={data.opponent_name} onChange={e => set('opponent_name', e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium text-gray-700">Result</label><select value={data.result} onChange={e => set('result', e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">{['win', 'loss', 'draw', 'nc'].map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-gray-700">Method</label><select value={data.method} onChange={e => set('method', e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">{['', 'ko', 'tko', 'submission', 'decision', 'dq'].map(m => <option key={m} value={m}>{m ? m.toUpperCase() : '—'}</option>)}</select></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium text-gray-700">Weight Class</label><input value={data.weight_class} onChange={e => set('weight_class', e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
          <div><label className="block text-sm font-medium text-gray-700">Round</label><input type="number" min="1" value={data.round} onChange={e => set('round', e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
        </div>
        <button type="button" onClick={() => { if (data.event_name && data.event_date) onConfirm(data); }} className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">Log Competition</button>
      </div>
    </Modal>
  );
}

function HealthScoreBadge({ score }) {
  if (score === null || score === undefined) return <span className="text-sm text-gray-400">—</span>;
  const color = score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : score >= 30 ? 'text-orange-600' : 'text-red-600';
  const bg = score >= 80 ? 'bg-green-50' : score >= 50 ? 'bg-yellow-50' : score >= 30 ? 'bg-orange-50' : 'bg-red-50';
  return <span className={`inline-flex items-center gap-1 text-sm font-medium ${color} ${bg} px-2 py-0.5 rounded-full`}>
    <span className={`w-2 h-2 rounded-full ${color.replace('text-', 'bg-')}`} />
    {score}/100
  </span>;
}
