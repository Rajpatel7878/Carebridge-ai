# Hindi translation candidate inventory

**PARTIALLY IMPLEMENTED** — Static inventory of literal JSX text and selected literal UI attributes. These are candidates, not proof that each is untranslated: some components render conditional or translated alternatives, and brand names may not need translation. Dynamic strings, validation constants, backend messages, menus, data-driven content, and expressions are NOT exhaustively detected. OCR/provider output and patient-entered content should remain verbatim. Manual review is required.

## Completed in this pass

- The login page now uses centralized English/Hindi copy for labels, headings, helper text, action buttons, local validation and generic error fallback. A component test covers immediate switching and Hindi validation; the dictionary has key-presence coverage. Backend-provided error messages and shared password controls can still be English.
- Public copy, dashboard navigation, report-analysis consent UI and the audit page were translated in previous passes. The rest of this inventory remains a review list, not a verified completion claim.

## Remaining static candidates

## `components/auth/GuestOnlyRoute.tsx`

- Loading CareBridge AI...

## `components/auth/ProtectedRoute.tsx`

- Verifying your CareBridge AI session...

## `components/auth/RoleGuard.tsx`

- Checking workspace permissions...

## `components/charts/RiskDistributionChart.tsx`

- Total Enrolled

## `components/common/Logo.tsx`

- CareBridge

## `components/common/Modal.tsx`

- Close modal

## `components/common/NotificationItem.tsx`

- Important
- Mark as read
- Unread
- Urgent

## `components/common/Pagination.tsx`

- Next
- Page
- Pagination
- Previous
- Showing

## `components/dashboard/CareAssignmentsPanel.tsx`

- Administrative Note (Optional)
- Assign Patient
- Assign Patient to Verified Doctor
- Assign registered patients to verified doctor accounts to authorize clinician review and care coordination.
- Assigned
- Authorized Patient–Doctor Care Assignments
- Cancel
- Confirm Assignment
- Control which verified clinicians are authorized to access and manage specific patient records.
- Could not load care assignments
- Grants the selected clinician authorized access to this patient's reports, visits, referrals, and follow-up plans.
- No active patient–doctor assignments
- Patient Account
- Refresh
- Revoke
- Revoke Assignment
- Revoke patient–doctor assignment?
- Verified Doctor Account
- active
- e.g., Assigned to Internal Medicine care panel

## `components/dashboard/LiveAnalytics.tsx`

- Counts of records, not unique patients.
- Daily counts in UTC. No screening activity is inferred from uploads.
- Database-backed operational counts. Priority and assessment categories are not diagnoses.
- Export aggregate CSV
- Last 30 days
- Last 7 days
- Last 90 days
- Loading live analytics…
- No records in this period.
- Registrations and report uploads
- Reporting period
- Summary cards are all-time totals. Charts show records created or assessed in the selected rolling UTC period; statuses are current.

## `components/dashboard/NotificationsCenter.tsx`

- Filter notifications by category
- Mark all as read
- No notifications match the selected filter right now.
- Notifications
- Show all notifications
- You're all caught up

## `components/dashboard/PriorityQueue.tsx`

- All
- Category
- Filter priority
- Loading priority queue…
- No assigned patients in this view.
- No saved operational assessment.
- Operational priority queue
- Override priority
- Priority indicates workflow attention, not a diagnosis or validated prediction. Recalculate after source records change; a stale label means the saved assessment is out of date.
- Reason
- Recalculate
- Save override

## `components/dashboard/PrioritySummary.tsx`

- Assessed patients:
- Latest saved assessments only. They may be stale and are not clinical diagnoses.
- Loading counts…
- Saved operational priorities
- Unable to load priority counts.

## `components/dashboard/ReportDetailModal.tsx`

- Clinician Note
- Close
- Fictional demonstration record. Assistive report analysis will be integrated in a later phase and never replaces qualified medical diagnosis.
- Key Biomarkers
- Mark Reviewed (Demo)
- Marker
- Observed
- Plain-Language Report Summary (Mock Preview)
- Recommended Next Step
- Reference Range
- Reviewing Clinician:
- Status

