import type { Le8MetricId } from './le8MetricTypes';

export type Le8AssessmentRoute = 'BloodSugar' | 'BloodLipids' | 'Bmi' | 'Diet' | 'Smoking';

export type ScoringRow = {
  dotColor: string;
  label: string;
  points: string;
};

export type Le8MetricDetailConfig = {
  screenTitle: string;
  firstCardLabel: string;
  secondCardLabel: string;
  statsChartTitle: string;
  yAxisLabels: string[];
  scoringRows: ScoringRow[];
  firstCardAssessmentRoute?: Le8AssessmentRoute;
};

const scoringPhysicalActivity: ScoringRow[] = [
  { dotColor: '#059669', label: '150+ min moderate activity / wk', points: '100 pts' },
  { dotColor: '#84CC16', label: '120–149 min / wk', points: '90 pts' },
  { dotColor: '#EAB308', label: '90–119 min / wk', points: '80 pts' },
  { dotColor: '#F97316', label: '60–89 min / wk', points: '60 pts' },
  { dotColor: '#DC2626', label: '< 60 min / wk', points: '0 pts' },
];

const scoringSleep: ScoringRow[] = [
  { dotColor: '#059669', label: '7–9 hours sleep', points: '100 pts' },
  { dotColor: '#84CC16', label: '6–6.9 or 9–10 hours', points: '70 pts' },
  { dotColor: '#EAB308', label: '5–5.9 hours', points: '40 pts' },
  { dotColor: '#DC2626', label: '< 5 or > 10 hours', points: '0 pts' },
];

const scoringBp: ScoringRow[] = [
  { dotColor: '#059669', label: '< 120/80 mmHg', points: '100 pts' },
  { dotColor: '#84CC16', label: '120–129 / <80', points: '75 pts' },
  { dotColor: '#EAB308', label: '130–139 or 80–89', points: '50 pts' },
  { dotColor: '#DC2626', label: '≥ 140 or ≥ 90', points: '0 pts' },
];

const scoringBloodSugar: ScoringRow[] = [
  { dotColor: '#059669', label: 'Fasting glucose in target / HbA1c < 5.7%', points: '100 pts' },
  { dotColor: '#EAB308', label: 'Prediabetes range', points: '60 pts' },
  { dotColor: '#DC2626', label: 'Diabetes range', points: '0 pts' },
];

const scoringLipids: ScoringRow[] = [
  { dotColor: '#059669', label: 'Non-HDL < 130 mg/dL', points: '100 pts' },
  { dotColor: '#84CC16', label: '130–159 mg/dL', points: '60 pts' },
  { dotColor: '#F97316', label: '160–189 mg/dL', points: '40 pts' },
  { dotColor: '#DC2626', label: '≥ 190 mg/dL', points: '0–20 pts' },
];

const scoringBmi: ScoringRow[] = [
  { dotColor: '#059669', label: 'BMI 18.5–24.9', points: '100 pts' },
  { dotColor: '#EAB308', label: 'BMI 25–29.9', points: '70 pts' },
  { dotColor: '#DC2626', label: 'BMI ≥ 30 or < 18.5', points: '0 pts' },
];

const scoringDiet: ScoringRow[] = [
  { dotColor: '#059669', label: 'High adherence (MEPA 8–10)', points: '100 pts' },
  { dotColor: '#EAB308', label: 'Moderate (MEPA 5–7)', points: '50 pts' },
  { dotColor: '#DC2626', label: 'Low (MEPA 0–4)', points: '0 pts' },
];

const scoringSmoking: ScoringRow[] = [
  { dotColor: '#059669', label: 'Never / quit long-term', points: '100 pts' },
  { dotColor: '#3B82F6', label: 'Low risk pattern', points: '75 pts' },
  { dotColor: '#EAB308', label: 'Moderate risk', points: '50 pts' },
  { dotColor: '#DC2626', label: 'Current use / high risk', points: '0 pts' },
];

export const LE8_METRIC_DETAIL_CONFIG: Record<Le8MetricId, Le8MetricDetailConfig> = {
  physicalActivity: {
    screenTitle: 'Physical Activity',
    firstCardLabel: 'Step Count',
    secondCardLabel: 'Active Minutes',
    statsChartTitle: 'Daily activity',
    yAxisLabels: ['10k', '7.5k', '5k', '2.5k'],
    scoringRows: scoringPhysicalActivity,
  },
  sleep: {
    screenTitle: 'Sleep',
    firstCardLabel: 'Average Sleep',
    secondCardLabel: 'Sleep efficiency',
    statsChartTitle: 'Hours of sleep',
    yAxisLabels: ['9', '7.5', '6', '4.5'],
    scoringRows: scoringSleep,
  },
  bloodPressure: {
    screenTitle: 'Blood Pressure',
    firstCardLabel: "Today's BP",
    secondCardLabel: 'Weekly average',
    statsChartTitle: 'Blood pressure trend',
    yAxisLabels: ['140', '120', '100', '80'],
    scoringRows: scoringBp,
  },
  bloodSugar: {
    screenTitle: 'Blood Sugar',
    firstCardLabel: 'Latest reading',
    secondCardLabel: 'HbA1c / avg (self-report)',
    statsChartTitle: 'Glucose trend',
    yAxisLabels: ['200', '150', '100', '70'],
    scoringRows: scoringBloodSugar,
    firstCardAssessmentRoute: 'BloodSugar',
  },
  bloodLipids: {
    screenTitle: 'Blood Lipids',
    firstCardLabel: 'Non-HDL / total chol.',
    secondCardLabel: 'Weekly average',
    statsChartTitle: 'Cholesterol trend',
    yAxisLabels: ['220', '180', '140', '100'],
    scoringRows: scoringLipids,
    firstCardAssessmentRoute: 'BloodLipids',
  },
  bmi: {
    screenTitle: 'BMI',
    firstCardLabel: "Today's BMI",
    secondCardLabel: 'Weekly average',
    statsChartTitle: 'BMI trend',
    yAxisLabels: ['35', '30', '25', '18'],
    scoringRows: scoringBmi,
    firstCardAssessmentRoute: 'Bmi',
  },
  diet: {
    screenTitle: 'Nutrition',
    firstCardLabel: 'MEPA score',
    secondCardLabel: 'Diet score (0–100)',
    statsChartTitle: 'Diet adherence',
    yAxisLabels: ['10', '7.5', '5', '2.5'],
    scoringRows: scoringDiet,
    firstCardAssessmentRoute: 'Diet',
  },
  smoking: {
    screenTitle: 'Smoking',
    firstCardLabel: 'Risk score',
    secondCardLabel: 'Last updated',
    statsChartTitle: 'Score over time',
    yAxisLabels: ['100', '75', '50', '25'],
    scoringRows: scoringSmoking,
    firstCardAssessmentRoute: 'Smoking',
  },
};
