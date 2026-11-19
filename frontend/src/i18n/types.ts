export type SupportedLanguage = 'en' | 'hi';

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  nativeLabel: string;
  shortLabel: string;
}

export type FeatureAvailability = 'live' | 'preview' | 'planned';

export interface EcosystemNodeCopy {
  id: 'patient' | 'report' | 'risk' | 'doctor' | 'referral' | 'followup';
  label: string;
  roleTag: string;
  summary: string;
  handoff: string;
}

export interface ProblemCardCopy {
  title: string;
  description: string;
}

export interface WorkflowStepCopy {
  step: string;
  title: string;
  description: string;
  actor: string;
}

export interface FeatureCardCopy {
  id: string;
  title: string;
  description: string;
  availability: FeatureAvailability;
  availabilityLabel: string;
}

export interface RoleExperienceCopy {
  id: 'patient' | 'doctor' | 'admin';
  eyebrow: string;
  heading: string;
  description: string;
  points: string[];
  cta: string;
  accessNote: string;
}

export interface ImpactCardCopy {
  title: string;
  description: string;
  fromState: string;
  toState: string;
}

export interface SecurityItemCopy {
  title: string;
  description: string;
  statusLabel: string;
  isLive: boolean;
}

export interface LegalSectionCopy {
  heading: string;
  body: string;
}

export interface PublicTranslations {
  meta: {
    homeTitle: string;
    privacyTitle: string;
    termsTitle: string;
    skipToContent: string;
    logoTagline: string;
  };
  brand: {
    product: string;
    team: string;
    challenge: string;
    category: string;
    mainTagline: string;
    supportingTagline: string;
  };
  nav: {
    home: string;
    howItWorks: string;
    features: string;
    impact: string;
    about: string;
    contact: string;
    login: string;
    getStarted: string;
    dashboard: string;
    signOut: string;
    openMenu: string;
    closeMenu: string;
    languageLabel: string;
  };
  hero: {
    eyebrow: string;
    heading: string;
    description: string;
    primaryCta: string;
    authenticatedCta: string;
    secondaryCta: string;
    trustPoints: string[];
    visual: {
      title: string;
      subtitle: string;
      demoBadge: string;
      selectPrompt: string;
      handoffLabel: string;
      footnote: string;
      nodes: EcosystemNodeCopy[];
    };
  };
  problem: {
    eyebrow: string;
    heading: string;
    description: string;
    items: ProblemCardCopy[];
    continuityNote: string;
  };
  solution: {
    eyebrow: string;
    heading: string;
    description: string;
    steps: WorkflowStepCopy[];
    clinicalNoticeTitle: string;
    clinicalNoticeBody: string;
  };
  features: {
    eyebrow: string;
    heading: string;
    description: string;
    transparencyNote: string;
    filters: {
      all: string;
      live: string;
      preview: string;
      planned: string;
    };
    items: FeatureCardCopy[];
  };
  experiences: {
    eyebrow: string;
    heading: string;
    description: string;
    authGuardNote: string;
    roles: RoleExperienceCopy[];
  };
  howItWorks: {
    eyebrow: string;
    heading: string;
    description: string;
    steps: WorkflowStepCopy[];
  };
  impact: {
    eyebrow: string;
    heading: string;
    description: string;
    fromLabel: string;
    toLabel: string;
    items: ImpactCardCopy[];
    illustrativeBanner: {
      badge: string;
      title: string;
      caption: string;
      pillars: { value: string; label: string }[];
    };
  };
  multilingual: {
    eyebrow: string;
    heading: string;
    description: string;
    activeStatus: string;
    roadmapNote: string;
    selectLanguageHeading: string;
    previewBadge: string;
    previewHeader: string;
    previewItems: {
      label: string;
      value: string;
      detail: string;
    }[];
  };
  security: {
    eyebrow: string;
    heading: string;
    description: string;
    scopeNote: string;
    items: SecurityItemCopy[];
    disclaimerLabel: string;
    disclaimer: string;
  };
  about: {
    eyebrow: string;
    heading: string;
    description: string;
    secondaryDescription: string;
    highlights: { label: string; value: string; detail: string }[];
  };
  contact: {
    eyebrow: string;
    heading: string;
    description: string;
    noFakeContactNote: string;
    cards: {
      title: string;
      description: string;
      cta: string;
      to: string;
    }[];
  };
  cta: {
    eyebrow: string;
    heading: string;
    description: string;
    primaryButton: string;
    secondaryButton: string;
    secondaryAuthButton: string;
  };
  footer: {
    description: string;
    columns: {
      platform: string;
      patients: string;
      doctors: string;
      admins: string;
    };
    links: {
      patientOverview: string;
      patientReports: string;
      patientReferrals: string;
      patientAppointments: string;
      patientFollowUps: string;
      doctorOverview: string;
      doctorPatients: string;
      doctorRiskReview: string;
      doctorReferrals: string;
      doctorFollowUps: string;
      adminOverview: string;
      adminPopulation: string;
      adminRisk: string;
      adminDoctors: string;
      adminAnalytics: string;
      privacyPolicy: string;
      termsOfService: string;
    };
    contactAttribution: string;
    copyright: string;
    challengeLine: string;
  };
  legal: {
    placeholderBadge: string;
    backToHome: string;
    privacy: {
      heading: string;
      subtitle: string;
      sections: LegalSectionCopy[];
    };
    terms: {
      heading: string;
      subtitle: string;
      sections: LegalSectionCopy[];
    };
  };
}
