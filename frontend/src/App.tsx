import { useState } from 'react';
import { Activity, ArrowRight, CheckCircle2, HeartPulse, Languages, ShieldCheck, Stethoscope } from 'lucide-react';

const features = [
  ['Report intelligence', 'Turn complex screening reports into structured, understandable next steps.'],
  ['Explainable prioritization', 'Surface patients needing attention with visible indicators and review reasons.'],
  ['Connected care', 'Keep referrals, appointments, follow-ups, and patient communication in one loop.'],
];

export default function App() {
  const [language, setLanguage] = useState<'EN' | 'HI'>('EN');
  const isHindi = language === 'HI';
  return (
    <main className="app-shell">
      <nav className="nav container">
        <div className="brand"><span className="brand-mark"><HeartPulse size={22} /></span><span>CareBridge <b>AI</b></span></div>
        <div className="nav-links"><a href="#how">{isHindi ? 'कैसे काम करता है' : 'How it works'}</a><a href="#features">{isHindi ? 'सुविधाएं' : 'Features'}</a><a href="#security">{isHindi ? 'सुरक्षा' : 'Privacy'}</a></div>
        <div className="nav-actions"><button className="language" onClick={() => setLanguage(isHindi ? 'EN' : 'HI')}><Languages size={16} /> {language}</button><button className="btn btn-outline">Sign in</button><button className="btn btn-primary">Get started <ArrowRight size={16} /></button></div>
      </nav>

      <section className="hero container">
        <div className="hero-copy"><div className="eyebrow"><span className="pulse" /> Population health, connected</div><h1>From early screening<br /><span>to timely care.</span></h1><p>CareBridge AI closes the gap between identifying a health risk and delivering the care that follows—helping every patient move forward with clarity.</p><div className="hero-actions"><button className="btn btn-primary btn-lg">Explore the platform <ArrowRight size={18} /></button><button className="text-btn">See how it works <span>↗</span></button></div><div className="trust-row"><ShieldCheck size={18} /> Built for care teams. Designed for people.</div></div>
        <div className="hero-visual"><div className="orb orb-one" /><div className="orb orb-two" /><div className="care-card"><div className="card-top"><span className="mini-icon"><Activity size={17} /></span><span className="muted">Care overview</span><span className="status-dot" /></div><div className="care-title">Good morning, Priya</div><div className="care-sub">Here is your care journey at a glance.</div><div className="metric-grid"><div><small>Screening status</small><strong className="green">On track</strong><div className="bar"><i /></div></div><div><small>Next follow-up</small><strong>18 Jun 2025</strong><span className="tiny-label">Dr. Mehta · Cardiology</span></div></div><div className="journey"><div className="journey-head"><span>Care journey</span><span className="tiny-label">3 of 4 complete</span></div><div className="journey-line"><span className="done">✓</span><i /><span className="done">✓</span><i /><span className="done">✓</span><i className="pending">•</span></div><div className="journey-labels"><span>Screened</span><span>Reviewed</span><span>Referred</span><span>Follow-up</span></div></div></div><div className="floating-note"><span className="note-icon">✦</span><div><b>New care insight</b><small>Your report has been reviewed</small></div></div></div>
      </section>

      <section id="how" className="impact-strip"><div className="container impact-inner"><div><small>THE CAREBRIDGE DIFFERENCE</small><h2>One connected journey.<br /><em>Better health outcomes.</em></h2></div><div className="impact-stats"><div><strong>01</strong><span>Understand the risk</span></div><div><strong>02</strong><span>Navigate to care</span></div><div><strong>03</strong><span>Close the loop</span></div></div></div></section>
      <section id="features" className="features container"><div className="section-kicker">BUILT AROUND THE PATIENT</div><h2>Healthcare that doesn’t<br /><span>stop at the screening.</span></h2><div className="feature-grid">{features.map(([title, text], i) => <article className="feature-card" key={title}><div className="feature-number">0{i + 1}</div><h3>{title}</h3><p>{text}</p><a href="#security">Learn more <ArrowRight size={15} /></a></article>)}</div></section>
      <section id="security" className="security container"><div className="security-icon"><ShieldCheck size={30} /></div><div><div className="section-kicker">TRUST BY DESIGN</div><h2>Private by default.<br /><span>Human at the centre.</span></h2><p>CareBridge AI supports clinical teams—it never replaces them. Every insight is explainable, every decision stays with a qualified professional, and every patient remains in control.</p></div></section>
      <footer className="footer container"><div className="brand"><span className="brand-mark"><HeartPulse size={18} /></span><span>CareBridge <b>AI</b></span></div><span>Team ALPHA · Future Health Challenge · Population Health</span><span>Fictional demo data · Not medical advice</span></footer>
    </main>
  );
}
