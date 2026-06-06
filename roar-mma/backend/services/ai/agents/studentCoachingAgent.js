const coaching = require('../../../data/studentCoaching');
const openRouter = require('../openRouterClient');

const SYSTEM_PROMPT = `You are an expert MMA/BJJ coach AI. Analyze the student's training data and produce:

1. skill_level: Current skill assessment (1-2 sentences)
2. fight_readiness: One of: not_ready, developing, ready, fight_ready
3. recommended_weight_class: What weight class they should aim for
4. weight_advice: One of: cut, bulk, maintain, not_sure
5. diet_recommendation: Brief diet advice based on weight goal
6. strengths: What they're good at
7. weaknesses: What needs improvement
8. drills: Array of 2-3 specific drill recommendations with name, description, focus_area, difficulty

Return valid JSON matching this structure:
{
  "skill_level": "...",
  "fight_readiness": "developing",
  "recommended_weight_class": "lightweight",
  "weight_advice": "maintain",
  "diet_recommendation": "...",
  "strengths": "...",
  "weaknesses": "...",
  "drills": [
    { "drill_name": "...", "drill_description": "...", "focus_area": "defense|offense|stance|conditioning", "difficulty": "beginner|intermediate|advanced" }
  ]
}`;

function buildStudentProfile(member) {
  const parts = [`Student: ${member.first_name} ${member.last_name}`];
  if (member.experience_level) parts.push(`Experience: ${member.experience_level}`);
  if (member.goals) parts.push(`Goals: ${member.goals}`);
  if (member.avg_defense) parts.push(`Avg Defense: ${Number(member.avg_defense).toFixed(1)}/10`);
  if (member.avg_stance) parts.push(`Avg Stance: ${Number(member.avg_stance).toFixed(1)}/10`);
  if (member.avg_offense) parts.push(`Avg Offense: ${Number(member.avg_offense).toFixed(1)}/10`);
  if (member.avg_practice) parts.push(`Avg Practice Quality: ${Number(member.avg_practice).toFixed(1)}/10`);
  parts.push(`Total ratings: ${member.rating_count}`);
  return parts.join('\n');
}

async function handler({ db, aiState, openRouter: orClient, broadcast, config, agentName }) {
  try {
    console.log('[COACHING-AGENT] Starting student analysis...');

    const members = coaching.getAllMembersWithRecentRatings(14);

    if (!members || members.length === 0) {
      console.log('[COACHING-AGENT] No active members found');
      return;
    }

    const studentsWithRatings = members.filter(m => m.rating_count > 0);
    console.log(`[COACHING-AGENT] ${studentsWithRatings.length}/${members.length} members have recent ratings`);

    let analyzed = 0;
    let skipped = 0;

    for (const member of studentsWithRatings) {
      try {
        const existing = db.prepare(`
          SELECT id FROM student_ai_insights
          WHERE member_id = ? AND insight_date = date('now')
        `).get(member.id);

        if (existing) {
          skipped++;
          continue;
        }

        const profile = buildStudentProfile(member);

        let insightData = generateLocalInsight(member);

        try {
          if (orClient && typeof orClient.completeChat === 'function') {
            const response = await orClient.completeChat([
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: `Analyze this student's training data and provide coaching insights:\n\n${profile}` }
            ], { model: config?.model_override || 'openai/gpt-4o-mini', temperature: 0.3, max_tokens: 1000 });

            if (response && response.content) {
              const parsed = extractJson(response.content);
              if (parsed) insightData = parsed;
            }
          }
        } catch (aiErr) {
          console.log(`[COACHING-AGENT] AI call failed for ${member.first_name}, using local analysis: ${aiErr.message}`);
        }

        const result = coaching.createInsight(member.id, {
          skill_level: insightData.skill_level,
          fight_readiness: insightData.fight_readiness,
          recommended_weight_class: insightData.recommended_weight_class,
          weight_advice: insightData.weight_advice,
          diet_recommendation: insightData.diet_recommendation,
          strengths: insightData.strengths,
          weaknesses: insightData.weaknesses,
          summary: `${member.first_name} ${member.last_name}: ${insightData.skill_level || 'Analyzed'}`,
          details: insightData,
          drills: insightData.drills || []
        });

        analyzed++;
        console.log(`[COACHING-AGENT] Analyzed ${member.first_name} ${member.last_name}`);

        if (broadcast) {
          broadcast({ type: 'coaching_insight', memberId: member.id, summary: `${member.first_name} ${member.last_name} analyzed` });
        }
      } catch (memberErr) {
        console.error(`[COACHING-AGENT] Error analyzing ${member.first_name} ${member.last_name}:`, memberErr.message);
      }
    }

    const summary = `Coaching analysis: ${analyzed} students analyzed, ${skipped} already done today, ${studentsWithRatings.length} with ratings`;
    console.log(`[COACHING-AGENT] ${summary}`);

    await aiState.logActivity({
      agentName: agentName || 'student_coaching',
      actionType: 'coaching_analysis',
      details: { analyzed, skipped, total: studentsWithRatings.length, totalMembers: members.length },
      summary
    });
  } catch (err) {
    console.error('[COACHING-AGENT] Error:', err.stack || err.message);
    try {
      await aiState.logActivity({
        agentName: agentName || 'student_coaching',
        actionType: 'coaching_analysis_error',
        details: { error: err.message },
        summary: `Coaching agent failed: ${err.message}`
      });
    } catch (logErr) { console.error('[COACHING] Log error:', logErr.message); }
  }
}

