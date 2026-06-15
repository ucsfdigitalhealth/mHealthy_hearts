'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// instruments.js — Single source of truth for all validated instruments
// used in the mHealthy Hearts study.
//
// Imported by:
//   - backend/routes/symptoms.js  (to resolve instrument_key from symptom_key)
//   - Future: EMA rendering screens (question text, response options, scoring)
//
// Do NOT duplicate instrument details in routes, screens, or migrations.
// Do NOT modify question wording — all text is clinically validated.
// ─────────────────────────────────────────────────────────────────────────────

// Maps each EMA-eligible symptom_key to its instrument_key.
// Import this wherever you need to resolve symptom → instrument.
// NOTE: 'stress' maps to pss4_ema but uses a grant-required scheduled protocol —
//       it is NOT patient-initiated. See pss4_ema entry below.
// NOTE: the 5 acute momentary symptoms (chest_pain, fainted, irregular_heartbeat,
//       racing_heart, light_headed) have no validated questionnaire — a recurring
//       reminder for these just re-prompts the momentary log, so they map to the
//       generic 'symptom_event_log' placeholder rather than a PROMIS/etc. instrument.
const SYMPTOM_INSTRUMENT_MAP = {
  chest_pain:                 'symptom_event_log',
  fainted:                    'symptom_event_log',
  irregular_heartbeat:        'symptom_event_log',
  racing_heart:               'symptom_event_log',
  light_headed:               'symptom_event_log',
  fatigue:                    'promis_fatigue_4a',
  anxiety:                    'promis_anxiety_4a',
  depression_mood:            'promis_depression_4a',
  sleep_disturbance:          'promis_sleep_4a',
  reduced_exercise_tolerance: 'promis_physical_function_4a',
  breathlessness_activity:    'mmrc',
  hot_flashes:                'hfrdis',
  waking_sob_night:           'single_item_pnd',
  leg_swelling:               'single_item_leg_swelling',
  weight_change:              'single_item_weight_change',
  stress:                     'pss4_ema',
};

// EMA symptoms eligible for a patient-initiated recurring reminder, set up via
// SymptomRecurringPrompt -> DailyReminderSetup after a momentary log.
// Includes all 8 momentary symptoms from SymptomsMomentaryList.
// Stress is intentionally excluded — it uses a separate grant-required protocol.
// hot_flashes uses the weekly combined check-in path (WeeklySymptomSetup /
// SymptomsInstrument queue) instead of a per-symptom recurring reminder.
const EMA_ENROLLMENT_KEYS = new Set([
  'chest_pain',
  'fainted',
  'irregular_heartbeat',
  'racing_heart',
  'light_headed',
  'waking_sob_night',
  'leg_swelling',
  'weight_change',
]);

// Symptoms that use the weekly validated instrument path (patient-initiated).
const WEEKLY_INSTRUMENT_KEYS = new Set([
  'fatigue',
  'anxiety',
  'depression_mood',
  'sleep_disturbance',
  'reduced_exercise_tolerance',
  'breathlessness_activity',
  'hot_flashes',
]);

// ─────────────────────────────────────────────────────────────────────────────
// PROMIS T-SCORE LOOKUP TABLES
// Source: PROMIS scoring manuals at healthmeasures.net
// Raw scores range 4–20 for all 4-item short forms.
// Values for rows 9–11 (Fatigue) and 9–19 (Physical Function) are interpolated
// where the published table was truncated in the PRD source document.
// ─────────────────────────────────────────────────────────────────────────────

