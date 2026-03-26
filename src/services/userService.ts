import { supabase } from './supabase';
import type { AnyGameData } from './aiService';

export interface UserProfile {
  id: string;
  display_name: string;
  synapses: number;
  mastery_cores: number;
  player_level: number;
}

// ── Profile ──

export async function getOrCreateProfile(userId: string, displayName: string): Promise<UserProfile> {
  // Try to get existing profile
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (data) return data as UserProfile;

  if (error && error.code === 'PGRST116') {
    // Profile doesn't exist, create one
    const newProfile: UserProfile = {
      id: userId,
      display_name: displayName || 'Lifelong Learner',
      synapses: 0,
      mastery_cores: 0,
      player_level: 1,
    };

    const { data: created, error: createError } = await supabase
      .from('profiles')
      .insert(newProfile)
      .select()
      .single();

    if (createError) throw createError;
    return created as UserProfile;
  }

  throw error;
}

export async function updateProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) throw error;
}

// ── Saved Library ──

export async function getSavedLevels(userId: string): Promise<AnyGameData[]> {
  const { data, error } = await supabase
    .from('saved_levels')
    .select('level_data')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((row: any) => row.level_data);
}

export async function saveLevel(userId: string, levelData: AnyGameData): Promise<void> {
  const { error } = await supabase
    .from('saved_levels')
    .insert({
      user_id: userId,
      level_data: levelData,
      title: levelData.title,
      game_type: levelData.type,
    });

  if (error) throw error;
}
