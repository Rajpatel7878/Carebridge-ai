import type {
  ActivityEvent,
  ConditionPrevalenceItem,
  DistrictHealthMetric,
  MonthlyPopulationMetric,
  RiskDistributionItem,
  RiskFactorBreakdown,
} from '@/types/domain';

/**
 * Fictional aggregated population health & operational analytics (Phase 2 UI mock data).
 */
export const POPULATION_KPI_SUMMARY = {
  totalPatients: 4820,
  totalPatientsDelta: '+8.4% this quarter',
  totalDoctors: 64,
  activeFacilities: 18,
  highRiskPatients: 412,
  highRiskSharePercent: 8.5,
  pendingReferrals: 38,
  urgentReferrals: 9,
  monthlyAppointments: 1294,
  appointmentCompletionRate: 91.2,
  followUpClosureRate: 86.4,
  screeningCoverageRate: 84.6,
  medianReferralDays: 3.4,
} as const;

export const MOCK_RISK_DISTRIBUTION: RiskDistributionItem[] = [
  {
    tier: 'Low Risk',
    level: 'low',
    patients: 2690,
    percentage: 55.8,
    description:
      'Routine annual preventive screening and self-care maintenance.',
  },
  {
    tier: 'Moderate Risk',
    level: 'moderate',
    patients: 1718,
    percentage: 35.6,
    description:
      'Early chronic indicators managed with quarterly primary care follow-up.',
  },
  {
    tier: 'High Risk',
    level: 'high',
    patients: 318,
    percentage: 6.6,
    description:
      'Active multi-factor risk requiring specialist co-management within 14 days.',
  },
  {
    tier: 'Critical Risk',
    level: 'critical',
    patients: 94,
    percentage: 2.0,
    description:
      'Immediate clinician review, priority outreach, and rapid referral within 72 hours.',
  },
];

export const MOCK_MONTHLY_TRENDS: MonthlyPopulationMetric[] = [
  {
    month: 'Jun',
    screenings: 640,
    followUpsCompleted: 512,
    highRiskIdentified: 58,
    referralsClosed: 74,
  },
  {
    month: 'Jul',
    screenings: 710,
    followUpsCompleted: 586,
    highRiskIdentified: 64,
    referralsClosed: 83,
  },
  {
    month: 'Aug',
    screenings: 765,
    followUpsCompleted: 648,
    highRiskIdentified: 61,
    referralsClosed: 91,
  },
  {
    month: 'Sep',
    screenings: 820,
    followUpsCompleted: 704,
    highRiskIdentified: 69,
    referralsClosed: 98,
  },
  {
    month: 'Oct',
    screenings: 890,
    followUpsCompleted: 772,
    highRiskIdentified: 74,
    referralsClosed: 112,
  },
  {
    month: 'Nov',
    screenings: 945,
    followUpsCompleted: 832,
    highRiskIdentified: 71,
    referralsClosed: 121,
  },
];

export const MOCK_CONDITION_PREVALENCE: ConditionPrevalenceItem[] = [
  {
    condition: 'Hypertension',
    patients: 1420,
    controlledRate: 74,
    highRiskShare: 14,
  },
  {
    condition: 'Type 2 Diabetes',
    patients: 1185,
    controlledRate: 69,
    highRiskShare: 18,
  },
  {
    condition: 'Dyslipidemia',
    patients: 960,
    controlledRate: 78,
    highRiskShare: 11,
  },
  {
    condition: 'Respiratory / Asthma',
    patients: 540,
    controlledRate: 81,
    highRiskShare: 12,
  },
  {
    condition: 'Chronic Kidney Disease',
    patients: 310,
    controlledRate: 64,
    highRiskShare: 29,
  },
  {
    condition: 'Nutritional Anemia',
    patients: 485,
    controlledRate: 85,
    highRiskShare: 6,
  },
];

export const MOCK_DISTRICT_METRICS: DistrictHealthMetric[] = [
  {
    district: 'North Valley',
    facilities: 4,
    enrolledPatients: 1040,
    screeningCoverage: 88.2,
    followUpCompletion: 90.4,
    highRiskCount: 74,
  },
  {
    district: 'Central District',
    facilities: 4,
    enrolledPatients: 1190,
    screeningCoverage: 91.0,
    followUpCompletion: 89.1,
    highRiskCount: 86,
  },
  {
    district: 'Eastside Metro',
    facilities: 3,
    enrolledPatients: 920,
    screeningCoverage: 84.5,
    followUpCompletion: 84.8,
    highRiskCount: 98,
  },
  {
    district: 'South River',
    facilities: 3,
    enrolledPatients: 680,
    screeningCoverage: 82.1,
    followUpCompletion: 86.0,
    highRiskCount: 59,
  },
  {
    district: 'Westbrook',
    facilities: 2,
    enrolledPatients: 560,
    screeningCoverage: 80.7,
    followUpCompletion: 83.2,
    highRiskCount: 47,
  },
  {
    district: 'Rural Highlands',
    facilities: 2,
    enrolledPatients: 430,
    screeningCoverage: 73.4,
    followUpCompletion: 78.6,
    highRiskCount: 48,
  },
];