const PROMIS_T_SCORES = {
  promis_fatigue_4a: {
    4: 33.7, 5: 39.7, 6: 43.1, 7: 46.0, 8: 48.1,
    9: 50.2, 10: 52.0, 11: 54.0,
    12: 57.0, 13: 58.9, 14: 60.7, 15: 62.5, 16: 64.3,
    17: 66.1, 18: 67.9, 19: 70.0, 20: 72.8,
  },
  promis_anxiety_4a: {
    4: 40.3, 5: 48.0, 6: 51.2, 7: 53.7, 8: 55.8,
    9: 57.7, 10: 59.5, 11: 61.4, 12: 63.4, 13: 65.3,
    14: 67.3, 15: 69.3, 16: 71.2, 17: 73.3, 18: 75.4,
    19: 77.9, 20: 81.6,
  },
  promis_depression_4a: {
    4: 41.0, 5: 49.0, 6: 51.8, 7: 53.9, 8: 55.7,
    9: 57.3, 10: 58.9, 11: 60.5, 12: 62.2, 13: 63.9,
    14: 65.7, 15: 67.5, 16: 69.4, 17: 71.2, 18: 73.3,
    19: 75.7, 20: 79.4,
  },
  promis_sleep_4a: {
    4: 32.0, 5: 37.5, 6: 41.1, 7: 43.8, 8: 46.2,
    9: 48.3, 10: 50.5, 11: 52.4, 12: 54.3, 13: 56.2,
    14: 58.1, 15: 60.1, 16: 62.3, 17: 64.5, 18: 67.0,
    19: 69.9, 20: 73.3,
  },
  // Higher T-score = BETTER physical function (opposite direction from other domains)
  promis_physical_function_4a: {
    4: 22.5, 5: 26.6, 6: 28.9, 7: 30.5, 8: 31.9,
    9: 33.3, 10: 34.7, 11: 36.2, 12: 37.8, 13: 39.6,
    14: 41.6, 15: 43.8, 16: 46.4, 17: 49.2, 18: 52.4,
    19: 55.1, 20: 57.0,
  },
};

function lookupTScore(instrumentKey, rawScore) {
  const table = PROMIS_T_SCORES[instrumentKey];
  if (!table) return null;
  const t = table[rawScore];
  if (t === undefined) {
    console.warn(`[instruments] No T-score for ${instrumentKey} raw=${rawScore} — data quality issue`);
    return null;
  }
  return t;
}

