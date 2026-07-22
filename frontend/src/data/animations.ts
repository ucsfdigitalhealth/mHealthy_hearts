/**
 * Content model for the "Explore & Learn" educational animation library.
 *
 * Source of truth is Roberto's topic taxonomy (MHE-24). Topics that have a
 * produced animation carry a `vimeoUrl`; planned topics carry `vimeoUrl: null`
 * so the roadmap lives in code and new animations can be switched on by pasting
 * a link — no restructuring required.
 *
 * Both the category list and the taxonomy are a working draft and expected to
 * be renamed/merged/split once wireframes land, so nothing here is persisted to
 * the backend or keyed on by anything but `id`.
 */

import type { Ionicons } from '@expo/vector-icons';

export type CategoryId =
  | 'diet'
  | 'physical-activity'
  | 'sleep'
  | 'nicotine'
  | 'bmi'
  | 'blood-lipids'
  | 'blood-glucose'
  | 'blood-pressure'
  | 'heart-health'
  | 'medication'
  | 'social-support'
  | 'stress'
  | 'weight'
  | 'acs-lifestyle'
  | 'healthy-aging'
  | 'behavior-change'
  | 'symptom-maintenance'
  | 'prostate-cancer';

export interface AnimationCategory {
  id: CategoryId;
  label: string;
  /** Shown on the category chip and as the tile placeholder glyph. */
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

export interface Animation {
  id: string;
  title: string;
  /** Original/working title where it differs from the display title. */
  altTitle?: string;
  categoryId: CategoryId;
  /** `null` for planned topics with no animation produced yet. */
  vimeoUrl: string | null;
  /** Extra search terms beyond the title and category label. */
  keywords?: string[];
}

export const ANIMATION_CATEGORIES: AnimationCategory[] = [
  { id: 'diet',                 label: 'Diet',                  icon: 'nutrition-outline',    color: '#34C759' },
  { id: 'physical-activity',    label: 'Physical Activity',     icon: 'walk-outline',         color: '#FF9500' },
  { id: 'sleep',                label: 'Sleep',                 icon: 'moon-outline',         color: '#5856D6' },
  { id: 'nicotine',             label: 'Nicotine Exposure',     icon: 'ban-outline',          color: '#8E8E93' },
  { id: 'bmi',                  label: 'BMI',                   icon: 'body-outline',         color: '#00C7BE' },
  { id: 'blood-lipids',         label: 'Blood Lipids',          icon: 'water-outline',        color: '#FF375F' },
  { id: 'blood-glucose',        label: 'Blood Glucose',         icon: 'analytics-outline',    color: '#AF52DE' },
  { id: 'blood-pressure',       label: 'Blood Pressure',        icon: 'heart-circle-outline', color: '#FF3B30' },
  { id: 'heart-health',         label: 'Heart Health',          icon: 'heart-outline',        color: '#FF2D55' },
  { id: 'medication',           label: 'Medication',            icon: 'medkit-outline',       color: '#0A84FF' },
  { id: 'social-support',       label: 'Social Support',        icon: 'people-outline',       color: '#FFB340' },
  { id: 'stress',               label: 'Stress',                icon: 'pulse-outline',        color: '#FF6482' },
  { id: 'weight',              label: 'Weight',                 icon: 'scale-outline',        color: '#30B0C7' },
  { id: 'acs-lifestyle',        label: 'Cancer & Lifestyle',    icon: 'ribbon-outline',       color: '#64D2FF' },
  { id: 'healthy-aging',        label: 'Healthy Aging',         icon: 'accessibility-outline', color: '#A2845E' },
  { id: 'behavior-change',      label: 'Behavior Change',       icon: 'trending-up-outline',  color: '#41a39d' },
  { id: 'symptom-maintenance',  label: 'Symptom Management',    icon: 'clipboard-outline',    color: '#BF5AF2' },
  { id: 'prostate-cancer',      label: 'Prostate Cancer',       icon: 'shield-checkmark-outline', color: '#4A7BA7' },
];

const CATEGORY_BY_ID: Record<CategoryId, AnimationCategory> = ANIMATION_CATEGORIES.reduce(
  (acc, category) => {
    acc[category.id] = category;
    return acc;
  },
  {} as Record<CategoryId, AnimationCategory>
);

export function getCategory(id: CategoryId): AnimationCategory {
  return CATEGORY_BY_ID[id];
}

export const ANIMATIONS: Animation[] = [
  // ---------------------------------------------------------------- Diet
  {
    id: 'healthy-plate',
    title: 'How to Build a Healthy Plate',
    categoryId: 'diet',
    vimeoUrl: 'https://vimeo.com/1140461326/72c5237bc3',
    keywords: ['plate', 'portion', 'balance'],
  },
  {
    id: 'serving-sizes',
    title: 'Serving Sizes: How Much Should We Eat?',
    categoryId: 'diet',
    vimeoUrl: 'https://vimeo.com/1154735145/951229ac23',
    keywords: ['portion', 'servings'],
  },
  {
    id: 'nutrition-labels',
    title: 'Nutrition Facts: Learning the Labels',
    categoryId: 'diet',
    vimeoUrl: 'https://vimeo.com/1184582399/bb46d2b8b6',
    keywords: ['label', 'nutrition facts'],
  },
  {
    id: 'grocery-store',
    title: 'Navigating the Grocery Store',
    altTitle: 'From Plate to Store: A Supermarket Cheat Sheet',
    categoryId: 'diet',
    vimeoUrl: 'https://vimeo.com/1140462099/fd311beb30',
    keywords: ['shopping', 'supermarket', 'groceries'],
  },
  {
    id: 'ultra-processed-foods',
    title: 'Understanding Ultra-Processed Foods',
    categoryId: 'diet',
    vimeoUrl: 'https://vimeo.com/1184585433/78b4861d09',
    keywords: ['processed', 'packaged'],
  },
  {
    id: 'fruits',
    title: 'Fruits for Your Health',
    categoryId: 'diet',
    vimeoUrl: 'https://vimeo.com/1130343317/9b1c6e7a24',
    keywords: ['fruit', 'produce'],
  },
  {
    id: 'vegetables',
    title: 'The Power of Vegetables',
    categoryId: 'diet',
    vimeoUrl: 'https://vimeo.com/1130667340/550e2a98b7',
    keywords: ['veggies', 'produce'],
  },
  {
    id: 'healthy-proteins',
    title: 'Power Up with Healthy Proteins',
    categoryId: 'diet',
    vimeoUrl: 'https://vimeo.com/1184588846/cb2ca2aaf9',
    keywords: ['protein', 'lean meat', 'beans'],
  },
  {
    id: 'grains',
    title: 'Getting the Most From Your Grains',
    categoryId: 'diet',
    vimeoUrl: 'https://vimeo.com/1184990559/588da6409a',
    keywords: ['whole grain', 'fiber'],
  },
  {
    id: 'mindful-eating',
    title: 'Mastering Mindful Eating',
    categoryId: 'diet',
    vimeoUrl: 'https://vimeo.com/1184993632/53d33f1d49',
    keywords: ['mindful', 'hunger cues'],
  },
  {
    id: 'food-label-claims',
    title: 'Food Label Claims',
    categoryId: 'diet',
    vimeoUrl: 'https://vimeo.com/1190365410/7d6d08e618',
    keywords: ['label', 'marketing', 'claims'],
  },
  {
    id: 'brat-diet',
    title: 'The BRAT Diet',
    categoryId: 'diet',
    vimeoUrl: 'https://vimeo.com/1165764353/59c0a9499a',
    keywords: ['bland', 'upset stomach', 'nausea'],
  },
  {
    id: 'food-myths',
    title: 'Debunking Common Food Myths',
    altTitle: 'Nutrition Unmasked',
    categoryId: 'diet',
    vimeoUrl: 'https://vimeo.com/1117491895/571fbb3b38',
    keywords: ['myths', 'misinformation'],
  },

  // --------------------------------------------------- Physical Activity
  {
    id: 'movement-is-life',
    title: 'Movement is Life',
    categoryId: 'physical-activity',
    vimeoUrl: 'https://vimeo.com/1117462308/1d943c8f35',
    keywords: ['movement', 'activity'],
  },
  {
    id: 'short-term-exercise-benefits',
    title: 'Short Term Benefits of Exercise',
    altTitle: 'Feel Better Today',
    categoryId: 'physical-activity',
    vimeoUrl: 'https://vimeo.com/1159256823/80ea96b04f',
    keywords: ['benefits', 'mood', 'energy'],
  },
  {
    id: 'move-smarter',
    title: 'Move Smarter, Not Harder: Fitness Backed by Science',
    categoryId: 'physical-activity',
    vimeoUrl: 'https://vimeo.com/1095988021/3390156561',
    keywords: ['fitness', 'science', 'training'],
  },
  {
    id: 'resistance-training-benefits',
    title: 'Resistance Training Benefits and Recommendations',
    categoryId: 'physical-activity',
    vimeoUrl: 'https://vimeo.com/1130345005/5613b52e6b',
    keywords: ['strength', 'weights', 'resistance'],
  },
  {
    id: 'resistance-training-tips',
    title: 'Resistance Training Tips',
    categoryId: 'physical-activity',
    vimeoUrl: 'https://vimeo.com/1130641612/ca8b68a132',
    keywords: ['strength', 'weights', 'form'],
  },
  {
    id: 'flexibility-stretching',
    title: 'Flexibility & Stretching',
    categoryId: 'physical-activity',
    vimeoUrl: 'https://vimeo.com/1140476290/43bd5804f5',
    keywords: ['stretch', 'mobility', 'flexibility'],
  },
  {
    id: 'long-term-exercise-benefits',
    title: 'Long Term Benefits of Exercise',
    altTitle: 'Live Longer, Stay Stronger',
    categoryId: 'physical-activity',
    vimeoUrl: 'https://vimeo.com/1140488906/2cf5e139e2',
    keywords: ['longevity', 'benefits'],
  },
  {
    id: 'sedentary-behavior',
    title: 'Sedentary Behavior',
    altTitle: 'Sit Less & Stand Up for Your Health',
    categoryId: 'physical-activity',
    vimeoUrl: 'https://vimeo.com/1119468685/16e8c08316',
    keywords: ['sitting', 'sedentary', 'standing'],
  },
  {
    id: 'activity-and-heart-health',
    title: 'Physical Activity and Heart Health',
    categoryId: 'physical-activity',
    vimeoUrl: null,
  },

  // --------------------------------------------------------------- Sleep
  {
    id: 'importance-of-sleep',
    title: 'Importance of Sleep',
    categoryId: 'sleep',
    vimeoUrl: 'https://vimeo.com/1140475340/9de7c9753e',
    keywords: ['rest', 'sleep'],
  },
  {
    id: 'sleep-hygiene',
    title: 'Sleep Hygiene',
    categoryId: 'sleep',
    vimeoUrl: 'https://vimeo.com/1130665734/dde34601b4',
    keywords: ['bedtime', 'routine', 'insomnia'],
  },

  // ---------------------------------------------------- Nicotine / BMI / labs
  { id: 'smoking-nicotine', title: 'Smoking & Nicotine Exposure', categoryId: 'nicotine', vimeoUrl: null },
  { id: 'body-composition', title: 'Body Composition and Heart Health', categoryId: 'bmi', vimeoUrl: null },
  { id: 'blood-lipids-basics', title: 'Blood Lipids', categoryId: 'blood-lipids', vimeoUrl: null },
  { id: 'blood-sugar-basics', title: 'Blood Sugar & Glucose', categoryId: 'blood-glucose', vimeoUrl: null },
  { id: 'blood-pressure-basics', title: 'Blood Pressure', categoryId: 'blood-pressure', vimeoUrl: null },
  { id: 'importance-of-heart-health', title: 'Importance of Heart Health', categoryId: 'heart-health', vimeoUrl: null },

  // ------------------------------------- Medication & Treatment Management
  { id: 'medication-adherence', title: 'Medication Adherence: Simple Systems That Work', categoryId: 'medication', vimeoUrl: null },
  { id: 'side-effects-red-flags', title: 'Side Effects & Red Flags: When to Call Your Doctor', categoryId: 'medication', vimeoUrl: null },
  { id: 'prostate-treatment-metabolic', title: 'Prostate Cancer Treatments & Heart–Metabolic Health', categoryId: 'medication', vimeoUrl: null },

  // ------------------------------------------------ Social support / stress
  {
    id: 'social-support',
    title: 'Social Support',
    categoryId: 'social-support',
    vimeoUrl: 'https://vimeo.com/1132650371/b62f0cf835',
    keywords: ['family', 'friends', 'support'],
  },
  {
    id: 'stress-good-and-bad',
    title: 'Stress: The Good and The Bad',
    categoryId: 'stress',
    vimeoUrl: 'https://vimeo.com/1190380142/b5b5392427',
    keywords: ['stress', 'anxiety'],
  },
  {
    id: 'stress-management',
    title: 'Stress Management Techniques',
    altTitle: 'Healthy Buckeyes',
    categoryId: 'stress',
    vimeoUrl: 'https://vimeo.com/1168756189/2da8ede58b',
    keywords: ['coping', 'relaxation', 'stress'],
  },

  // -------------------------------------------------------------- Weight
  {
    id: 'healthy-weight-what',
    title: 'What is a Healthy Weight?',
    categoryId: 'weight',
    vimeoUrl: 'https://vimeo.com/1190569219/aa1569121d',
    keywords: ['weight'],
  },
  {
    id: 'healthy-weight-benefits',
    title: 'Benefits of a Healthy Weight',
    categoryId: 'weight',
    vimeoUrl: 'https://vimeo.com/1190379435/99d8c06a71',
    keywords: ['weight', 'benefits'],
  },

  // ---------------------------------------------- ACS lifestyle recommendations
  {
    id: 'acs-survivors',
    title: 'Recommendations for Cancer Survivors',
    altTitle: 'Additional Cancer Recommendations for Cancer Survivors',
    categoryId: 'acs-lifestyle',
    vimeoUrl: 'https://vimeo.com/1029666489/07bc862cb1',
    keywords: ['cancer', 'survivorship'],
  },
  {
    id: 'acs-prevention',
    title: 'Recommendations for Prevention',
    altTitle: 'Lifestyle Recommendations for Cancer Prevention and Survivorship',
    categoryId: 'acs-lifestyle',
    vimeoUrl: 'https://vimeo.com/1029667384/71a012bcce',
    keywords: ['cancer', 'prevention'],
  },

  // -------------------------------------------- Healthy aging & function
  { id: 'staying-strong', title: 'Staying Strong: Muscle, Balance, and Independence', categoryId: 'healthy-aging', vimeoUrl: null },
  { id: 'fall-prevention', title: 'Fall Prevention and Safe Movement at Home', categoryId: 'healthy-aging', vimeoUrl: null },
  { id: 'mobility-modifications', title: 'Mobility-Friendly Exercise Modifications', categoryId: 'healthy-aging', vimeoUrl: null },
  { id: 'healthy-aging-habits', title: 'Healthy Aging with Heart Health Habits', categoryId: 'healthy-aging', vimeoUrl: null },

  // ----------------------------------------------------- Behavior change
  {
    id: 'smart-goal',
    title: 'Building a SMART Goal',
    categoryId: 'behavior-change',
    vimeoUrl: 'https://vimeo.com/1130308607/b09fec6976',
    keywords: ['goals', 'smart', 'planning'],
  },
  {
    id: 'values-and-actions',
    title: 'Aligning Values with Actions',
    categoryId: 'behavior-change',
    vimeoUrl: 'https://vimeo.com/1132650359/374f1799a2',
    keywords: ['values', 'motivation'],
  },

  // ------------------------------------------------ Symptom maintenance
  { id: 'symptom-management-diet', title: 'Symptom Management with Diet', categoryId: 'symptom-maintenance', vimeoUrl: null },
  { id: 'relapse-planning', title: 'Maintenance and Planning for Relapse', categoryId: 'symptom-maintenance', vimeoUrl: null },

  // ------------------------------------- Prostate cancer survivor topics
  { id: 'prostate-heart-health', title: 'Prostate Cancer and Heart Health', categoryId: 'prostate-cancer', vimeoUrl: null },
  { id: 'prostate-fatigue', title: 'Managing Fatigue After Prostate Cancer', categoryId: 'prostate-cancer', vimeoUrl: null },
  { id: 'pelvic-floor', title: 'Pelvic Floor Exercises for Urinary Control', categoryId: 'prostate-cancer', vimeoUrl: null },
  { id: 'hormone-therapy-metabolic', title: 'Hormone Therapy & Metabolic Health', categoryId: 'prostate-cancer', vimeoUrl: null },
  { id: 'emotional-health-prostate', title: 'Emotional Health After Prostate Cancer', categoryId: 'prostate-cancer', vimeoUrl: null },
  { id: 'adt-heart-health', title: 'Staying Heart-Healthy on ADT', categoryId: 'prostate-cancer', vimeoUrl: null },
];

/** Animations that have a produced Vimeo link — the only ones shown in the UI today. */
export const AVAILABLE_ANIMATIONS: Animation[] = ANIMATIONS.filter(a => a.vimeoUrl !== null);

/** Categories with at least one produced animation, used to build the filter chips. */
export const AVAILABLE_CATEGORIES: AnimationCategory[] = ANIMATION_CATEGORIES.filter(category =>
  AVAILABLE_ANIMATIONS.some(a => a.categoryId === category.id)
);

export function getAnimationById(id: string): Animation | undefined {
  return ANIMATIONS.find(a => a.id === id);
}

/**
 * Free-text search across title, alternate title, category label and keywords.
 * Title-only felt too narrow given topics are often known by their working
 * title ("Nutrition Unmasked") rather than the display title.
 */
export function searchAnimations(animations: Animation[], query: string): Animation[] {
  const q = query.trim().toLowerCase();
  if (!q) return animations;

  return animations.filter(a => {
    const haystack = [
      a.title,
      a.altTitle ?? '',
      getCategory(a.categoryId).label,
      ...(a.keywords ?? []),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

/**
 * Deterministic "animation of the day" — stable for a given calendar date so
 * the hero card doesn't shuffle on every re-render, and rotates daily.
 */
export function getAnimationOfTheDay(date: Date = new Date()): Animation {
  const dayIndex = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000
  );
  return AVAILABLE_ANIMATIONS[dayIndex % AVAILABLE_ANIMATIONS.length];
}
