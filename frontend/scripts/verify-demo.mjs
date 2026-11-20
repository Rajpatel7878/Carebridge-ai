// Browser-only synthetic workflow. Requires a freshly seeded isolated demo DB.
// Does not print credentials, session data, patient report text, or API bodies.
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';

const base = process.env.CAREBRIDGE_DEMO_URL || 'http://127.0.0.1:5174';
const password = process.env.CAREBRIDGE_DEMO_PASSWORD;
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH;
if (!password || !executablePath)
  throw new Error('Set CAREBRIDGE_DEMO_PASSWORD and CHROMIUM_EXECUTABLE_PATH.');
const file = fileURLToPath(
  new URL('./fixtures/synthetic-report.png', import.meta.url),
);
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--single-process',
    '--no-zygote',
  ],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const bad = new Map();
let pageErrors = 0,
  stage = 'landing';
page.on('pageerror', () => pageErrors++);
page.on('response', (response) => {
  if (response.url().includes('/api/') && response.status() >= 400) {
    const key = `${response.status()} ${new URL(response.url()).pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/g, ':id')}`;
    bad.set(key, (bad.get(key) || 0) + 1);
  }
});
const pass = (message) => console.log(`PASS ${message}`);
async function login(email, role) {
  await page.getByLabel(/^(Email Address|ईमेल पता)$/).fill(email);
  await page.getByLabel(/^(Password|पासवर्ड)$/).fill(password);
  await page.getByRole('button', { name: /^(Sign In|साइन इन)$/ }).click();
  await page.waitForURL(`**/${role}**`);
}
async function logout() {
  await page.getByRole('button', { name: 'Open account menu' }).click();
  await page.getByText('Sign Out', { exact: true }).last().click();
  await page.waitForURL('**/login');
}
async function success(response, status) {
  const r = await response;
  if (r.status() !== status) throw new Error(`Unexpected HTTP ${r.status()}`);
  return r.json();
}
try {
  await page.goto(base);
  await page.locator('h1').waitFor();
  pass('public landing');
  stage = 'patient login';
  await page.goto(`${base}/login`);
  await login('patient1@demo.example.org', 'patient');
  pass('patient login');
  stage = 'Hindi';
  await page.getByRole('button', { name: /language.*Hindi/i }).click();
  await page.waitForFunction(() => document.documentElement.lang === 'hi');
  pass('Hindi switch');
  stage = 'upload';
  await page.goto(`${base}/patient/reports`);
  const upload = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/patient/reports') &&
      r.request().method() === 'POST',
  );
  await page.getByLabel('Choose medical report file').setInputFiles(file);
  const report = await success(upload, 201);
  pass('synthetic image upload');
  stage = 'analysis';
  const card = page
    .locator('div')
    .filter({
      has: page.getByRole('heading', { name: 'synthetic-report.png' }),
    })
    .filter({ has: page.getByRole('button', { name: 'Details' }) })
    .last();
  await card.getByRole('button', { name: 'Details' }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByText('रिपोर्ट विश्लेषण', { exact: true }).waitFor();
  await dialog.getByRole('checkbox').check();
  const analysisResponse = page.waitForResponse(
    (r) => r.url().includes('/analyses') && r.request().method() === 'POST',
  );
  await dialog.getByRole('button', { name: /बाहरी विश्लेषण/ }).click();
  const analysis = await success(analysisResponse, 201);
  if (
    analysis.status !== 'SIMULATED' ||
    analysis.provider !== 'MOCK' ||
    !analysis.external_consent ||
    !analysis.result.extraction.pages.some(
      (p) => p.method === 'OCR' && p.text.includes('SYNTHETIC'),
    )
  )
    throw new Error('Expected consented local OCR and labelled simulation');
  await dialog.getByText('सिमुलेटेड विश्लेषण', { exact: true }).waitFor();
  pass('consent, local OCR and labelled simulation');
  stage = 'doctor login';
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await logout();
  await login('doctor1@demo.example.org', 'doctor');
  if ((await page.evaluate(() => document.documentElement.lang)) !== 'hi')
    throw new Error('Language did not persist through login');
  pass('doctor login with persisted Hindi');
  stage = 'doctor review';
  await page.goto(`${base}/doctor/reports`);
  const row = page.getByRole('row').filter({ hasText: 'synthetic-report.png' });
  await row.getByRole('button', { name: 'Review' }).click();
  await page.waitForURL(`**/doctor/reports/${report.id}`);
  await page.getByText('सिमुलेटेड विश्लेषण', { exact: true }).waitFor();
  await page
    .getByLabel('Clinical Review Note (Clinician Portal Only)')
    .fill('Synthetic demonstration review only.');
  const review = page.waitForResponse(
    (r) => r.url().includes('/review') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Save Review Decision' }).click();
  await success(review, 201);
  pass('assigned doctor report review');
  stage = 'priority';
  await page.goto(`${base}/doctor/risk-review`);
  await page.getByText('Operational priority queue').waitFor();
  const priority = page
    .locator('div')
    .filter({
      has: page.getByRole('heading', {
        name: 'Synthetic Patient 01',
        exact: true,
      }),
    })
    .filter({ has: page.getByRole('button', { name: 'Recalculate' }) })
    .last();
  const recalc = page.waitForResponse(
    (r) =>
      r.url().includes('/priority/recalculate') &&
      r.request().method() === 'POST',
  );
  await priority.getByRole('button', { name: 'Recalculate' }).click();
  const assessment = await success(recalc, 200);
  if (!assessment.explanation || !assessment.reasons?.length)
    throw new Error('Missing priority explanation');
  pass('operational priority with explanation');
  stage = 'referral';
  await page.goto(`${base}/doctor/referrals`);
  await page.getByRole('button', { name: 'Create Referral' }).first().click();
  dialog = page.getByRole('dialog');
  await dialog
    .getByLabel('Assigned Patient')
    .selectOption({ label: 'Synthetic Patient 01' });
  await dialog
    .getByLabel('Concise Clinical Referral Reason')
    .fill('Synthetic coordination demonstration only.');
  const referral = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/doctor/referrals') &&
      r.request().method() === 'POST',
  );
  await dialog.getByRole('button', { name: 'Create Referral' }).click();
  await success(referral, 201);
  pass('referral');
  stage = 'follow-up';
  await page.goto(`${base}/doctor/follow-ups`);
  await page
    .getByRole('button', { name: 'Schedule Follow-up' })
    .first()
    .click();
  dialog = page.getByRole('dialog');
  await dialog
    .getByLabel('Assigned Patient')
    .selectOption({ label: 'Synthetic Patient 01' });
  await dialog
    .getByLabel('Follow-up Purpose')
    .fill('Synthetic coordination demo');
  const future = new Date(Date.now() + 30 * 86400000);
  const local = new Date(future.getTime() - future.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  await dialog.getByLabel('Target Follow-up Date & Time').fill(local);
  const followup = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/doctor/follow-ups') &&
      r.request().method() === 'POST',
  );
  await dialog.getByRole('button', { name: 'Schedule Follow-up' }).click();
  await success(followup, 201);
  pass('follow-up');
  stage = 'admin login';
  await logout();
  await login('admin@demo.example.org', 'admin');
  pass('administrator login');
  stage = 'assignment';
  await page.goto(`${base}/admin/doctors`);
  await page.getByRole('button', { name: 'Assign Patient' }).click();
  dialog = page.getByRole('dialog');
  await dialog
    .getByLabel('Patient Account')
    .selectOption({
      label: 'Synthetic Patient 01 (patient1@demo.example.org)',
    });
  await dialog
    .getByLabel('Verified Doctor Account')
    .selectOption({ label: 'Dr Synthetic Lake (doctor2@demo.example.org)' });
  const assign = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/admin/assignments') &&
      r.request().method() === 'POST',
  );
  await dialog.getByRole('button', { name: 'Confirm Assignment' }).click();
  const assignment = await success(assign, 201);
  pass('administrative assignment');
  stage = 'audit';
  await page.goto(`${base}/admin/audit-logs`);
  await page.getByLabel('कार्रवाई में खोजें').fill('assignment.created');
  const audit = page.waitForResponse(
    (r) =>
      r.url().includes('/api/admin/audit-logs') &&
      new URL(r.url()).searchParams.get('action') === 'assignment.created',
  );
  await page.getByRole('button', { name: 'फ़िल्टर लागू करें' }).click();
  const logs = await success(audit, 200);
  if (
    !logs.items.some(
      (e) =>
        e.resource_id === assignment.id &&
        e.outcome === 'SUCCESS' &&
        e.actor_role === 'ADMIN',
    )
  )
    throw new Error('Assignment audit missing');
  await page.getByText('assignment.created').first().click();
  pass('administrator audit verification');
  stage = 'English';
  await page.getByRole('button', { name: /English/i }).click();
  await page.getByText('Administrative audit logs', { exact: true }).waitFor();
  await page.reload();
  await page.getByText('Administrative audit logs', { exact: true }).waitFor();
  pass('English switch and reload persistence');
  console.log('Uncaught browser page errors:', pageErrors);
  console.log(
    'HTTP errors by endpoint:',
    JSON.stringify(Object.fromEntries(bad)),
  );
  if (pageErrors) process.exitCode = 1;
} catch (error) {
  console.error(`FAIL at ${stage}: ${error.message.split('\n')[0]}`);
  console.log('Uncaught browser page errors:', pageErrors);
  console.log(
    'HTTP errors by endpoint:',
    JSON.stringify(Object.fromEntries(bad)),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
