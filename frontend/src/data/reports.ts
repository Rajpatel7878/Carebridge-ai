import type { MedicalReport } from '@/types/domain';

/**
 * Fictional screening & laboratory report records (Phase 2 UI mock data).
 * Summaries represent static UI previews; no AI extraction runs in Phase 2.
 */
export const MOCK_REPORTS: MedicalReport[] = [
  {
    id: 'RPT-4091',
    patientId: 'PT-1042',
    patientName: 'Ananya Mehta',
    doctorId: 'DR-201',
    doctorName: 'Dr. Raghav Kulkarni',
    title: 'HbA1c & Comprehensive Metabolic Panel',
    category: 'Metabolic',
    labFacility: 'North Valley Diagnostics Lab',
    uploadedDate: '2026-11-08',
    reviewStatus: 'reviewed',
    riskFlag: 'moderate',
    plainLanguageSummary:
      'Average 3-month blood sugar (HbA1c 7.2%) is slightly above the 7.0% management goal, showing steady improvement from 7.6% last quarter. Kidney and liver markers are within normal range.',
    clinicalNote:
      'Glycemic control improving on current regimen. Reinforce evening dietary spacing and schedule 12-week repeat HbA1c.',
    recommendedNextStep:
      'Attend scheduled follow-up consult on Nov 24 and continue daily fasting glucose log.',
    biomarkers: [
      {
        name: 'HbA1c',
        value: '7.2%',
        referenceRange: '4.0% - 5.6%',
        flag: 'elevated',
      },
      {
        name: 'Fasting Glucose',
        value: '132 mg/dL',
        referenceRange: '70 - 99 mg/dL',
        flag: 'elevated',
      },
      {
        name: 'Serum Creatinine',
        value: '0.86 mg/dL',
        referenceRange: '0.60 - 1.10 mg/dL',
        flag: 'normal',
      },
      {
        name: 'eGFR',
        value: '88 mL/min',
        referenceRange: '> 60 mL/min',
        flag: 'normal',
      },
    ],
  },
  {
    id: 'RPT-4084',
    patientId: 'PT-1042',
    patientName: 'Ananya Mehta',
    doctorId: 'DR-201',
    doctorName: 'Dr. Raghav Kulkarni',
    title: 'Fasting Lipid Profile & Cardiovascular Screen',
    category: 'Cardiovascular',
    labFacility: 'North Valley Diagnostics Lab',
    uploadedDate: '2026-10-21',
    reviewStatus: 'reviewed',
    riskFlag: 'moderate',
    plainLanguageSummary:
      'LDL cholesterol is borderline elevated (136 mg/dL) while protective HDL cholesterol is within normal range. Combined with mild blood pressure elevation, routine endocrinology and lifestyle review is recommended.',
    clinicalNote:
      'Borderline LDL-C in diabetic patient; evaluate statin titration at upcoming visit.',
    recommendedNextStep:
      'Discuss cholesterol targets and home blood pressure readings with Dr. Kulkarni.',
    biomarkers: [
      {
        name: 'Total Cholesterol',
        value: '212 mg/dL',
        referenceRange: '< 200 mg/dL',
        flag: 'borderline',
      },
      {
        name: 'LDL Cholesterol',
        value: '136 mg/dL',
        referenceRange: '< 100 mg/dL',
        flag: 'elevated',
      },
      {
        name: 'HDL Cholesterol',
        value: '52 mg/dL',
        referenceRange: '> 50 mg/dL',
        flag: 'normal',
      },
      {
        name: 'Triglycerides',
        value: '148 mg/dL',
        referenceRange: '< 150 mg/dL',
        flag: 'normal',
      },
    ],
  },
  {
    id: 'RPT-4069',
    patientId: 'PT-1042',
    patientName: 'Ananya Mehta',
    doctorId: 'DR-207',
    doctorName: 'Dr. Claire Beaumont',
    title: 'Annual Retinal & Microvascular Screening',
    category: 'Preventive',
    labFacility: 'Eastside Polyclinic',
    uploadedDate: '2026-09-16',
    reviewStatus: 'reviewed',
    riskFlag: 'low',
    plainLanguageSummary:
      'Bilateral retinal imaging shows clear optic discs and healthy retinal vessels with no signs of diabetic retinopathy.',
    clinicalNote:
      'No microvascular retinal changes detected. Routine annual rescreening advised.',
    recommendedNextStep:
      'Repeat preventive retinal screening in September 2027.',
    biomarkers: [
      {
        name: 'Right Eye Fundus',
        value: 'No retinopathy',
        referenceRange: 'No retinopathy',
        flag: 'normal',
      },
      {
        name: 'Left Eye Fundus',
        value: 'No retinopathy',
        referenceRange: 'No retinopathy',
        flag: 'normal',
      },
      {
        name: 'Urine Albumin/Creatinine',
        value: '18 mg/g',
        referenceRange: '< 30 mg/g',
        flag: 'normal',
      },
    ],
  },
  {
    id: 'RPT-4102',
    patientId: 'PT-1043',
    patientName: 'Harpreet Gill',
    doctorId: 'DR-201',
    doctorName: 'Dr. Raghav Kulkarni',
    title: '12-Lead ECG, Cardiac Risk & Lipid Panel',
    category: 'Cardiovascular',
    labFacility: 'Eastside Polyclinic Lab',
    uploadedDate: '2026-11-14',
    reviewStatus: 'action-required',
    riskFlag: 'critical',
    plainLanguageSummary:
      'Significantly elevated blood pressure and LDL cholesterol with left ventricular strain pattern noted on screening ECG. Prompt cardiology evaluation has been initiated.',
    clinicalNote:
      'LVH with strain pattern, BP 166/102, LDL 174 mg/dL, hs-CRP elevated. Urgent cardiology referral placed to Dr. Deshmukh.',
    recommendedNextStep:
      'Complete urgent cardiology consult within 72 hours and verify antihypertensive adherence.',
    biomarkers: [
      {
        name: 'Clinic BP',
        value: '166/102 mmHg',
        referenceRange: '< 130/80 mmHg',
        flag: 'critical',
      },
      {
        name: 'LDL Cholesterol',
        value: '174 mg/dL',
        referenceRange: '< 100 mg/dL',
        flag: 'critical',
      },
      {
        name: 'hs-CRP',
        value: '4.8 mg/L',
        referenceRange: '< 1.0 mg/L',
        flag: 'elevated',
      },
      {
        name: 'Troponin-I (hs)',
        value: '11 ng/L',
        referenceRange: '< 14 ng/L',
        flag: 'normal',
      },
    ],
  },
  {
    id: 'RPT-4098',
    patientId: 'PT-1044',
    patientName: 'Lakshmi Narayanan',
    doctorId: 'DR-201',
    doctorName: 'Dr. Raghav Kulkarni',
    title: 'Renal Function & Urine Microalbumin Panel',
    category: 'Renal',
    labFacility: 'South River Diagnostic Center',
    uploadedDate: '2026-11-11',
    reviewStatus: 'pending-review',
    riskFlag: 'high',
    plainLanguageSummary:
      'Kidney filtration rate (eGFR 51 mL/min) and elevated urine albumin indicate moderate kidney strain requiring specialist nephrology co-management.',
    clinicalNote:
      'Decline in eGFR from 57 to 51 mL/min over 6 months; UACR 142 mg/g. Pending clinician sign-off for nephrology referral.',
    recommendedNextStep:
      'Review ACE/ARB dosing and finalize referral to Dr. Samuel Boateng (Nephrology).',
    biomarkers: [
      {
        name: 'eGFR',
        value: '51 mL/min',
        referenceRange: '> 60 mL/min',
        flag: 'elevated',
      },
      {
        name: 'Serum Creatinine',
        value: '1.38 mg/dL',
        referenceRange: '0.60 - 1.10 mg/dL',
        flag: 'elevated',
      },
      {
        name: 'Urine Albumin/Creatinine',
        value: '142 mg/g',
        referenceRange: '< 30 mg/g',
        flag: 'elevated',
      },
      {
        name: 'Serum Potassium',
        value: '4.9 mEq/L',
        referenceRange: '3.5 - 5.1 mEq/L',
        flag: 'borderline',
      },
    ],
  },
  {
    id: 'RPT-4096',
    patientId: 'PT-1046',
    patientName: 'Farida Siddiqui',
    doctorId: 'DR-204',
    doctorName: 'Dr. Kavita Nair',
    title: 'Spirometry & Peak Expiratory Flow Assessment',
    category: 'Respiratory',
    labFacility: 'Westbrook Respiratory Unit',
    uploadedDate: '2026-11-10',
    reviewStatus: 'pending-review',
    riskFlag: 'high',
    plainLanguageSummary:
      'Breathing test shows moderate reversible airway narrowing with significant improvement after bronchodilator use, suggesting controller inhaler adjustment is needed.',
    clinicalNote:
      'FEV1 68% predicted pre-bronchodilator with +15% reversibility. Step-up ICS therapy consideration.',
    recommendedNextStep:
      'Pulmonology teleconsult review and inhaler technique verification.',
    biomarkers: [
      {
        name: 'FEV1 (% Predicted)',
        value: '68%',
        referenceRange: '>= 80%',
        flag: 'elevated',
      },
      {
        name: 'FEV1/FVC Ratio',
        value: '0.66',
        referenceRange: '>= 0.70',
        flag: 'borderline',
      },
      {
        name: 'Post-BD Reversibility',
        value: '+15%',
        referenceRange: '< 12%',
        flag: 'elevated',
      },
      {
        name: 'Resting SpO2',
        value: '94%',
        referenceRange: '95% - 100%',
        flag: 'borderline',
      },
    ],
  },
  {
    id: 'RPT-4105',
    patientId: 'PT-1047',
    patientName: 'Mateo Alvarez',
    doctorId: 'DR-201',
    doctorName: 'Dr. Raghav Kulkarni',
    title: 'Community Metabolic Screening Panel',
    category: 'Metabolic',
    labFacility: 'North Valley Community Clinic',
    uploadedDate: '2026-11-15',
    reviewStatus: 'pending-review',
    riskFlag: 'moderate',
    plainLanguageSummary:
      'HbA1c (6.1%) and fasting glucose (114 mg/dL) fall within the prediabetes range. Early nutrition and physical activity support can substantially lower progression risk.',
    clinicalNote:
      'Newly identified prediabetes from workplace outreach camp. Enroll in lifestyle track.',
    recommendedNextStep:
      'Initial primary care review and preventive nutrition counseling.',
    biomarkers: [
      {
        name: 'HbA1c',
        value: '6.1%',
        referenceRange: '4.0% - 5.6%',
        flag: 'borderline',
      },
      {
        name: 'Fasting Glucose',
        value: '114 mg/dL',
        referenceRange: '70 - 99 mg/dL',
        flag: 'borderline',
      },
      {
        name: 'Triglycerides',
        value: '168 mg/dL',
        referenceRange: '< 150 mg/dL',
        flag: 'borderline',
      },
    ],
  },
  {
    id: 'RPT-4099',
    patientId: 'PT-1048',
    patientName: 'Savitri Devi Sharma',
    doctorId: 'DR-202',
    doctorName: 'Dr. Meera Deshmukh',
    title: 'INR Coagulation & Ambulatory Rhythm Monitor',
    category: 'Cardiovascular',
    labFacility: 'Highlands Outreach Diagnostics',
    uploadedDate: '2026-11-12',
    reviewStatus: 'action-required',
    riskFlag: 'critical',
    plainLanguageSummary:
      'Anticoagulation level (INR 3.6) is above the target therapeutic window and heart rate episodes exceeded 110 bpm. Prompt medication review is required.',
    clinicalNote:
      'Supratherapeutic INR (3.6; target 2.0-3.0) with intermittent rapid ventricular response.',
    recommendedNextStep:
      'Same-week anticoagulation clinic adjustment and repeat INR in 5 days.',
    biomarkers: [
      {
        name: 'INR',
        value: '3.6',
        referenceRange: '2.0 - 3.0 (target)',
        flag: 'critical',
      },
      {
        name: 'Mean Ventricular Rate',
        value: '94 bpm',
        referenceRange: '60 - 85 bpm',
        flag: 'elevated',
      },
      {
        name: 'Hemoglobin',
        value: '12.1 g/dL',
        referenceRange: '12.0 - 15.5 g/dL',
        flag: 'normal',
      },
    ],
  },
  {
    id: 'RPT-4088',
    patientId: 'PT-1049',
    patientName: 'Nadia Benali',
    doctorId: 'DR-206',
    doctorName: 'Dr. Priya Subramanian',
    title: 'Complete Blood Count & Serum Ferritin Study',
    category: 'Hematology',
    labFacility: 'Central Preventive Care Lab',
    uploadedDate: '2026-11-04',
    reviewStatus: 'reviewed',
    riskFlag: 'moderate',
    plainLanguageSummary:
      'Hemoglobin (10.4 g/dL) and iron stores (ferritin 9 ng/mL) confirm mild-to-moderate iron deficiency anemia. White cell and platelet counts are normal.',
    clinicalNote:
      'Microcytic anemia secondary to iron deficiency. Oral iron supplementation initiated.',
    recommendedNextStep:
      'Repeat CBC and reticulocyte check after 4 weeks of supplementation.',
    biomarkers: [
      {
        name: 'Hemoglobin',
        value: '10.4 g/dL',
        referenceRange: '12.0 - 15.5 g/dL',
        flag: 'elevated',
      },
      {
        name: 'Serum Ferritin',
        value: '9 ng/mL',
        referenceRange: '15 - 150 ng/mL',
        flag: 'elevated',
      },
      {
        name: 'MCV',
        value: '74 fL',
        referenceRange: '80 - 100 fL',
        flag: 'borderline',
      },
    ],
  },
];
