import type { AppNotification } from '@/types/domain';

/**
 * Fictional role-scoped notification items (Phase 2 UI mock data).
 */
export const MOCK_NOTIFICATIONS: AppNotification[] = [
  // Patient Notifications
  {
    id: 'NTF-101',
    role: 'patient',
    category: 'report',
    title: 'HbA1c & Metabolic Report Reviewed',
    message:
      'Dr. Raghav Kulkarni reviewed your Nov 8 lab report (RPT-4091) and shared next-step care notes.',
    timestamp: '2 hours ago',
    read: false,
    priority: 'important',
    actionLabel: 'View Report',
    actionPath: '/patient/reports',
  },
  {
    id: 'NTF-102',
    role: 'patient',
    category: 'appointment',
    title: 'Upcoming Appointment Reminder',
    message:
      'In-person Report Review with Dr. Raghav Kulkarni is confirmed for Nov 24, 2026 at 10:30 AM.',
    timestamp: '6 hours ago',
    read: false,
    priority: 'normal',
    actionLabel: 'View Appointment',
    actionPath: '/patient/appointments',
  },
  {
    id: 'NTF-103',
    role: 'patient',
    category: 'follow-up',
    title: 'Home BP & Glucose Log Due in 4 Days',
    message:
      'Please update your 14-day seated blood pressure and morning glucose log before Nov 22.',
    timestamp: 'Yesterday',
    read: false,
    priority: 'important',
    actionLabel: 'Open Follow-ups',
    actionPath: '/patient/follow-ups',
  },
  {
    id: 'NTF-104',
    role: 'patient',
    category: 'referral',
    title: 'Endocrinology Referral Scheduled',
    message:
      'Your referral (REF-3011) to Dr. Arvind Menon at Eastside Polyclinic is scheduled for Dec 3 via teleconsult.',
    timestamp: '3 days ago',
    read: true,
    priority: 'normal',
    actionLabel: 'Check Referral',
    actionPath: '/patient/referrals',
  },

  // Doctor Notifications
  {
    id: 'NTF-201',
    role: 'doctor',
    category: 'risk',
    title: 'Critical Risk Escalation: Harpreet Gill (PT-1043)',
    message:
      'BP 166/102 mmHg with ECG LV strain flagged on RPT-4102. Medication check follow-up is 2 days overdue.',
    timestamp: '25 minutes ago',
    read: false,
    priority: 'urgent',
    actionLabel: 'Review Patient',
    actionPath: '/doctor/patients/PT-1043',
  },
  {
    id: 'NTF-202',
    role: 'doctor',
    category: 'report',
    title: '2 Screening Reports Awaiting Clinician Sign-off',
    message:
      'Lakshmi Narayanan (Renal Panel) and Mateo Alvarez (Metabolic Screen) are queued for clinical review.',
    timestamp: '1 hour ago',
    read: false,
    priority: 'important',
    actionLabel: 'Review Reports',
    actionPath: '/doctor/reports',
  },
  {
    id: 'NTF-203',
    role: 'doctor',
    category: 'referral',
    title: 'Cardiology Accepted Urgent Referral REF-3024',
    message:
      'Dr. Meera Deshmukh accepted Harpreet Gill for an in-person cardiology consult on Nov 19 at 09:00 AM.',
    timestamp: '4 hours ago',
    read: false,
    priority: 'normal',
    actionLabel: 'Open Referrals',
    actionPath: '/doctor/referrals',
  },
  {
    id: 'NTF-204',
    role: 'doctor',
    category: 'appointment',
    title: 'Clinic Schedule Summary Ready',
    message:
      '4 assigned patient consultations are scheduled across North Valley and South River clinics this week.',
    timestamp: 'Yesterday',
    read: true,
    priority: 'normal',
    actionLabel: 'View Schedule',
    actionPath: '/doctor/appointments',
  },

  // Admin Notifications
  {
    id: 'NTF-301',
    role: 'admin',
    category: 'risk',
    title: 'Overdue High-Risk Follow-ups Identified',
    message:
      '2 critical-tier patients (Eastside Metro and Rural Highlands) have follow-up tasks past target SLA.',
    timestamp: '40 minutes ago',
    read: false,
    priority: 'urgent',
    actionLabel: 'Monitor Follow-ups',
    actionPath: '/admin/follow-ups',
  },
  {
    id: 'NTF-302',
    role: 'admin',
    category: 'referral',
    title: 'Pending Specialist Referrals Queue Update',
    message:
      '38 referrals network-wide await specialist scheduling; Nephrology median turnaround is 4.2 days.',
    timestamp: '3 hours ago',
    read: false,
    priority: 'important',
    actionLabel: 'Manage Referrals',
    actionPath: '/admin/referrals',
  },
  {
    id: 'NTF-303',
    role: 'admin',
    category: 'system',
    title: 'Monthly Population Screening Digest Generated',
    message:
      'November screening coverage reached 84.6% across 6 districts (+6.2% vs. prior quarter, demo dataset).',
    timestamp: 'Yesterday',
    read: true,
    priority: 'normal',
    actionLabel: 'View Analytics',
    actionPath: '/admin/analytics',
  },
];
