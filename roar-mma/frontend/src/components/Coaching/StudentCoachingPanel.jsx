import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import CoachRatingModal from './CoachRatingModal';

const READINESS_COLORS = {
  fight_ready: 'badge-green', ready: 'badge-blue', developing: 'badge-yellow', not_ready: 'badge-gray'
};
const READINESS_LABELS = {
  fight_ready: 'Fight Ready', ready: 'Ready', developing: 'Developing', not_ready: 'Not Ready'
};
const WEIGHT_ADVICE_LABELS = { cut: 'Should Cut', bulk: 'Should Bulk', maintain: 'Maintain', not_sure: 'Not Sure' };

export default function StudentCoachingPanel({ member }) {
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('ratings');

  const { data: ratingsData, isLoading: ratingsLoading } = useQuery({
    queryKey: ['coaching-ratings', member.id],
    queryFn: async () => { const r = await api.get(`/api/coaching/${member.id}/ratings`); return r.data; },
  });

  const { data: insightsData, isLoading: insightsLoading } = useQuery({
    queryKey: ['coaching-insights', member.id],
    queryFn: async () => { const r = await api.get(`/api/coaching/${member.id}/insights`); return r.data; },
  });

  const ratings = ratingsData?.ratings || [];
  const averages = ratingsData?.averages || {};
  const insights = insightsData?.insights || [];
  const latestInsight = insightsData?.latest || null;

  function RatingBar({ label, value }) {
    if (!value) return null;
    const pct = (value / 10) * 100;
    return (
      <div>
        <div className="flex justify-between text-sm mb-0.5">
          <span className="text-gray-600">{label}</span>
          <span className="font-semibold">{Number(value).toFixed(1)}/10</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-red-600 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Coaching</h3>
        <button type="button" onClick={() => setShowRatingModal(true)} className="btn btn-primary text-sm py-1.5 px-3">
          + Rate Today
        </button>
      </div>

      <CoachRatingModal isOpen={showRatingModal} onClose={() => setShowRatingModal(false)} member={member} />

      {averages && (averages.avg_defense || averages.avg_stance || averages.avg_offense) && (
        <div className="bg-white rounded-lg border p-4 space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Averages ({ratings.length} ratings)</h4>
          <RatingBar label="Defense" value={averages.avg_defense} />
          <RatingBar label="Stance" value={averages.avg_stance} />
          <RatingBar label="Offense" value={averages.avg_offense} />
          <RatingBar label="Practice Quality" value={averages.avg_practice} />
        </div>
      )}

      {latestInsight && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-200 p-4 space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Latest AI Insight</h4>
          <div className="flex flex-wrap gap-2">
            {latestInsight.fight_readiness && (
              <span className={`badge ${READINESS_COLORS[latestInsight.fight_readiness] || 'badge-gray'}`}>
                {READINESS_LABELS[latestInsight.fight_readiness]}
              </span>
            )}
            {latestInsight.weight_advice && (
              <span className="badge badge-blue">{WEIGHT_ADVICE_LABELS[latestInsight.weight_advice]}</span>
            )}
            {latestInsight.recommended_weight_class && (
              <span className="badge badge-yellow">{latestInsight.recommended_weight_class}</span>
            )}
          </div>
          {latestInsight.skill_level && <p className="text-sm"><strong>Skill Level:</strong> {latestInsight.skill_level}</p>}
          {latestInsight.strengths && <p className="text-sm"><strong>Strengths:</strong> {latestInsight.strengths}</p>}
          {latestInsight.weaknesses && <p className="text-sm"><strong>Weaknesses:</strong> {latestInsight.weaknesses}</p>}
          {latestInsight.diet_recommendation && <p className="text-sm"><strong>Diet:</strong> {latestInsight.diet_recommendation}</p>}
        </div>
      )}

      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {['ratings', 'insights', 'drills'].map(tab => (
            <button key={tab} type="button" onClick={() => setActiveSubTab(tab)}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeSubTab === tab ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {tab}
              {tab === 'ratings' && ` (${ratings.length})`}
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-3">
        {activeSubTab === 'ratings' && (
          ratingsLoading ? <p className="text-gray-400 text-sm">Loading ratings...</p> :
          ratings.length === 0 ? <p className="text-gray-400 text-sm">No ratings yet. Rate this student's training session to get started.</p> :
          ratings.map(r => (
            <div key={r.id} className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">{r.rating_date} by {r.coach_name || 'Coach'}</span>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-2 text-center text-sm">
                {[{label:'Defense',v:r.defense},{label:'Stance',v:r.stance},{label:'Offense',v:r.offense},{label:'Practice',v:r.practice_quality}].map(f => (
                  <div key={f.label} className="bg-gray-50 rounded p-1">
                    <div className="text-xs text-gray-400">{f.label}</div>
                    <div className="font-bold text-gray-800">{f.v || '-'}</div>
                  </div>
                ))}
              </div>
              {r.notes && <p className="text-sm text-gray-600 mt-1">{r.notes}</p>}
            </div>
          ))
        )}

        {activeSubTab === 'insights' && (
          insightsLoading ? <p className="text-gray-400 text-sm">Loading insights...</p> :
          insights.length === 0 ? <p className="text-gray-400 text-sm">No AI insights yet. Insights are generated daily after coach ratings are submitted.</p> :
          insights.map(i => (
            <div key={i.id} className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">{i.insight_date}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {i.fight_readiness && <span className={`badge ${READINESS_COLORS[i.fight_readiness] || 'badge-gray'} text-xs`}>{READINESS_LABELS[i.fight_readiness]}</span>}
                {i.weight_advice && <span className="badge badge-blue text-xs">{WEIGHT_ADVICE_LABELS[i.weight_advice]}</span>}
              </div>
              {i.strengths && <p className="text-sm"><strong>Strengths:</strong> {i.strengths}</p>}
              {i.weaknesses && <p className="text-sm"><strong>Weaknesses:</strong> {i.weaknesses}</p>}
              {i.diet_recommendation && <p className="text-sm"><strong>Diet:</strong> {i.diet_recommendation}</p>}

              {i.drills && i.drills.length > 0 && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Drills Recommended</p>
                  {i.drills.map(d => (
                    <div key={d.id} className="bg-gray-50 rounded p-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{d.drill_name}</span>
                        {d.difficulty && <span className={`badge text-xs ${d.difficulty === 'beginner' ? 'badge-green' : d.difficulty === 'advanced' ? 'badge-red' : 'badge-yellow'}`}>{d.difficulty}</span>}
                      </div>
                      {d.drill_description && <p className="text-gray-500 text-xs mt-0.5">{d.drill_description}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}

        {activeSubTab === 'drills' && (
          <DrillsList memberId={member.id} />
        )}
      </div>
    </div>
  );
}

function DrillsList({ memberId }) {
  const { data: drills, isLoading } = useQuery({
    queryKey: ['coaching-drills', memberId],
    queryFn: async () => { const r = await api.get(`/api/coaching/${memberId}/drills`); return r.data; },
  });

  if (isLoading) return <p className="text-gray-400 text-sm">Loading drills...</p>;
  if (!drills || drills.length === 0) return <p className="text-gray-400 text-sm">No drill recommendations yet.</p>;

  return drills.map(d => (
    <div key={d.id} className="bg-white rounded-lg border p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-medium text-sm">{d.drill_name}</span>
        {d.difficulty && <span className={`badge text-xs ${d.difficulty === 'beginner' ? 'badge-green' : d.difficulty === 'advanced' ? 'badge-red' : 'badge-yellow'}`}>{d.difficulty}</span>}
        {d.focus_area && <span className="badge badge-blue text-xs capitalize">{d.focus_area}</span>}
      </div>
      {d.drill_description && <p className="text-sm text-gray-600">{d.drill_description}</p>}
      {d.insight_date && <p className="text-xs text-gray-400 mt-1">Recommended {d.insight_date}</p>}
    </div>
  ));
}
