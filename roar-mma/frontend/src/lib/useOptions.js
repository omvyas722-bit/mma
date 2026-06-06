import { useQuery } from '@tanstack/react-query';
import api from './api';

export const OPTION_FALLBACKS = {
  locations: ['rockingham', 'bibra_lake', '247_gym'],
  plans: ['unlimited', '2x_week', '3x_week', 'fighter', 'pt_only', 'casual'],
  experience_levels: ['beginner', 'intermediate', 'advanced'],
  class_types: ['bjj', 'muay_thai', 'mma', 'boxing', 'wrestling', 'fitness', 'kids'],
  belt_levels: ['white', 'blue', 'purple', 'brown', 'black', 'red'],
  lead_sources: ['website', 'facebook', 'instagram', 'referral', 'walk_in', 'phone', 'email', 'other'],
  interest_levels: ['hot', 'warm', 'cold'],
  staff_roles: ['owner', 'gm', 'front_desk', 'coach', 'sales', 'social', 'staff'],
  payment_methods: ['card', 'cash', 'bank_transfer', 'other']
};

export function optionLabel(value) {
  if (!value) return '';
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export function useOptions() {
  return useQuery({
    queryKey: ['app-options'],
    queryFn: async () => {
      try {
        const r = await api.get('/api/settings/options');
        return r.data;
      } catch {
        return OPTION_FALLBACKS;
      }
    },
    staleTime: 300000,
    placeholderData: OPTION_FALLBACKS,
  });
}
