import type { PublicTranslations } from '@/i18n/types';

export const enTranslations: PublicTranslations = {
  meta: {
    homeTitle: 'Connecting Every Patient to the Care They Need.',
    privacyTitle: 'Privacy Policy (Placeholder)',
    termsTitle: 'Terms of Service (Placeholder)',
    skipToContent: 'Skip to main content',
    logoTagline: 'Population Health Platform',
  },
  brand: {
    product: 'CareBridge AI',
    team: 'Team ALPHA',
    challenge: 'Future Health Challenge',
    category: 'Population Health',
    mainTagline: 'Connecting Every Patient to the Care They Need.',
    supportingTagline:
      'From health screening to timely care — one intelligent healthcare connection.',
  },
  nav: {
    home: 'Home',
    howItWorks: 'How It Works',
    features: 'Features',
    impact: 'Our Impact',
    about: 'About',
    contact: 'Contact',
    login: 'Login',
    getStarted: 'Get Started',
    dashboard: 'Dashboard',
    signOut: 'Sign Out',
    openMenu: 'Open navigation menu',
    closeMenu: 'Close navigation menu',
    languageLabel: 'Select language',
  },
  hero: {
    eyebrow: 'CareBridge AI · Population Health by Team ALPHA',
    heading: "Healthcare Shouldn't Stop at Screening.",
    description:
      "CareBridge AI connects health screening, intelligent risk prioritization, referrals and follow-ups to help ensure that patients don't get lost between diagnosis and care.",
    primaryCta: 'Get Started',
    authenticatedCta: 'Go to Dashboard',
    secondaryCta: 'Explore How It Works',
    trustPoints: [
      'Patient, Doctor & Administrator portals',
      'Role-based access & protected sessions',
      'English & Hindi public experience',
    ],
    visual: {
      title: 'CareBridge AI Connected Care Ecosystem',
      subtitle: 'Select any stage to trace how screening connects to care',
      demoBadge: 'Illustrative Example',
      selectPrompt: 'Active care stage',
      handoffLabel: 'Connected workflow step',
      footnote:
        'Illustrative workflow visualization. Dashboard clinical views currently display synthetic demonstration data.',
      nodes: [
        {
          id: 'patient',
          label: 'Patient',
          roleTag: 'Patient Portal',
          summary:
            'Uploads or submits screening details and stays informed on clear next steps throughout the care journey.',
          handoff:
            'Shares health screening information into a structured report view.',
        },
        {
          id: 'report',
          label: 'Medical Report',
          roleTag: 'Structured Information',
          summary:
            'Organizes diagnostic markers, reference ranges, and readable explanations in one consistent layout.',
          handoff:
            'Supplies organized screening context for transparent case ordering.',
        },
        {
          id: 'risk',
          label: 'Risk Prioritization',
          roleTag: 'Configured Criteria',
          summary:
            'Groups cases into clear review tiers (Low, Moderate, High, Critical) using transparent, explainable factors.',
          handoff:
            'Surfaces time-sensitive cases cleanly in the clinician worklist.',
        },
        {
          id: 'doctor',
          label: 'Doctor',
          roleTag: 'Clinician Review',
          summary:
            'Authorized clinicians inspect reports, evaluate prioritized cases, and apply professional medical judgment.',
          handoff:
            'Determines appropriate specialist referrals and care actions.',
        },
        {
          id: 'referral',
          label: 'Referral',
          roleTag: 'Care Navigation',
          summary:
            'Guides patients from screening to the right clinic or specialist with visible status and clinical context.',
          handoff:
            'Connects each referral to scheduled appointments and reminders.',
        },
        {
          id: 'followup',
          label: 'Follow-up',
          roleTag: 'Continuity Tracking',
          summary:
            'Tracks appointments, repeat checks, and completion status so care loops stay visible across teams.',
          handoff:
            'Keeps patients, doctors, and administrators aligned on care completion.',
        },
      ],
    },
  },
  problem: {
    eyebrow: 'Why It Matters',
    heading: 'The Missing Link in Healthcare',
    description:
      'Health screening is only the starting point. Without coordinated steps afterward, patients and care teams face avoidable gaps between an initial report and appropriate follow-through.',
    items: [
      {
        title: 'Missed Follow-ups',
        description:
          'Patients may not receive timely follow-up after screening, leaving recommended repeat checks or clinic visits incomplete.',
      },
      {
        title: 'Delayed Referrals',
        description:
          'Patients can struggle to reach the appropriate care provider when referral handoffs lack clear routing and status tracking.',
      },
      {
        title: 'Disconnected Information',
        description:
          'Healthcare information may be scattered across separate reports, notes, and workflows, making continuity harder for everyone involved.',
      },
      {
        title: 'Limited Visibility',
        description:
          'Healthcare administrators may lack a unified view of population-level needs, referral queues, and follow-up bottlenecks.',
      },
      {
        title: 'Late Intervention',
        description:
          'Important cases may not receive timely attention when abnormal findings are not clearly organized for clinical review.',
      },
    ],
    continuityNote:
      'CareBridge AI is designed specifically to bridge these operational handoffs — connecting patients, clinicians, and administrators around one shared workflow.',
  },
  solution: {
    eyebrow: 'The CareBridge AI Solution',
    heading: 'One Connected Journey From Screening to Care',
    description:
      'Instead of leaving screening reports isolated, CareBridge AI structures six coordinated stages so information flows smoothly toward clinician review, referrals, and follow-up.',
    steps: [
      {
        step: 'Step 1',
        title: 'Screening',
        description: 'Patient uploads or submits health information.',
        actor: 'Patient',
      },
      {
        step: 'Step 2',
        title: 'Report Understanding',
        description:
          'The platform helps organize and interpret report information.',
        actor: 'Assistive Layer',
      },
      {
        step: 'Step 3',
        title: 'Risk Prioritization',
        description:
          'Cases are organized for review based on transparent, configured criteria.',
        actor: 'Triage View',
      },
      {
        step: 'Step 4',
        title: 'Doctor Review',
        description:
          'Authorized healthcare professionals review relevant information.',
        actor: 'Doctor',
      },
      {
        step: 'Step 5',
        title: 'Smart Referral',
        description:
          'Patients are guided toward appropriate healthcare services.',
        actor: 'Care Coordination',
      },
      {
        step: 'Step 6',
        title: 'Follow-up',
        description:
          'The platform helps track appointments and follow-up status.',
        actor: 'Patient & Care Team',
      },
    ],
    clinicalNoticeTitle: 'Clinician-Led Decision Support',
    clinicalNoticeBody:
      'AI-generated information in CareBridge AI is designed solely to organize context and support clinical workflows — it never replaces professional medical judgment, independent clinician evaluation, or qualified diagnosis.',
  },
  features: {
    eyebrow: 'Key Capabilities',
    heading: 'Purpose-Built Modules Across the Care Continuum',
    description:
      'CareBridge AI brings secure account access, role-specific dashboards, and coordinated population-health workflows into one cohesive platform.',
    transparencyNote:
      'Capability status badges distinguish active features implemented today from interactive prototype previews and planned backend workflows.',
    filters: {
      all: 'All Features',
      live: 'Active Now',
      preview: 'Prototype UI',
      planned: 'Planned Workflow',
    },
    items: [
      {
        id: 'report-understanding',
        title: 'AI-Assisted Medical Report Understanding',
        description:
          'Designed to structure screening markers alongside clear, plain-language summaries for clinician-supported review.',
        availability: 'planned',
        availabilityLabel: 'Planned · UI Preview',
      },
      {
        id: 'risk-prioritization',
        title: 'Explainable Risk Prioritization',
        description:
          'Organizes screening cases by transparent, factor-based priority levels so reviewers see why a case needs attention.',
        availability: 'planned',
        availabilityLabel: 'Planned · UI Preview',
      },
      {
        id: 'smart-referral',
        title: 'Smart Patient Referral',
        description:
          'Structures referrals between primary care and specialist services with visible urgency, status, and handoff notes.',
        availability: 'preview',
        availabilityLabel: 'Prototype UI · Demo Data',
      },
      {
        id: 'appointment-management',
        title: 'Appointment Management',
        description:
          'Provides clear clinic and teleconsultation appointment schedules, preparation notes, and visit status tracking.',
        availability: 'preview',
        availabilityLabel: 'Prototype UI · Demo Data',
      },
      {
        id: 'followup-reminders',
        title: 'Automated Follow-up Reminders',
        description:
          'Designed to surface upcoming and overdue follow-up tasks with timely reminders to support care completion.',
        availability: 'planned',
        availabilityLabel: 'Planned · UI Preview',
      },
      {
        id: 'patient-dashboard',
        title: 'Patient Dashboard',
        description:
          'Protected patient portal bringing personal reports, risk views, referrals, appointments, and follow-up tracking together.',
        availability: 'preview',
        availabilityLabel: 'Live Route · Demo Data',
      },
      {
        id: 'doctor-dashboard',
        title: 'Doctor Dashboard',
        description:
          'Role-guarded clinician workspace for reviewing patient panels, screening reports, prioritized cases, and care handoffs.',
        availability: 'preview',
        availabilityLabel: 'Live Route · Demo Data',
      },
      {
        id: 'population-analytics',
        title: 'Population Health Analytics',
        description:
          'Administrator visualizations for cohort risk distribution, referral progress, and follow-up activity across programs.',
        availability: 'preview',
        availabilityLabel: 'Prototype UI · Demo Data',
      },
      {
        id: 'multilingual-experience',
        title: 'Multilingual Experience',
        description:
          'Switch seamlessly between English and Hindi across the public experience, built on an extensible translation layer.',
        availability: 'live',
        availabilityLabel: 'Active · EN & HI',
      },
      {
        id: 'secure-access',
        title: 'Secure User Access',
        description:
          'Operational Argon2id password hashing, HttpOnly cookie sessions, CSRF verification, rate limiting, and backend RBAC.',
        availability: 'live',
        availabilityLabel: 'Active · Implemented',
      },
    ],
  },
  experiences: {
    eyebrow: 'Three User Experiences',
    heading: 'Dedicated Workspaces for Patients, Doctors, and Administrators',
    description:
      'Every participant interacts through a focused interface protected by server-enforced authentication and role permissions.',
    authGuardNote:
      'All workspace links respect authentication: unauthenticated visitors are directed to sign in before entering any role dashboard.',
    roles: [
      {
        id: 'patient',
        eyebrow: 'For Patients',
        heading: 'Your Health Journey, Clearly Connected.',
        description:
          'Stay organized after every screening with clear visibility into reports, scheduled care, and next follow-up steps.',
        points: [
          'View health information',
          'Access reports',
          'Track referrals',
          'View appointments',
          'Monitor follow-up progress',
        ],
        cta: 'Explore Patient Experience',
        accessNote: 'Requires authenticated Patient account',
      },
      {
        id: 'doctor',
        eyebrow: 'For Doctors',
        heading: 'More Visibility. Better Care Coordination.',
        description:
          'Move from scattered reports to a structured clinical workspace built around timely review and coordinated handoffs.',
        points: [
          'Review assigned patients',
          'Access relevant reports',
          'Review prioritized cases',
          'Track appointments and referrals',
          'Monitor follow-ups',
        ],
        cta: 'Explore Doctor Experience',
        accessNote: 'Requires admin-verified Doctor account',
      },
      {
        id: 'admin',
        eyebrow: 'For Administrators',
        heading: 'See the Bigger Picture of Population Health.',
        description:
          'Understand program-wide care coordination, manage verified clinician access, and spot follow-up gaps early.',
        points: [
          'Monitor patient activity',
          'Understand risk distribution',
          'Track referrals',
          'Review follow-up performance',
          'Access population-level analytics',
        ],
        cta: 'Explore Admin Experience',
        accessNote: 'Requires authorized Administrator account',
      },
    ],
  },
  howItWorks: {
    eyebrow: 'How It Works',
    heading: 'Six Connected Steps From Screening to Follow-up',
    description:
      'A clear end-to-end pathway keeps patients, clinicians, and care coordinators aligned at every transition.',
    steps: [
      {
        step: '01',
        title: 'Screening',
        description:
          'Health screening details and diagnostic inputs enter a single organized record.',
        actor: 'Entry',
      },
      {
        step: '02',
        title: 'Report Analysis',
        description:
          'Key findings, ranges, and structured summaries are prepared for clear reading.',
        actor: 'Organization',
      },
      {
        step: '03',
        title: 'Risk Prioritization',
        description:
          'Cases are ordered using transparent criteria so higher-priority reviews stand out.',
        actor: 'Prioritization',
      },
      {
        step: '04',
        title: 'Doctor Review',
        description:
          'Verified doctors examine reports and clinical context to decide the right next step.',
        actor: 'Clinical Review',
      },
      {
        step: '05',
        title: 'Referral',
        description:
          'When specialist or clinic care is needed, referrals are routed and tracked clearly.',
        actor: 'Navigation',
      },
      {
        step: '06',
        title: 'Follow-up',
        description:
          'Appointments, check-ins, and follow-up milestones remain visible through completion.',
        actor: 'Continuity',
      },
    ],
  },
  impact: {
    eyebrow: 'Population Health Impact',
    heading: 'Moving From Fragmented Care to Connected Care',
    description:
      'CareBridge AI focuses on practical coordination goals that help community and population-health programs keep care connected after screening.',
    fromLabel: 'Fragmented',
    toLabel: 'Connected',
    items: [
      {
        title: 'Better Follow-up Visibility',
        description:
          'Keep pending, upcoming, and completed follow-up steps visible to both patients and care teams.',
        fromState: 'Unchecked post-screening tasks',
        toState: 'Tracked follow-up timelines',
      },
      {
        title: 'More Organized Patient Workflows',
        description:
          'Bring reports, visits, referrals, and care actions together into one predictable patient experience.',
        fromState: 'Disconnected paperwork',
        toState: 'Single structured portal',
      },
      {
        title: 'Improved Referral Tracking',
        description:
          'Make referral handoffs easier to trace from initiation through scheduled consultation.',
        fromState: 'Unclear referral status',
        toState: 'Visible step-by-step routing',
      },
      {
        title: 'Earlier Review of Priority Cases',
        description:
          'Help clinicians identify cases flagged by configured criteria so important reviews are queued clearly.',
        fromState: 'Unsorted report queues',
        toState: 'Criteria-ordered worklists',
      },
      {
        title: 'Better Administrative Oversight',
        description:
          'Equip program administrators with unified dashboards for cohorts, clinician accounts, and care stages.',
        fromState: 'Siloed clinic snapshots',
        toState: 'Unified program overview',
      },
      {
        title: 'More Accessible Patient Communication',
        description:
          'Support clearer understanding through structured layouts and bilingual English and Hindi access.',
        fromState: 'Dense, single-language copy',
        toState: 'Clear bilingual guidance',
      },
    ],
    illustrativeBanner: {
      badge: 'Illustrative Example · Demo Data',
      title: 'How Connected Architecture Structures Population Care',
      caption:
        'Structural overview of the CareBridge AI prototype design (no clinical outcome statistics are claimed).',
      pillars: [
        { value: '6 Stages', label: 'Screening-to-follow-up workflow model' },
        { value: '3 Portals', label: 'Patient, Doctor & Admin role views' },
        { value: '2 Languages', label: 'English & Hindi public accessibility' },
        { value: '100% Synthetic', label: 'Fictional demo clinical datasets' },
      ],
    },
  },
  multilingual: {
    eyebrow: 'Multilingual Accessibility',
    heading: 'Designed to Communicate Clearly in English and Hindi',
    description:
      'Accessible health coordination starts with language people understand. Switch the live public website between English and Hindi right here — backed by a structured i18n dictionary ready for full dashboard localization.',
    activeStatus: 'Live across the entire public website & legal pages',
    roadmapNote:
      'Structured translation modules (src/i18n/) are ready to extend into authenticated dashboard workflows and additional languages in future phases.',
    selectLanguageHeading: 'Try the Live Language Switcher',
    previewBadge: 'Illustrative Example · Demo Data',
    previewHeader: 'Localized Care Coordination Summary',
    previewItems: [
      {
        label: 'Screening Report Status',
        value: 'Organized for Doctor Review',
        detail:
          'Routine metabolic screening details arranged with clear reference context.',
      },
      {
        label: 'Referral Guidance',
        value: 'Internal Medicine Consultation',
        detail:
          'Next care step shared with clinic category and preparation checklist.',
      },
      {
        label: 'Upcoming Follow-up',
        value: 'Scheduled Check-in Tracked',
        detail:
          'Follow-up milestone listed clearly so no recommended visit is overlooked.',
      },
    ],
  },
  security: {
    eyebrow: 'Privacy & Security',
    heading: 'Healthcare Information Deserves Careful Protection.',
    description:
      'CareBridge AI is built with practical, verifiable security controls for authentication and access governance, paired with transparent prototype boundaries.',
    scopeNote:
      'CareBridge AI is a hackathon prototype and does not claim regulatory certification or statutory compliance. All clinical records shown in dashboards are synthetic demo data.',
    items: [
      {
        title: 'Role-Based Access',
        description:
          'Patient, Doctor, and Administrator permissions are enforced on both React routes and FastAPI backend dependencies.',
        statusLabel: 'Active Control',
        isLive: true,
      },
      {
        title: 'Secure Authentication',
        description:
          'Passwords are validated for strength and hashed with Argon2id; sessions use signed JWTs and rotated refresh tokens in HttpOnly SameSite cookies.',
        statusLabel: 'Active Control',
        isLive: true,
      },
      {
        title: 'Protected User Accounts',
        description:
          'Includes CSRF verification on cookie-authenticated mutations, login rate limiting, immediate session revocation on logout, and non-enumerating sign-in errors.',
        statusLabel: 'Active Control',
        isLive: true,
      },
      {
        title: 'Controlled Access to Healthcare Information',
        description:
          'Public Admin registration is blocked and Doctor privileges require administrator verification before accessing clinician routes.',
        statusLabel: 'Active Control',
        isLive: true,
      },
      {
        title: 'Privacy-Conscious Data Handling',
        description:
          'Secrets are isolated in environment variables, tokens are never placed in localStorage, logs omit passwords and tokens, and demo views use strictly fictional data.',
        statusLabel: 'Active Practice',
        isLive: true,
      },
    ],
    disclaimerLabel: 'Medical Disclaimer',
    disclaimer:
      'CareBridge AI is a healthcare coordination and decision-support prototype. It does not replace a qualified healthcare professional, provide a definitive diagnosis or serve as an emergency medical service.',
  },
  about: {
    eyebrow: 'About CareBridge AI',
    heading: 'Bridging the Gap Between Health Screening and Care Delivery',
    description:
      'CareBridge AI is designed to address the gap between health screening and actual care delivery. It connects patients, healthcare professionals and administrators through a coordinated digital workflow.',
    secondaryDescription:
      'By combining clear screening workflows, role-specific coordination tools, bilingual accessibility, and responsible security foundations, the platform focuses on helping every screening connect to an organized next step.',
    highlights: [
      {
        label: 'Created By',
        value: 'Team ALPHA',
        detail:
          'Built with an engineering focus on clarity, accessibility, and trustworthy healthcare UX.',
      },
      {
        label: 'Competition',
        value: 'Future Health Challenge',
        detail:
          'Developed as a structured digital-health prototype addressing real care-coordination gaps.',
      },
      {
        label: 'Category',
        value: 'Population Health',
        detail:
          'Connecting individual screening follow-through with program-level coordination visibility.',
      },
      {
        label: 'Core Principle',
        value: 'Patient-Centered Coordination',
        detail:
          'Designed to support patients and clinicians responsibly without replacing medical judgment.',
      },
    ],
  },
  contact: {
    eyebrow: 'Contact & Access',
    heading: 'Connect With the CareBridge AI Platform',
    description:
      'CareBridge AI is presented by Team ALPHA for the Future Health Challenge (Population Health). Use the verified platform links below to create an account, sign in to your workspace, or review prototype documentation.',
    noFakeContactNote:
      'Team ALPHA · Future Health Challenge (Population Health). No public phone line, clinical helpline, or street address is operated for this prototype; for medical emergencies, contact your local emergency healthcare service immediately.',
    cards: [
      {
        title: 'Create a Patient Account',
        description:
          'Register on CareBridge AI to explore the authenticated patient portal or request clinician verification.',
        cta: 'Go to Registration',
        to: '/register',
      },
      {
        title: 'Sign In to Your Workspace',
        description:
          'Already provisioned as a Patient, Doctor, or Administrator? Sign in to access your role-scoped dashboard.',
        cta: 'Go to Login',
        to: '/login',
      },
      {
        title: 'Privacy & Terms Overview',
        description:
          'Review our transparent prototype Privacy Policy and Terms of Service placeholders and medical disclaimer.',
        cta: 'Read Privacy Policy',
        to: '/privacy',
      },
    ],
  },
  cta: {
    eyebrow: 'Start With CareBridge AI',
    heading: "Let's Make Every Health Screening Count.",
    description:
      'Bring patients, doctors and healthcare coordination together with CareBridge AI.',
    primaryButton: 'Get Started',
    secondaryButton: 'Explore the Platform',
    secondaryAuthButton: 'Open Your Dashboard',
  },
  footer: {
    description:
      'From health screening to timely care — one intelligent healthcare connection uniting patients, doctors, and population health administrators.',
    columns: {
      platform: 'Platform',
      patients: 'For Patients',
      doctors: 'For Doctors',
      admins: 'For Administrators',
    },
    links: {
      patientOverview: 'Patient Dashboard',
      patientReports: 'Health Reports',
      patientReferrals: 'Referrals',
      patientAppointments: 'Appointments',
      patientFollowUps: 'Follow-ups',
      doctorOverview: 'Doctor Dashboard',
      doctorPatients: 'Assigned Patients',
      doctorRiskReview: 'Risk Review',
      doctorReferrals: 'Referrals',
      doctorFollowUps: 'Follow-ups',
      adminOverview: 'Admin Overview',
      adminPopulation: 'Population Health',
      adminRisk: 'Risk Distribution',
      adminDoctors: 'Doctor Management',
      adminAnalytics: 'Analytics',
      privacyPolicy: 'Privacy Policy',
      termsOfService: 'Terms of Service',
    },
    contactAttribution:
      'Project by Team ALPHA · Future Health Challenge · Population Health Category',
    copyright: '© 2026 CareBridge AI · Built by Team ALPHA. MIT License.',
    challengeLine: 'Connecting Every Patient to the Care They Need.',
  },
  legal: {
    placeholderBadge: 'Prototype Legal Placeholder',
    backToHome: 'Back to Home',
    privacy: {
      heading: 'Privacy Policy (Prototype Placeholder)',
      subtitle:
        'This placeholder summarizes how the CareBridge AI prototype developed by Team ALPHA for the Future Health Challenge currently handles account and demonstration data.',
      sections: [
        {
          heading: '1. Prototype Purpose & Synthetic Clinical Data',
          body: 'CareBridge AI is a population-health coordination prototype. Please do not submit real protected health information or sensitive personal medical records. Clinical reports, risk indicators, appointments, referrals, and analytics displayed inside prototype dashboards use strictly fictional demonstration data.',
        },
        {
          heading: '2. Account Information Collected',
          body: 'When you create an account, the backend stores your full name, normalized email address, Argon2id-hashed password, assigned account role (PATIENT, DOCTOR, or ADMIN), account status flags, and timestamps. Plaintext passwords are never stored or returned by API responses.',
        },
        {
          heading: '3. Session Cookies & Local Preferences',
          body: 'Authentication uses HttpOnly SameSite session cookies paired with a CSRF verification cookie; authentication tokens are never stored in browser localStorage or sessionStorage. Non-sensitive UI preferences (theme mode and selected display language) may be stored locally in your browser.',
        },
        {
          heading: '4. Role-Based Access & Governance',
          body: 'Account routes are protected by server-side role checks. Public Administrator registration is disabled, and clinician role requests require administrator approval. A formal production privacy policy and organizational contact details must be published prior to any real-world clinical deployment.',
        },
      ],
    },
    terms: {
      heading: 'Terms of Service (Prototype Placeholder)',
      subtitle:
        'This placeholder outlines the prototype usage terms for CareBridge AI, created by Team ALPHA for the Future Health Challenge (Population Health).',
      sections: [
        {
          heading: '1. Non-Clinical Prototype Scope',
          body: 'CareBridge AI is provided strictly for demonstration, evaluation, and software prototyping purposes. It is not a licensed medical device, healthcare provider, diagnostic laboratory, or emergency response service.',
        },
        {
          heading: '2. Medical Disclaimer',
          body: 'CareBridge AI is a healthcare coordination and decision-support prototype. It does not replace a qualified healthcare professional, provide a definitive diagnosis or serve as an emergency medical service. Always consult a qualified healthcare professional for medical advice, diagnosis, or treatment.',
        },
        {
          heading: '3. Responsible Account Use',
          body: 'Users agree to use only test or non-sensitive information when exploring the prototype, keep account credentials confidential, respect role-based access boundaries, and refrain from attempting unauthorized access to other accounts or administrative endpoints.',
        },
        {
          heading: '4. Feature Availability & Open-Source License',
          body: 'Certain platform modules represent interactive UI previews or planned capabilities scheduled for future development phases and may change without notice. Source code is distributed under the repository MIT License without warranties of any kind.',
        },
      ],
    },
  },
};
