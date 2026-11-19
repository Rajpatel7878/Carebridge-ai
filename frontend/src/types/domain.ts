export type UserRole = 'patient' | 'doctor' | 'admin';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export type PatientCareStatus =
  'stable' | 'follow-up-due' | 'attention-needed' | 'newly-screened';

export interface PatientVitals {
  bloodPressure: string;
  heartRateBpm: number;
  hba1cPercent: number;
  bmi: number;
  spo2Percent: number;
  fastingGlucoseMgDl: number;
}

export interface PatientRecord {
  id: string;
  fullName: string;
  age: number;
  gender: 'Female' | 'Male' | 'Other';
  bloodGroup: string;
  phone: string;
  email: string;
  district: string;
  facility: string;
  preferredLanguage: 'English' | 'Hindi';
  assignedDoctorId: string;
  assignedDoctorName: string;
  primaryConditions: string[];
  riskLevel: RiskLevel;
  riskScore: number;
  careStatus: PatientCareStatus;
  lastScreeningDate: string;
  nextFollowUpDate: string;
  adherencePercent: number;
  emergencyContact: string;
  allergies: string[];
  vitals: PatientVitals;
}

export interface DoctorRecord {
  id: string;
  fullName: string;
  specialty: string;
  department: string;
  facility: string;
  district: string;
  licenseCode: string;
  email: string;
  phone: string;
  yearsExperience: number;
  assignedPatientsCount: number;
  highRiskPatientsCount: number;
  pendingReviewsCount: number;
  availabilityStatus: 'available' | 'in-clinic' | 'on-call' | 'off-duty';
  consultationModes: Array<'In-Person' | 'Teleconsult'>;
  languages: string[];
}

export type BiomarkerFlag = 'normal' | 'borderline' | 'elevated' | 'critical';

export interface ReportBiomarker {
  name: string;
  value: string;
  referenceRange: string;
  flag: BiomarkerFlag;
}

export type ReportReviewStatus =
  'reviewed' | 'pending-review' | 'action-required';

export interface MedicalReport {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  title: string;
  category:
    | 'Metabolic'
    | 'Cardiovascular'
    | 'Respiratory'
    | 'Renal'
    | 'Hematology'
    | 'Preventive';
  labFacility: string;
  uploadedDate: string;
  reviewStatus: ReportReviewStatus;
  riskFlag: RiskLevel;
  plainLanguageSummary: string;
  clinicalNote: string;
  recommendedNextStep: string;
  biomarkers: ReportBiomarker[];
}

export type AppointmentStatus =
  'confirmed' | 'pending' | 'completed' | 'rescheduled' | 'cancelled';

export interface AppointmentRecord {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  facility: string;
  date: string;
  time: string;
  durationMinutes: number;
  mode: 'In-Person' | 'Teleconsult';
  type:
    | 'Initial Screening'
    | 'Follow-up Consult'
    | 'Report Review'
    | 'Specialist Referral'
    | 'Chronic Care Check';
  status: AppointmentStatus;
  notes: string;
}

export type ReferralPriority = 'routine' | 'priority' | 'urgent';
export type ReferralStatus = 'pending' | 'accepted' | 'scheduled' | 'completed';

export interface ReferralRecord {
  id: string;
  patientId: string;
  patientName: string;
  fromDoctorId: string;
  fromDoctorName: string;
  fromFacility: string;
  toDoctorId: string;
  toDoctorName: string;
  toSpecialty: string;
  toFacility: string;
  createdDate: string;
  targetDate: string;
  priority: ReferralPriority;
  status: ReferralStatus;
  reason: string;
  clinicalSummary: string;
}

export type FollowUpStatus = 'on-track' | 'due-soon' | 'overdue' | 'completed';

export interface FollowUpRecord {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  title: string;
  category:
    | 'Lab Repeat'
    | 'Medication Check'
    | 'Vitals Log'
    | 'Post-Referral Review'
    | 'Lifestyle Counseling';
  dueDate: string;
  channel: 'Clinic Visit' | 'Phone Outreach' | 'Patient Portal' | 'Teleconsult';
  riskLevel: RiskLevel;
  status: FollowUpStatus;
  instructions: string;
  lastContactDate: string;
}

export type NotificationCategory =
  'report' | 'appointment' | 'referral' | 'follow-up' | 'risk' | 'system';

export interface AppNotification {
  id: string;
  role: UserRole;
  category: NotificationCategory;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'normal' | 'important' | 'urgent';
  actionLabel: string;
  actionPath: string;
}

export interface RiskDistributionItem {
  tier: string;
  level: RiskLevel;
  patients: number;
  percentage: number;
  description: string;
}

export interface MonthlyPopulationMetric {
  month: string;
  screenings: number;
  followUpsCompleted: number;
  highRiskIdentified: number;
  referralsClosed: number;
}

export interface ConditionPrevalenceItem {
  condition: string;
  patients: number;
  controlledRate: number;
  highRiskShare: number;
}

export interface DistrictHealthMetric {
  district: string;
  facilities: number;
  enrolledPatients: number;
  screeningCoverage: number;
  followUpCompletion: number;
  highRiskCount: number;
}

export interface ActivityEvent {
  id: string;
  roleScope: 'doctor' | 'admin' | 'patient';
  title: string;
  description: string;
  timestamp: string;
  tone: 'info' | 'success' | 'warning' | 'critical';
  actor: string;
}

export interface RiskFactorBreakdown {
  factor: string;
  status: 'optimal' | 'watch' | 'elevated';
  reading: string;
  target: string;
  explanation: string;
}