## `components/forms/FilterControls.tsx`

- Reset

## `components/forms/SearchBar.tsx`

- Clear search

## `components/landing/HeroEcosystemVisual.tsx`

- &middot;
- &middot; 0
- CareBridge AI six-stage workflow linking Patient, Medical Report, Risk Prioritization, Doctor, Referral, and Follow-up
- Next care stage
- Previous care stage

## `components/navigation/DashboardNavbar.tsx`

- Authorized Clinician Portal
- Breadcrumb
- Notifications
- Open sidebar navigation
- Private Patient Portal
- Sample Clinical Data
- unread

## `components/navigation/PublicFooter.tsx`

- CareBridge AI Home

## `components/navigation/PublicNavbar.tsx`

- CareBridge AI Home
- Mobile navigation
- Primary navigation

## `components/navigation/Sidebar.tsx`

- Back to Public Home
- CareBridge AI Home
- Close sidebar
- Sign Out

## `pages/admin/AdminAppointmentsPage.tsx`

- &middot;
- Appointment Management
- Oversee scheduled clinic consultations, teleconsult utilization, and completion rates across facilities.

## `pages/admin/AdminAuditLogsPage.tsx`

- UTC

## `pages/admin/AdminDoctorsPage.tsx`

- &middot;
- Admin
- Approve Doctor
- Approve clinician accounts, manage user roles and account status, and monitor clinical directory coverage.
- Assigned Role
- Cancel
- Create Account
- Create an administrator-approved clinician or patient account with a strong initial password.
- Current admin
- Doctor
- Doctor Management
- Doctor Requested
- Dr. Raghav Kulkarni
- Full Name
- Illustrative specialist workload metrics pending clinical workflow phases.
- Initial Password
- Institutional Email
- Loading registered accounts...
- Min 8 chars, upper, lower, number & symbol
- Network Specialist Directory (Sample Data)
- No registered accounts found
- Patient
- Protected administrator directory — approve pending clinician requests, manage roles, or activate and deactivate accounts.
- Provision Clinician
- Provision Verified Account
- Provision a clinician or register a patient account to view entries here.
- Provisioning error
- Refresh
- Registered Accounts & Doctor Approvals
- Unable to load user accounts
- clinician@example.org
- patients

## `pages/admin/AdminFollowUpsPage.tsx`

- &middot;
- Escalate
- Flag Priority (Demo)
- Flag follow-up for priority outreach?
- Follow-up Monitoring
- Monitored
- Track post-screening adherence SLAs and flag overdue high-risk follow-ups for care coordinator outreach.

## `pages/admin/AdminPatientsPage.tsx`

- &middot;
- Adherence Rate
- Assigned Clinician
- Audit patient enrollments, primary clinician assignments, and care-continuity status across clinics.
- Close
- Last Screened
- Next Follow-up
- Patient Management
- Summary

## `pages/admin/AdminPopulationHealthPage.tsx`

- Across 6 districts
- Chronic Condition Prevalence Across Network
- District Coverage &amp; Outcomes
- Evaluate regional screening reach, chronic disease burden, and care-closure equity across participating districts.
- Fictional cohort counts tracked by primary screening category.
- Follow-up Closure
- Median Referral SLA
- Participating Clinics
- Population Health
- Screening Coverage
- Screening to consult
- vs. prior quarter

## `pages/admin/AdminReferralsPage.tsx`

- &middot;
- &middot; Created
- &rarr;
- From
- Referral Management
- Track inter-facility specialist referrals, monitor urgent handoffs, and identify scheduling bottlenecks.

## `pages/admin/AdminRiskDistributionPage.tsx`