export const MOCK_APPOINTMENT_BREAKDOWN = [
  { category: 'Confirmed', count: 518 },
  { category: 'Completed', count: 582 },
  { category: 'Pending', count: 114 },
  { category: 'Rescheduled', count: 56 },
  { category: 'Cancelled', count: 24 },
];

export const MOCK_PATIENT_RISK_FACTORS: RiskFactorBreakdown[] = [
  {
    factor: 'Glycemic Control (HbA1c)',
    status: 'watch',
    reading: '7.2%',
    target: '< 7.0%',
    explanation:
      'Improved by 0.4% since August; remains mildly above individualized management target.',
  },
  {
    factor: 'Blood Pressure Trend',
    status: 'watch',
    reading: '134/84 mmHg',
    target: '< 130/80 mmHg',
    explanation:
      'Mild Stage 1 elevation noted at clinic check; 14-day home log in progress.',
  },
  {
    factor: 'LDL Cholesterol',
    status: 'elevated',
    reading: '136 mg/dL',
    target: '< 100 mg/dL',
    explanation:
      'Above recommended cardiovascular preventive target; scheduled for review on Nov 24.',
  },
  {
    factor: 'Renal Function (eGFR)',
    status: 'optimal',
    reading: '88 mL/min',
    target: '> 60 mL/min',
    explanation:
      'Kidney filtration and urine albumin ratio remain well within healthy reference limits.',
  },
  {
    factor: 'Care & Follow-up Adherence',
    status: 'optimal',
    reading: '88%',
    target: '>= 85%',
    explanation:
      'Consistent completion of scheduled labs, retinal screening, and clinic visits.',
  },
];

export const MOCK_PATIENT_HBA1C_HISTORY = [
  { month: 'Feb', hba1c: 7.9, systolicBp: 142 },
  { month: 'May', hba1c: 7.6, systolicBp: 138 },
  { month: 'Aug', hba1c: 7.4, systolicBp: 136 },
  { month: 'Nov', hba1c: 7.2, systolicBp: 134 },
];

export const MOCK_ACTIVITY_FEED: ActivityEvent[] = [
  {
    id: 'ACT-01',
    roleScope: 'doctor',
    title: 'Critical ECG & Lipid Panel Flagged',
    description:
      'Harpreet Gill (PT-1043) escalated to urgent cardiology referral (REF-3024).',
    timestamp: '25 mins ago',
    tone: 'critical',
    actor: 'Dr. Raghav Kulkarni',
  },
  {
    id: 'ACT-02',
    roleScope: 'doctor',
    title: 'New Outreach Screening Uploaded',
    description:
      'Mateo Alvarez (PT-1047) metabolic screening panel queued for clinician review.',
    timestamp: '1 hour ago',
    tone: 'info',
    actor: 'North Valley Lab',
  },
  {
    id: 'ACT-03',
    roleScope: 'doctor',
    title: 'Cardiology Referral Accepted',
    description:
      'Dr. Meera Deshmukh confirmed Nov 19 appointment slot for Harpreet Gill.',
    timestamp: '4 hours ago',
    tone: 'success',
    actor: 'Dr. Meera Deshmukh',
  },
  {
    id: 'ACT-04',
    roleScope: 'doctor',
    title: 'Renal Follow-up Due This Week',
    description:
      'Lakshmi Narayanan (PT-1044) scheduled for teleconsult and repeat potassium check.',
    timestamp: 'Yesterday',
    tone: 'warning',
    actor: 'Care Coordination Queue',
  },
  {
    id: 'ACT-05',
    roleScope: 'admin',
    title: 'North Valley Mobile Screening Batch Imported',
    description:
      '62 community metabolic screenings logged with 94% follow-up slot assignment (mock data).',
    timestamp: '35 mins ago',
    tone: 'success',
    actor: 'North Valley Clinic',
  },
  {
    id: 'ACT-06',
    roleScope: 'admin',
    title: 'Rural Highlands Follow-up SLA Alert',
    description:
      'High-risk anticoagulation repeat lab (FUP-508) flagged for nurse outreach prioritization.',
    timestamp: '2 hours ago',
    tone: 'critical',
    actor: 'Highlands Outreach Clinic',
  },
  {
    id: 'ACT-07',
    roleScope: 'admin',
    title: 'Nephrology Referral Capacity Review',
    description:
      'South River Regional Hospital opened 6 additional priority consult slots for late November.',
    timestamp: '5 hours ago',
    tone: 'info',
    actor: 'Dr. Samuel Boateng',
  },
  {
    id: 'ACT-08',
    roleScope: 'admin',
    title: 'Eastside Polyclinic Appointment Audit Completed',
    description:
      'Weekly no-show rate dropped from 11.4% to 7.8% following structured reminder workflows.',
    timestamp: 'Yesterday',
    tone: 'warning',
    actor: 'Network Operations',
  },
];
