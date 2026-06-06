const express = require('express');
const router = express.Router();

const DEFAULT_OPTIONS = {
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

router.get('/options', (req, res) => res.json(DEFAULT_OPTIONS));
module.exports = router;