- % controlled
- Analyze cohort risk tier composition, escalation guidelines, and monthly high-risk screening trends.
- Condition Control Benchmarks
- Fictional distribution across all 4,820 enrolled population health participants.
- High-Risk Identifications per Month
- Network Risk Stratification Breakdown
- Newly identified high and critical risk cases from outreach screenings.
- Percentage of enrolled patients meeting target clinical control.
- Risk Distribution

## `pages/admin/AdminSettingsPage.tsx`

- Console Theme
- Include district screening equity indicators in analytics summaries.
- Operational alerting thresholds apply locally until automated notification workflows are enabled.
- Organization & Operational Thresholds (Sample)
- Overdue Critical Follow-up Alerts
- Platform Settings
- Program Network
- Review your authenticated administrator profile, console theme, and operational preferences.
- Save Configuration
- Sign Out
- Surface clinics with overdue critical-risk tasks on the overview dashboard.
- Toggle between light and dark mode across all charts, tables, and views.
- Urgent Referral Target SLA (Hours)
- Verified
- Weekly District Coverage Summary

## `pages/auth/ForgotPasswordPage.tsx`

- Account Email
- Automated email dispatch connects in the notifications phase; contact your administrator for immediate assistance.
- Back to Sign In
- Check recovery options
- Create account
- Enter a different email
- Enter the email address linked to your CareBridge AI account for password recovery guidance.
- If an active account matches the email address provided, recovery guidance applies. Outbound email delivery is scheduled for a future release — please contact your CareBridge AI platform administrator for immediate account assistance.
- Reset your password
- name@example.org

## `pages/auth/LoginPage.tsx`

- name@example.org

## `pages/auth/RegisterPage.tsx`