// Full instrument definitions, keyed by instrument_key.
const INSTRUMENTS = {

  // ── PROMIS Fatigue ──────────────────────────────────────────────────────────
  promis_fatigue_4a: {
    instrument_key: 'promis_fatigue_4a',
    full_name: 'PROMIS Fatigue — Short Form 4a',
    source: 'PROMIS Item Bank v1.0, Short Form 4a',
    license: 'Free, open access',
    timeframe: 'In the past 7 days',
    applies_to_symptom_keys: ['fatigue'],
    question_stem: 'In the past 7 days...',
    questions: [
      { index: 0, text: 'I feel fatigued.',                                    reverse_scored: false },
      { index: 1, text: 'I have trouble starting things because I am tired.',  reverse_scored: false },
      { index: 2, text: 'How run-down did you feel on average?',               reverse_scored: false },
      { index: 3, text: 'How fatigued were you on average?',                   reverse_scored: false },
    ],
    response_scale: [
      { value: 1, label: 'Not at all' },
      { value: 2, label: 'A little bit' },
      { value: 3, label: 'Somewhat' },
      { value: 4, label: 'Quite a bit' },
      { value: 5, label: 'Very much' },
    ],
    per_item_response_scales: null, // same scale for all items
    reverse_scored_indices: [],
    scoring: {
      method: 'sum_then_tscore',
      raw_range: [4, 20],
      t_score_mean: 50,
      t_score_sd: 10,
      direction: 'higher_is_worse',
      clinical_threshold_tscore: 60,
      notes: 'Sum all 4 items (raw 4–20). Convert to T-score (mean=50, SD=10). Higher = more fatigue. Clinical concern: T≥60.',
    },
  },

  // ── PROMIS Anxiety ──────────────────────────────────────────────────────────
  promis_anxiety_4a: {
    instrument_key: 'promis_anxiety_4a',
    full_name: 'PROMIS Anxiety — Short Form 4a',
    source: 'PROMIS Item Bank v1.0, Short Form 4a',
    license: 'Free, open access',
    timeframe: 'In the past 7 days',
    applies_to_symptom_keys: ['anxiety'],
    question_stem: 'In the past 7 days...',
    questions: [
      { index: 0, text: 'I felt fearful.',                                               reverse_scored: false },
      { index: 1, text: 'I found it hard to focus on anything other than my anxiety.',   reverse_scored: false },
      { index: 2, text: 'My worries overwhelmed me.',                                    reverse_scored: false },
      { index: 3, text: 'I felt uneasy.',                                                reverse_scored: false },
    ],
    response_scale: [
      { value: 1, label: 'Never' },
      { value: 2, label: 'Rarely' },
      { value: 3, label: 'Sometimes' },
      { value: 4, label: 'Often' },
      { value: 5, label: 'Always' },
    ],
    per_item_response_scales: null,
    reverse_scored_indices: [],
    scoring: {
      method: 'sum_then_tscore',
      raw_range: [4, 20],
      t_score_mean: 50,
      t_score_sd: 10,
      direction: 'higher_is_worse',
      clinical_threshold_tscore: 60,
      notes: 'Sum all 4 items (raw 4–20). Convert to T-score (mean=50, SD=10). Higher = more anxiety. Clinical concern: T≥60.',
    },
  },

  // ── PROMIS Depression ───────────────────────────────────────────────────────
  // Note: section header in the study spec uses 'promis_dep' but the canonical
  // instrument_key throughout this project is 'promis_depression_4a' per the
  // SYMPTOM_INSTRUMENT_MAP above.
  promis_depression_4a: {
    instrument_key: 'promis_depression_4a',
    full_name: 'PROMIS Depression — Short Form 4a',
    source: 'PROMIS Item Bank v1.0, Short Form 4a',
    license: 'Free, open access',
    timeframe: 'In the past 7 days',
    applies_to_symptom_keys: ['depression_mood'],
    question_stem: 'In the past 7 days...',
    questions: [
      { index: 0, text: 'I felt worthless.',  reverse_scored: false },
      { index: 1, text: 'I felt helpless.',   reverse_scored: false },
      { index: 2, text: 'I felt depressed.',  reverse_scored: false },
      { index: 3, text: 'I felt hopeless.',   reverse_scored: false },
    ],
    response_scale: [
      { value: 1, label: 'Never' },
      { value: 2, label: 'Rarely' },
      { value: 3, label: 'Sometimes' },
      { value: 4, label: 'Often' },
      { value: 5, label: 'Always' },
    ],
    per_item_response_scales: null,
    reverse_scored_indices: [],
    scoring: {
      method: 'sum_then_tscore',
      raw_range: [4, 20],
      t_score_mean: 50,
      t_score_sd: 10,
      direction: 'higher_is_worse',
      clinical_threshold_tscore: 60,
      notes: 'Sum all 4 items (raw 4–20). Convert to T-score (mean=50, SD=10). Higher = more depressive symptoms. Clinical concern: T≥60.',
    },
  },

  // ── PROMIS Sleep Disturbance ────────────────────────────────────────────────
  promis_sleep_4a: {
    instrument_key: 'promis_sleep_4a',
    full_name: 'PROMIS Sleep Disturbance — Short Form 4a',
    source: 'PROMIS Item Bank v1.0, Short Form 4a',
    license: 'Free, open access',
    timeframe: 'In the past 7 days',
    applies_to_symptom_keys: ['sleep_disturbance'],
    question_stem: 'In the past 7 days...',
    questions: [
      { index: 0, text: 'My sleep quality was...',      reverse_scored: true  }, // uses quality scale below
      { index: 1, text: 'My sleep was refreshing.',     reverse_scored: true  }, // uses standard scale
      { index: 2, text: 'I had a problem with my sleep.',   reverse_scored: false },
      { index: 3, text: 'I had difficulty falling asleep.', reverse_scored: false },
    ],
    // Item 0 uses a different response scale; items 1–3 share the standard scale.
    per_item_response_scales: {
      0: [
        { value: 1, label: 'Very poor'  },
        { value: 2, label: 'Poor'       },
        { value: 3, label: 'Fair'       },
        { value: 4, label: 'Good'       },
        { value: 5, label: 'Very good'  },
      ],
      1: [
        { value: 1, label: 'Not at all'  },
        { value: 2, label: 'A little bit' },
        { value: 3, label: 'Somewhat'    },
        { value: 4, label: 'Quite a bit' },
        { value: 5, label: 'Very much'   },
      ],
      2: [
        { value: 1, label: 'Not at all'  },
        { value: 2, label: 'A little bit' },
        { value: 3, label: 'Somewhat'    },
        { value: 4, label: 'Quite a bit' },
        { value: 5, label: 'Very much'   },
      ],
      3: [
        { value: 1, label: 'Not at all'  },
        { value: 2, label: 'A little bit' },
        { value: 3, label: 'Somewhat'    },
        { value: 4, label: 'Quite a bit' },
        { value: 5, label: 'Very much'   },
      ],
    },
    response_scale: null, // use per_item_response_scales
    reverse_scored_indices: [0, 1],
    scoring: {
      method: 'sum_then_tscore',
      raw_range: [4, 20],
      t_score_mean: 50,
      t_score_sd: 10,
      direction: 'higher_is_worse',
      clinical_threshold_tscore: null,
      notes: 'Reverse-score items 0 and 1 before summing. Raw range 4–20. Convert to T-score. Higher = more sleep disturbance. Reverse scoring handled automatically via PROMIS lookup table.',
    },
  },

  // ── PROMIS Physical Function ────────────────────────────────────────────────
  promis_physical_function_4a: {
    instrument_key: 'promis_physical_function_4a',
    full_name: 'PROMIS Physical Function — Short Form 4a',
    source: 'PROMIS Item Bank v1.0, Short Form 4a',
    license: 'Free, open access',
    timeframe: 'Current ability (no specific timeframe)',
    applies_to_symptom_keys: ['reduced_exercise_tolerance'],
    question_stem: 'Are you able to...',
    questions: [
      { index: 0, text: 'Are you able to do chores such as vacuuming or yard work?', reverse_scored: false },
      { index: 1, text: 'Are you able to go up and down stairs at a normal pace?',   reverse_scored: false },
      { index: 2, text: 'Are you able to go for a walk of at least 15 minutes?',     reverse_scored: false },
      { index: 3, text: 'Are you able to run errands and shop?',                     reverse_scored: false },
    ],
    response_scale: [
      { value: 5, label: 'Without any difficulty' },
      { value: 4, label: 'With a little difficulty' },
      { value: 3, label: 'With some difficulty' },
      { value: 2, label: 'With much difficulty' },
      { value: 1, label: 'Unable to do' },
    ],
    per_item_response_scales: null,
    reverse_scored_indices: [],
    scoring: {
      method: 'sum_then_tscore',
      raw_range: [4, 20],
      t_score_mean: 50,
      t_score_sd: 10,
      direction: 'higher_is_better',
      clinical_threshold_tscore: null,
      notes: 'Sum all 4 items (raw 4–20). Convert to T-score. Higher = BETTER physical function (opposite direction from other PROMIS domains).',
    },
  },

  // ── mMRC Dyspnea Scale ──────────────────────────────────────────────────────
  mmrc: {
    instrument_key: 'mmrc',
    full_name: 'mMRC Dyspnea Scale (Modified Medical Research Council)',
    source: 'Mahler & Wells (1988); MRC. Free, no license required.',
    license: 'Free, no license required',
    timeframe: 'Current / general experience',
    applies_to_symptom_keys: ['breathlessness_activity'],
    question_stem: null,
    questions: [
      {
        index: 0,
        text: 'Please select the description that best matches your experience of breathlessness:',
        reverse_scored: false,
      },
    ],
    response_scale: [
      { value: 0, label: 'I only get breathless with strenuous exercise.' },
      { value: 1, label: 'I get short of breath when hurrying on level ground or walking up a slight hill.' },
      { value: 2, label: 'I walk slower than most people my age on level ground because of breathlessness, or I have to stop to catch my breath when walking at my own pace.' },
      { value: 3, label: 'I stop for breath after walking about 100 metres or after a few minutes on level ground.' },
      { value: 4, label: 'I am too breathless to leave the house, or I get breathless when dressing or undressing.' },
    ],
    per_item_response_scales: null,
    reverse_scored_indices: [],
    scoring: {
      method: 'single_item_grade',
      raw_range: [0, 4],
      direction: 'higher_is_worse',
      notes: 'Single item. Score is the grade selected (0–4). Track grade longitudinally — no summing or T-score conversion.',
    },
  },

  // ── PSS-4 EMA-Adapted ───────────────────────────────────────────────────────
  // IMPORTANT: Stress uses a grant-required scheduled protocol (4x/day, randomly
  // sampled, 30-day protocol). It is NOT patient-initiated. Do NOT enroll stress
  // via Screen 4 — it is handled by a separate scheduling system.
  pss4_ema: {
    instrument_key: 'pss4_ema',
    full_name: 'PSS-4 EMA-Adapted (Murray et al., 2023)',
    source: 'Murray et al. (2023), Stress and Health, 39(4), 841–853. Open access; free for research use.',
    license: 'Open access; free for research use',
    timeframe: 'Dynamic — time reference generated from trigger timestamp (e.g. "In the past 30 minutes" or "2 hours ago"). Prompts MUST reference the trigger time, NOT the response time.',
    applies_to_symptom_keys: ['stress'],
    scheduled_protocol: true,
    scheduled_protocol_note: '4x/day, randomly sampled within participant-defined windows, 30-day protocol. NOT patient-initiated.',
    question_stem: '[Time reference], how much did you feel...',
    questions: [
      { index: 0, text: '...unable to control the important things in your life?',        reverse_scored: false },
      { index: 1, text: '...confident about your ability to handle your personal problems?', reverse_scored: true  },
      { index: 2, text: '...that things were going your way?',                             reverse_scored: true  },
      { index: 3, text: '...difficulties were piling up so high that you could not overcome them?', reverse_scored: false },
    ],
    response_scale: [
      { value: 0, label: 'Never' },
      { value: 1, label: 'Almost never' },
      { value: 2, label: 'Sometimes' },
      { value: 3, label: 'Fairly often' },
      { value: 4, label: 'Very often' },
    ],
    per_item_response_scales: null,
    reverse_scored_indices: [1, 2],
    reverse_score_transform: { 0: 4, 1: 3, 2: 2, 3: 1, 4: 0 },
    scoring: {
      method: 'sum_with_reverse',
      raw_range: [0, 16],
      direction: 'higher_is_worse',
      notes: 'Reverse items 1 and 2 (0→4, 1→3, 2→2, 3→1, 4→0). Sum all 4 (range 0–16). Report as running mean per day and per week for longitudinal model.',
    },
  },

  // ── Single-Item: Leg Swelling ───────────────────────────────────────────────
  single_item_leg_swelling: {
    instrument_key: 'single_item_leg_swelling',
    full_name: 'Single-Item Self-Report — Leg Swelling',
    source: 'No validated instrument. Single-item self-report confirmed sufficient by Dr. Potter.',
    license: 'N/A',
    timeframe: 'Current / recent',
    applies_to_symptom_keys: ['leg_swelling'],
    question_stem: null,
    questions: [
      {
        index: 0,
        text: 'Are you experiencing leg swelling right now or recently?',
        type: 'yes_no',
        reverse_scored: false,
      },
      {
        index: 1,
        text: 'How would you rate the severity?',
        type: 'severity_scale',
        conditional_on: { item_index: 0, answer: 'yes' },
        reverse_scored: false,
      },
    ],
    response_scale: null,
    per_item_response_scales: {
      0: [{ value: 1, label: 'Yes' }, { value: 0, label: 'No' }],
      1: { type: 'numeric_scale', min: 0, max: 10, labels: { 0: 'None', 10: 'Very severe' } },
    },
    reverse_scored_indices: [],
    scoring: {
      method: 'binary_plus_severity',
      notes: 'Binary (yes/no) + severity rating 0–10. No conversion required.',
    },
  },

  // ── Single-Item: Unintentional Weight Change ────────────────────────────────
  single_item_weight_change: {
    instrument_key: 'single_item_weight_change',
    full_name: 'Single-Item Self-Report — Unintentional Weight Change',
    source: 'No validated instrument. Single-item self-report.',
    license: 'N/A',
    timeframe: 'Recent',
    applies_to_symptom_keys: ['weight_change'],
    question_stem: null,
    questions: [
      {
        index: 0,
        text: 'Have you noticed any unintentional changes in your weight?',
        type: 'categorical',
        reverse_scored: false,
      },
      {
        index: 1,
        text: 'Approximately how much? (lbs)',
        type: 'numeric_entry',
        conditional_on: { item_index: 0, answer: ['yes_gained', 'yes_lost'] },
        reverse_scored: false,
      },
    ],
    response_scale: null,
    per_item_response_scales: {
      0: [
        { value: 'yes_gained', label: 'Yes (gained)' },
        { value: 'yes_lost',   label: 'Yes (lost)'   },
        { value: 'no',         label: 'No'            },
      ],
    },
    reverse_scored_indices: [],
    scoring: {
      method: 'categorical_plus_numeric',
      clinical_flag: 'Rapid gain >2 lbs/day is a clinical signal of interest.',
      notes: 'Categorical (gained/lost/no) + numeric estimate in lbs.',
    },
  },

  // ── Single-Item: Waking Short of Breath at Night (PND) ─────────────────────
  single_item_pnd: {
    instrument_key: 'single_item_pnd',
    full_name: 'Single-Item Self-Report — Waking Short of Breath at Night (PND)',
    source: 'No validated instrument. Single-item self-report reinstated per Dr. Potter.',
    license: 'N/A',
    timeframe: 'In the past week',
    applies_to_symptom_keys: ['waking_sob_night'],
    question_stem: null,
    questions: [
      {
        index: 0,
        text: 'In the past week, have you woken up at night feeling short of breath?',
        type: 'yes_no',
        reverse_scored: false,
      },
      {
        index: 1,
        text: 'How many nights this week?',
        type: 'numeric_scale',
        conditional_on: { item_index: 0, answer: 'yes' },
        reverse_scored: false,
      },
    ],
    response_scale: null,
    per_item_response_scales: {
      0: [{ value: 1, label: 'Yes' }, { value: 0, label: 'No' }],
      1: { type: 'numeric_scale', min: 1, max: 7 },
    },
    reverse_scored_indices: [],
    scoring: {
      method: 'binary_plus_count',
      notes: 'Binary (yes/no) + frequency count 1–7 nights.',
    },
  },

  // ── HFRDIS (Quality of Life section — NOT part of CV monitoring flow) ───────
  hfrdis: {
    instrument_key: 'hfrdis',
    full_name: 'HFRDIS — Hot Flash Related Daily Interference Scale',
    source: 'Carpenter JS (2001), J Pain Symptom Manage, 22(6), 979–989. Free for research use.',
    license: 'Free for research use',
    timeframe: 'In the past week',
    applies_to_symptom_keys: ['hot_flashes'],
    section_note: 'Lives in the Quality of Life section, NOT the CV monitoring flow. Do not include in standard EMA enrollment.',
    instructions: 'Please rate how much hot flashes have interfered with the following areas of your life during the PAST WEEK. Use a scale from 0 to 10, where 0 means no interference and 10 means complete interference. If you are not experiencing hot flashes, mark 0.',
    question_stem: null,
    questions: [
      { index: 0,  text: 'Work (include work at home)',  reverse_scored: false },
      { index: 1,  text: 'Social activities',            reverse_scored: false },
      { index: 2,  text: 'Leisure activities',           reverse_scored: false },
      { index: 3,  text: 'Sleep',                        reverse_scored: false },
      { index: 4,  text: 'Mood',                         reverse_scored: false },
      { index: 5,  text: 'Concentration',                reverse_scored: false },
      { index: 6,  text: 'Relations with others',        reverse_scored: false },
      { index: 7,  text: 'Sexuality',                    reverse_scored: false },
      { index: 8,  text: 'Enjoyment of life',            reverse_scored: false },
      { index: 9,  text: 'Overall quality of life',      reverse_scored: false },
    ],
    response_scale: { type: 'numeric_scale', min: 0, max: 10, labels: { 0: 'Does not interfere', 10: 'Completely interferes' } },
    per_item_response_scales: null,
    reverse_scored_indices: [],
    scoring: {
      method: 'sum_and_average',
      raw_range: [0, 100],
      average_range: [0, 10],
      severity_bands: { mild: [0, 3.9], moderate: [4, 6.9], severe: [7, 10] },
      mid: 1.66,
      direction: 'higher_is_worse',
      notes: 'Sum all 10 items (0–100). Average = total ÷ 10 (0–10). MID = 1.66 average score points.',
    },
  },

};

module.exports = {
  INSTRUMENTS,
  SYMPTOM_INSTRUMENT_MAP,
  EMA_ENROLLMENT_KEYS,
  WEEKLY_INSTRUMENT_KEYS,
  PROMIS_T_SCORES,
  lookupTScore,
};