function generateLocalInsight(member) {
  const avgDef = Number(member.avg_defense || 0);
  const avgStance = Number(member.avg_stance || 0);
  const avgOff = Number(member.avg_offense || 0);
  const avgPrac = Number(member.avg_practice || 0);
  const overall = (avgDef + avgStance + avgOff + avgPrac) / 4;

  const drills = [];
  const strengths = [];
  const weaknesses = [];

  if (avgDef >= 7) strengths.push('Strong defense');
  else if (avgDef < 5) { weaknesses.push('Defense needs work'); drills.push({ drill_name: 'Defensive Shell Drills', drill_description: 'Focus on guard retention, framing, and blocking techniques', focus_area: 'defense', difficulty: avgDef < 3 ? 'beginner' : 'intermediate' }); }
  else drills.push({ drill_name: 'Defensive Reaction Drills', drill_description: 'Partner drill focusing on reacting to strikes and takedowns', focus_area: 'defense', difficulty: 'intermediate' });

  if (avgStance >= 7) strengths.push('Good stance');
  else if (avgStance < 5) { weaknesses.push('Stance needs improvement'); drills.push({ drill_name: 'Stance & Footwork Fundamentals', drill_description: 'Basic stance, pivots, and level changes', focus_area: 'stance', difficulty: 'beginner' }); }
  else drills.push({ drill_name: 'Footwork Ladder Drills', drill_description: 'Agility ladder work for stance transitions and movement', focus_area: 'stance', difficulty: 'intermediate' });

  if (avgOff >= 7) strengths.push('Strong offense');
  else if (avgOff < 5) { weaknesses.push('Offense needs development'); drills.push({ drill_name: 'Basic Striking Combinations', drill_description: '1-2-3 combinations with proper form and power generation', focus_area: 'offense', difficulty: 'beginner' }); }
  else drills.push({ drill_name: 'Advanced Combo Chains', drill_description: 'Multi-strike combinations transitioning between striking and grappling', focus_area: 'offense', difficulty: 'advanced' });

  let fightReadiness;
  if (overall >= 7.5) fightReadiness = 'fight_ready';
  else if (overall >= 6) fightReadiness = 'ready';
  else if (overall >= 4) fightReadiness = 'developing';
  else fightReadiness = 'not_ready';

  return {
    skill_level: overall >= 7 ? 'Advanced' : overall >= 5 ? 'Intermediate' : 'Beginner',
    fight_readiness: fightReadiness,
    recommended_weight_class: null,
    weight_advice: 'maintain',
    diet_recommendation: 'Maintain a balanced diet with adequate protein for recovery. Stay hydrated.',
    strengths: strengths.join(', ') || 'Developing consistently',
    weaknesses: weaknesses.join(', ') || 'Continue building fundamentals',
    drills: drills.slice(0, 3)
  };
}

function extractJson(text) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch (err) { console.error('[COACHING] extractJson error:', err.message); }
  return null;
}

module.exports = { handler, buildStudentProfile, generateLocalInsight, extractJson };
