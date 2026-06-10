import type { BodyProfileAnalysis } from '../../types/bodyProfile';
import { isSupabaseConfigured, supabase } from '../supabase';

export async function pushBodyProfile(analysis: BodyProfileAnalysis): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return;

  const row = {
    user_id: userId,
    client_id: analysis.id,
    source: analysis.source,
    photo_uri: analysis.photoUri ?? null,
    captured_at: analysis.capturedAt,
    goal_tier: analysis.goalTier ?? null,
    recommended_tier: analysis.recommendedTier ?? null,
    current_body_assessment: analysis.currentBodyAssessment,
    focus_areas: analysis.focusAreas,
    avoid_areas: analysis.avoidAreas,
    key_exercises: analysis.keyExercises,
    nutrition_tip: analysis.nutritionTip ?? null,
    coach_notes: analysis.coachNotes,
    timeline_months: analysis.timelineMonths ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('body_profiles')
    .upsert(row, { onConflict: 'user_id,client_id' });

  if (error) {
    console.warn('[bodyProfileSync]', error.message);
  }
}