- ) is ready to sign in with
- . Your CareBridge AI account (
- Account Type
- Account created successfully
- Already have an account?
- Confirm Password
- Continue to Sign In
- Create a strong password
- Create your CareBridge account
- Doctor verification pending:
- Email Address
- For clinical security, new accounts start with standard
- Full Name
- I agree to the CareBridge AI Terms of Use and Privacy Guidelines and acknowledge not to submit real protected patient information in demonstration workflows.
- Password strength
- Patient
- Re-enter your password
- Register to access secure, role-based care coordination.
- Registration failed
- Return to Home
- Sign in
- Welcome,
- Your clinician access request has been recorded for administrator review. Doctor dashboard access is enabled once an administrator approves your account.
- access.
- access. A platform administrator must verify and approve your account before Doctor privileges are activated.
- e.g., Ananya Mehta
- name@example.org

## `pages/doctor/DoctorAppointmentsPage.tsx`

- Appointment Details
- Appointment filter tabs
- Appointments
- Assigned Doctor
- Back
- Cancel
- Close
- Complete
- Confirm
- Details
- Incoming patient requests and confirmed clinic sessions for your assigned panel will appear here.
- New Date & Time
- No appointments in this view
- Patient
- Patient Request Note
- Refresh
- Reject
- Reschedule
- Reschedule Appointment
- Reschedule Note (Optional)
- Reset
- Review incoming appointment requests from assigned patients, confirm or reschedule slots with conflict checking, and log visit outcomes.
- Save New Schedule
- Scheduled Time
- Scheduling Note
- Search appointments by patient name or visit type...
- Today
- Visit Mode
- Visit Type
- appointments
- e.g., Moved to Thursday morning diagnostic clinic session.

## `pages/doctor/DoctorFollowUpsPage.tsx`

- Assigned Patient
- Cancel
- Cancel Follow-up
- Cancel follow-up plan?
- Care Instructions / Notes (Optional)
- Closed
- Concise instructions visible on the patient's follow-up plan...
- Create an in-app follow-up schedule for an assigned patient and optionally link an existing visit or referral.
- Delivered inside the CareBridge AI portal only (no external SMS or email is sent).
- Follow-up Notes
- Follow-up Purpose
- Follow-up Status
- Follow-up status tabs
- Follow-ups
- Link to Appointment (Optional)
- Link to Referral (Optional)
- No follow-ups in this view
- No patients are currently assigned to your care panel. Follow-ups can only be scheduled for actively assigned patients.
- Refresh
- Reschedule Date & Time (Optional)
- Save Changes
- Schedule Follow-up
- Schedule Patient Follow-up
- Schedule a follow-up plan for any assigned patient to track next consultations, repeat investigations, or referral checks in-app.
- Schedule and monitor post-visit, post-report, and post-referral follow-ups across your assigned patient panel using in-app care updates.
- Search follow-ups by patient name, plan type, or instruction...
- Target Follow-up Date & Time
- Update
- Update Follow-up Plan
- e.g., Repeat fasting glucose & blood pressure check
- follow-ups

## `pages/doctor/DoctorNotificationsPage.tsx`

- Could not load notifications
- Filter notifications by category
- In-app updates appear automatically when administrators assign patients, patients upload reports or request visits, or follow-ups require attention.
- In-app workflow notifications for patient assignments, report submissions, appointment requests, referrals, and overdue follow-ups.
- Mark All Read
- Notification previews omit sensitive clinical notes and diagnostic identifiers by design. Notifications are delivered exclusively in-app.
- Notification read status filter
- Notifications
- Refresh
- unread

## `pages/doctor/DoctorOverviewPage.tsx`

- All patients
- Assigned Patients
- Authorized clinical workspace for your assigned patients, pending report reviews, scheduled visits, specialist referrals, and follow-up coordination.
- Chronological updates from reports, appointments, referrals, and follow-ups for your assigned panel
- Clinical workload summary
- Could not load dashboard overview
- Create Referral
- Follow-ups Requiring Attention
- Manage Appointments
- Manage all
- Manage follow-ups
- New medical reports uploaded by your assigned patients appear here automatically.
- No appointments scheduled today
- No patients assigned yet
- No pending follow-ups
- No recent clinical activity
- No reports awaiting review
- Once patients are assigned and interact with reports, visits, referrals, or follow-ups, their activity timeline appears here.
- Open Appointments
- Overdue and upcoming follow-up plans across assigned patients
- Patients Requiring Attention
- Patients actively assigned to your clinical panel
- Patients appear here as soon as an authorized administrator assigns them to your care panel.
- Pending Follow-ups
- Pending Referrals
- Pending Report Reviews
- Quick Actions
- Recent Patient Activity
- Recently Assigned Patients
- Refresh
- Reports Awaiting Review
- Review
- Review Reports
- Schedule Follow-up
- Schedule a follow-up after reviewing a report, visit, or referral to track continuity of care.
- Scheduled and pending visits for today (UTC schedule)
- Today's Appointments
- Upcoming Appointments
- Upcoming or pending patient appointment requests will appear here once scheduled.
- Uploaded medical reports from your assigned patients
- View Patients
- View queue
- · Assigned
- · Due

## `pages/doctor/DoctorPatientDetailsPage.tsx`

- All pending, scheduled, completed, and cancelled visits for this patient
- Appointment History
- Assessed
- Assignment-verified patient record
- Authorized demographic & contact information
- Back to My Patients
- CareBridge AI does not fabricate risk scores or diagnoses. Valid screening or clinical assessment records appear here once recorded.
- Clinical items awaiting your action
- Clinician Report Review History
- Clinician review decisions and observations will be recorded here once a report is evaluated.
- Clinician-only notes
- Create Referral
- Create a specialist referral whenever multidisciplinary evaluation is clinically warranted.
- Created
- Date of Birth
- Diagnostic files submitted directly by the patient
- Download
- Due
- Emergency Contact
- Follow-up Schedule
- Gender
- Language
- Loading authorized patient chart and care history...
- Location
- Manage Appointments
- My Patients
- New Referral
- No appointments recorded
- No clinical activity recorded yet
- No emergency contact added by patient yet.
- No follow-ups scheduled
- No medical reports uploaded yet
- No patient selected
- No referrals recorded
- No report review notes yet
- No risk assessment records available
- Open My Patients
- Open Risk Review
- Open your assigned patients list to view medical reports, clinical reviews, appointments, referrals, and follow-up plans.
- Patient Details
- Patient Profile
- Patient appointment requests and confirmed clinic visits will appear here.
- Patient chart sections
- Patient record unavailable
- Patient-Uploaded Medical Reports
- Pending, overdue, and completed continuity-of-care tasks
- Phone
- Recent Activity & Timeline
- Recorded internal referral coordination history
- Recorded milestones from reports, clinician reviews, appointments, referrals, and follow-ups
- Review
- Risk Assessment & Clinical Review History
- Schedule
- Schedule Follow-up
- Schedule a structured follow-up plan to track next visits or post-report monitoring.
- Scheduling note:
- Select a patient from your assigned roster to inspect their authorized clinical dossier.
- Separated clinician-authored review decisions and protected clinical notes
- Specialist Referrals
- This patient has not uploaded any PDF, PNG, or JPG medical reports yet.
- Uploaded medical reports, visits, referrals, and follow-up updates for this patient will appear here chronologically.
- Verified Clinician Reviews
- · Uploaded

## `pages/doctor/DoctorPatientsPage.tsx`

- Assignment-scoped authorization is enforced on every patient request. Only administrators can create, revoke, or transfer patient-doctor assignments.
- Filter patients by care status
- My Patients
- No risk record
- Open Chart
- Refresh
- Reset
- Search assigned patients by name, city, or state...
- Show All Assigned Patients
- View and manage patients officially assigned to your care panel. Access is restricted to active authorized assignments.
- assigned
- assigned patients
- pending follow-up
- report
- upcoming visit

## `pages/doctor/DoctorProfilePage.tsx`

- Access-controlled; never shared on public or patient views.
- Account Since
- Account role and clinician verification status are verified solely by platform administrators and cannot be modified from this form.
- Administrator-Governed Verification
- Clinician Profile
- Could not load clinician profile
- Department
- Hospital or Clinic
- Loading your professional clinician credentials...
- Manage your specialization, qualifications, clinic affiliation, and access-controlled registration details.
- Medical License Number (Optional · Restricted)
- Portal Role
- Professional Credentials & Practice Information
- Professional identity and clinic affiliation
- Profile Completeness
- Protected clinician credential storage
- Qualification
- Refresh
- Save Profile Changes
- Specialization
- Update your authorized clinician profile fields. Sensitive credential numbers remain restricted and are never displayed publicly.
- Verification
- Years of Experience
- e.g., CareBridge Community Health Center
- e.g., Internal Medicine
- e.g., MBBS, MD (General Medicine)
- e.g., MCI-2019-44821
- e.g., Preventive & Internal Medicine

## `pages/doctor/DoctorReferralsPage.tsx`

- Active Total:
- Assigned Patient
- Cancel
- Cancelled:
- Close
- Completed:
- Concise Clinical Referral Reason
- Coordination History Note (Clinician Log, Optional)
- Create Referral
- Create Specialist Referral
- Create a referral for an assigned patient when specialty consultation or diagnostic coordination is clinically appropriate.
- Create and track specialist referrals for your assigned patients with validated status transitions and a complete coordination history.
- Created
- Filter referrals by department
- Filter referrals by status
- Next Status
- Next step:
- No additional status changes recorded yet.
- No patients are currently assigned to your panel. Referrals can only be created for actively assigned patients.
- No specialist referrals recorded
- Pending:
- Recommended Next Step (Optional)
- Refer an actively assigned patient to an authorized clinical specialty or department.
- Referral Audit History (
- Referral Details & History
- Referrals
- Referred by
- Refresh
- Save Status Transition
- Search referrals by patient, specialty, or reason...
- State the clinical indication and relevant background for specialist review...
- Target Specialty / Department
- Update Referral Status
- Updated Next Step (Optional)
- e.g., Bring prior diagnostic imaging and fasting lipid panel
- referrals

## `pages/doctor/DoctorReportDetailPage.tsx`

- All Reports
- Authorized medical report review workspace
- Back to Reports
- Clinical Review History
- Clinical Review Note (Clinician Portal Only)
- Complete chronological log of clinician reviews for this report
- Coordinate follow-up or specialist referral for this patient
- Create Specialist Referral
- Document Metadata
- Download File
- Download the file to examine it and submit your first review entry above.
- Last Updated
- Loading authorized diagnostic report and review history...
- Location
- Medical report unavailable
- Next Care Steps
- No clinician reviews recorded yet
- Original patient-uploaded file (read-only)
- Patient
- Patient Chart
- Record Clinical Review
- Report Review
- Review Decision
- Review Entries
- Save Review Decision
- Schedule Follow-up
- Status updated without an additional clinical note.
- Summarize key clinical observations, verification notes, or follow-up considerations...
- Update the report review status and record a clinician-only review note. The patient receives a privacy-safe status update without raw clinical note text.
- Upload Status
- Uploaded document is never modified or overwritten

## `pages/doctor/DoctorReportsPage.tsx`

- Download
- Filter by file format
- Filter by review status
- In Review:
- Inspect uploaded diagnostic documents from your assigned patients, record clinical review decisions, and preserve full review history.
- Medical Reports
- Needs Follow-up:
- Pending:
- Refresh
- Reset
- Review
- Reviewed:
- Search by report filename or patient name...
- Uploaded report files are immutable and served only over authenticated, assignment-verified clinician downloads. Clinician review notes remain protected within the doctor portal.
- logged review
- reports

## `pages/doctor/DoctorRiskReviewPage.tsx`

- Awaiting verified clinician evaluation.
- Cancel
- Clinical Review Outcome
- Clinician Review History (
- Clinician Review Note (Protected)
- Displayed as general care guidance on the patient's health record.
- Filter by assessment status
- Filter by risk category
- Flagged / Follow-up Required:
- Inspect valid risk assessment records for your assigned patients, distinguish source context from clinician evaluation, and document clinical review observations.
- Patient next step:
- Patient-Facing Next Step (Optional)
- Pending Review:
- Record Clinical Review
- Record Clinical Risk Review
- Record your clinical assessment note, verification findings, or reason for flagging additional review...
- Recorded
- Refresh
- Reset Filters
- Reviewed:
- Risk Review
- Save Clinical Review
- Unable to load risk assessments
- View linked medical report
- e.g., Schedule fasting follow-up consultation within 2 weeks
- risk assessments

## `pages/doctor/DoctorSettingsPage.tsx`

- Active DOCTOR Session
- Active mode:
- Authenticated Clinician Session
- CareBridge AI records assignment updates, patient report submissions, appointment requests, referral changes, and overdue follow-up notices inside your authenticated clinician portal. No external SMS or email alerts are dispatched, and private clinical notes are excluded from notification previews.
- Color Theme
- Configure interface appearance, language preferences, and session controls for your CareBridge AI clinician portal.
- Customize workspace theme and localized interface preferences
- Display & Language
- Edit Clinician Profile
- In-App Delivery Only
- In-App Notification Policy
- Interface Language
- Open Notification Center
- Privacy-first clinical event notifications
- Protected via HttpOnly cookies, CSRF double-submit verification, and assignment-scoped RBAC
- Sign Out
- Sign out of clinician workspace?
- Signing out immediately revokes your refresh token and invalidates your current clinician access session.
- Stored locally without recording any patient or clinical data
- Workspace Settings
- clinical palette
- · Tokens are never written to browser web storage.

## `pages/patient/PatientAppointmentsPage.tsx`

- Appointment Details
- Appointment Type
- Appointment schedule filter
- Appointments
- Assigned Clinician
- Cancel
- Cancel Appointment
- Cancel appointment request?
- Care Team Scheduling Update
- Check appointment request details
- Clinician:
- Close
- Could not load appointments
- Details
- Filter appointments by status
- Loading your appointments...
- Patient Note
- Preferred / Scheduled Time
- Preferred Date
- Preferred Time
- Preferred Visit Mode
- Request Appointment
- Request an Appointment
- Requested On
- Review upcoming visits, consult past appointment records, and submit appointment requests for care-team scheduling.
- Share brief scheduling context (do not include emergency symptoms; call local emergency services for urgent care).
- Submit Request
- Submit your preferred visit type, mode, and date. Requests start as Pending Confirmation and a clinician is assigned by the care team.
- Visit Note (Optional)
- Visit Type

## `pages/patient/PatientFollowUpsPage.tsx`

- Close
- Completed
- Could not load follow-ups
- Created
- Details
- Follow-up Details
- Follow-up Type
- Follow-up category filter
- Follow-ups
- Instructions
- Last Updated
- Loading your follow-up milestones...
- Mark Complete
- Mark Completed
- Mark follow-up completed?
- Next step:
- Overdue
- Recorded in portal
- Scheduled For
- Show All Follow-ups
- Stay on track with scheduled post-visit check-ins, repeat screening tasks, and continuity-of-care milestones.
- Target date:
- Upcoming
- View Appointments

## `pages/patient/PatientNotificationsPage.tsx`

- Could not load notifications
- In-app updates about your uploaded reports, appointment requests, referrals, and follow-up tasks.
- Loading your notifications...
- Mark all as read
- Mark read
- New
- Notification filter
- Notifications
- Open
- View Notification History
- unread

## `pages/patient/PatientOverviewPage.tsx`

- Active stage
- Appointments
- Common actions for managing your care coordination.
- Completed stage
- Could not load dashboard overview
- Dashboard refresh failed
- Follow-ups Due
- Get started by uploading a medical report, requesting an appointment, or adding optional contact preferences to your profile.
- Health overview metrics
- Latest updates across your uploaded reports, appointments, referrals, and follow-up milestones.
- Loading your health dashboard...
- Loading your personal care overview, reports, and schedule.
- Manage your health reports, referrals, appointments, and follow-up tasks in one secure portal.
- No care activity recorded yet
- Patient Portal
- Pending Referrals
- Profile Completion
- Quick Actions
- Recent Activity
- Request Appointment
- Screening → Report Submitted → Review → Referral → Appointment → Follow-up — updated automatically from your real account records.
- Step
- Track your uploaded medical reports, appointments, specialist referrals, and care follow-ups in one place.
- Upcoming Appointments
- Upcoming stage
- Upload Health Report
- Uploaded Reports
- Your Health Journey
- optional fields anytime

## `pages/patient/PatientProfilePage.tsx`

- Account Role
- Applies to your portal language preference.
- City (Optional)
- Contact full name
- Could not load profile
- Date of Birth (Optional)
- Email Address
- Emergency Contact (Optional)
- Emergency Contact Name (Optional)
- Emergency Contact Phone (Optional)
- Full Name
- Gender (Optional)
- Keep only the details you are comfortable sharing. Email and account role are locked for security.
- Last Updated
- Loading your profile...
- Manage your optional contact details, preferred language, and emergency contact. Optional fields are never required to access your portal.
- Manage your personal contact preferences, preferred language, and emergency contact.
- Member Since
- My Profile
- Optional point of contact for urgent clinic coordination.
- Patient
- Patient (read-only)
- Personal & Emergency Coordination Details
- Phone Number (Optional)
- Preferred Language
- Profile Completion
- Profile completion
- Registered on your CareBridge AI account.
- Reset Changes
- Save Profile
- Sign Out of Session
- State / Region (Optional)
- Unable to update profile
- Used for secure account sign-in.
- Your profile is private to your authenticated account and never shared with other patients.
- coordination fields completed. All demographic and emergency fields are optional.
- e.g., Maharashtra
- e.g., Pune

## `pages/patient/PatientReferralsPage.tsx`

- Close
- Coordination Note
- Could not load referrals
- Department
- Filter referrals by status
- Issued
- Last Updated
- Loading your referral records...
- Next action:
- Recommended Next Step
- Referral Date
- Referral Details
- Referral Tracking
- Referral marked Cancelled on
- Referral status timeline
- Referring Clinician
- Referring clinician:
- Show All Referrals
- Track clinician-initiated referrals across specialty departments, view current progress, and see recommended next steps.
- View Appointments
- View Details

## `pages/patient/PatientReportsPage.tsx`

- &middot; Uploaded
- Choose medical report file
- Clear Filters
- Close
- Could not load medical reports
- Details
- Document Name
- Download
- Download File
- Drag and drop a PDF, PNG, or JPG medical report or press Enter to browse
- File Size
- Filter reports by file format
- Filter reports by review status
- Last Updated
- Loading your medical reports...
- MB · Files are verified on the server before saving
- Medical Report Details
- My Medical Reports
- PDF, PNG, or JPG up to
- Report could not be uploaded
- Report upload progress
- Reports are stored in private encrypted-session-gated storage and queued for clinical review. Automated report interpretation is not performed during upload.
- Search uploaded reports by filename...
- Syncing latest review status...
- Upload First Report
- Upload Report
- Upload a Health Report
- Upload diagnostic PDFs and scan images securely, track clinical review status, and download your records anytime.
- Uploaded At
- Uploaded documents are held privately for authorized care coordination. Always consult a qualified healthcare professional to interpret diagnostic test results.
- Uploading
- Verified Format
- Verified record stored in your private CareBridge AI portal.

## `pages/patient/PatientRiskPage.tsx`

- Assessed
- Checking authorized risk assessments...
- Coordination Summary
- Could not load risk assessments
- No risk assessment is available yet.
- Read-only care coordination summaries provided by authorized clinical review workflows.
- Recommended Next Action
- Request Appointment
- Reviewing professional:
- Risk Overview
- Updated
- Upload Health Report
- When an authorized clinician reviews your submitted screening or medical reports and publishes a care-coordination risk summary, it will appear here. CareBridge AI never generates placeholder scores or diagnoses.

## `pages/patient/PatientSettingsPage.tsx`

- Account Created
- Account Information & Session
- Account Role
- Appearance
- Applies to your patient profile and bilingual interface content.
- Choose your preferred communication and interface language. Updates persist securely on your patient profile.
- Contact & Emergency Preferences
- Edit Profile
- Email Address
- Full Name
- Language & Profile Preferences
- Loading saved preferences...
- Manage your preferred language, display theme, profile preferences, and active CareBridge AI session.
- Patient (Locked)
- Preferred Language
- Profile completion:
- Save Language
- Select Light or Dark mode across CareBridge AI. Theme preference is saved locally in your browser.
- Settings
- Settings notice
- Sign Out
- Sign out when finished on shared or clinic computers.
- Your registered identity and portal role are protected by server-side access controls.

## `pages/public/LandingPage.tsx`

- &ldquo;
- &rdquo;
- Filter platform capabilities by status

## `pages/public/NotFoundPage.tsx`

- Admin Console
- Back to Home
- CareBridge AI Home
- Doctor Workspace
- Error 404
- Or jump directly to a workspace:
- Page not found
- Patient Dashboard
- Sign In
- The route you requested does not exist or may have moved. Choose a destination below to return to CareBridge AI.

## `pages/public/TermsOfServicePage.tsx`

- &middot;

## `pages/public/UnauthorizedPage.tsx`

- , while this route requires
- 403 &middot; Access Restricted
- Back to Home
- CareBridge AI Home
- Sign Out
- You are signed in as
- You do not have access to this workspace
- Your clinician role request is pending administrator approval. Doctor workspace access activates automatically once approved.
- permissions.
- role
- with the
