import React, { useState } from 'react';

const SAMPLES = [
  {
    title: 'PayPal Urgency Phish',
    badge: 'Classic Urgency',
    type: 'phish',
    text: 'URGENT SECURITY ALERT: Your PayPal account has been suspended due to unauthorized access. Click http://192.168.1.1/verify to confirm your credentials immediately!'
  },
  {
    title: 'Cisco CCNA (Marketing)',
    badge: 'Tracking Links',
    type: 'benign',
    text: `Hi Gyan,
Whether you have recently entered the field or are looking to solidify your technical foundation, taking the next step in your career requires both certification and practical, on-the-job expertise. If you're ready to move from entry-level tasks to more complex network administration, this season is built for you.
This is the exact gap CCNA Prep Season 4 is designed to bridge.
We are moving past basic theory. This season is your opportunity to gain the practical intuition needed to tackle the Cisco 200-301 CCNA v2.0 (available on February 3, 2027) blueprint while sharpening the skills that make you indispensable at work.
Series schedule:
OSPFv3 Unlocked: Routing the IPv6 Way - Thursday, October 8, 2026 | 10:00 a.m. Pacific Time
A CCNA Diagnostic Playbook: Isolating Faults from Layer 1 to Layer 7 - Thursday, October 22, 2026
Register now at https://mkto-trk.cisco.com/NTY0LVdIVi0zMjMAAAGksonK9zYv1jYXo46KlvMI for CCNA Prep Season 4. It's free!
Learn with Cisco`
  },
  {
    title: 'Vendor Invoice (Spear-Phish)',
    badge: 'Subtle Evasive',
    type: 'phish',
    text: 'Hi Sarah, please find the updated quarterly audit invoices attached in our OneDrive repository. Kindly review the payment terms before Friday.'
  },
  {
    title: 'Corporate Bank OTP (Legit)',
    badge: 'Transactional',
    type: 'benign',
    text: 'Your one-time passcode for online banking authorization is 849201. Do not share this PIN with anyone. Expires in 10 minutes.'
  },
  {
    title: 'Delivery Smishing (SMS)',
    badge: 'Mobile SMS',
    type: 'phish',
    text: 'USPS Notice: Your package #9400111 could not be dispatched due to incorrect house number. Update your address at https://bit.ly/usps-track-99 within 12 hours.'
  },
  {
    title: 'Engineering Standup (Legit)',
    badge: 'Internal Work',
    type: 'benign',
    text: 'Hi everyone, quick reminder that our sprint retrospective has been moved to 3 PM UTC. See you in the main Zoom room!'
  }
];

export default function App() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [activeThreshold, setActiveThreshold] = useState(0.070);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const apiUrl = import.meta.env.VITE_API_URL || 'https://phishing-smishing-detector.onrender.com';

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(apiUrl + '/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error('API request failed with status: ' + response.statusText);
      }

      const data = await response.json();
      setResult(data);
      if (data.threshold) {
        setActiveThreshold(data.threshold);
      }
    } catch (err) {
      setError(err.message || 'Failed to connect to PhishGuard API service.');
    } finally {
      setLoading(false);
    }
  };

  // Dynamic evaluation based on the user-selected threshold toggle
  const currentRiskScore = result ? result.risk_score : 0;
  const isFlagged = currentRiskScore >= activeThreshold;
  
  let dynamicVerdict = 'LEGITIMATE / SAFE';
  let verdictColor = '#10b981'; // Green
  let verdictBadgeBg = '#064e3b';
  let verdictBorder = '#059669';

  if (isFlagged) {
    if (currentRiskScore >= 0.50) {
      dynamicVerdict = 'CRITICAL PHISHING ATTACK';
      verdictColor = '#ef4444'; // Red
      verdictBadgeBg = '#7f1d1d';
      verdictBorder = '#dc2626';
    } else {
      dynamicVerdict = 'SUSPICIOUS / QUARANTINE';
      verdictColor = '#f59e0b'; // Amber
      verdictBadgeBg = '#78350f';
      verdictBorder = '#d97706';
    }
  }

  const handleCopyReport = () => {
    if (!result) return;
    const report = `### PhishGuard Threat Intelligence Report
- **Payload Length**: ${text.length} characters
- **Verdict**: ${dynamicVerdict}
- **Ensemble Risk Score**: ${(currentRiskScore * 100).toFixed(1)}% (Threshold: ${activeThreshold})
- **DistilBERT (Semantic)**: ${(result.distilbert_prob * 100).toFixed(1)}%
- **XGBoost (Heuristics)**: ${(result.xgb_prob * 100).toFixed(1)}%
- **TF-IDF (Lexical)**: ${(result.tfidf_prob * 100).toFixed(1)}%
- **Triggered Signals**: ${result.top_signals.length > 0 ? result.top_signals.map(s => s.description).join(', ') : 'None (Zero heuristic violations)'}
- **SOC Action**: ${result.soc_guidance || (isFlagged ? 'Quarantine message for investigation' : 'Allow inbox delivery')}
Generated by PhishGuard AI Enterprise`;

    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Fallback heuristic features extracted locally if backend didn't supply all_features
  const computeLocalFeatures = (txt) => {
    if (!txt) return {};
    const urls = (txt.match(/https?:\/\/[^\s]+|www\.[^\s]+/gi) || []);
    const ipMatch = /https?:\/\/(?:\d{1,3}\.){3}\d{1,3}/i.test(txt);
    const shorteners = ["bit.ly", "tinyurl.com", "t.co", "is.gd", "buff.ly", "ow.ly", "goo.gl", "cutt.ly"];
    const hasShortener = urls.some(u => shorteners.some(s => u.toLowerCase().includes(s)));
    const urgencyKeywords = [
      "verify", "suspended", "immediately", "urgent", "password", "otp", "kyc", "blocked",
      "security alert", "unauthorized", "action required", "expire", "login", "account", "bank"
    ];
    const urgencyHits = urgencyKeywords.filter(k => new RegExp(`\\b${k}\\b`, 'i').test(txt)).length;
    const uppercaseCount = (txt.match(/[A-Z]/g) || []).length;
    const digitsCount = (txt.match(/[0-9]/g) || []).length;

    return {
      num_urls: urls.length,
      max_url_len: urls.length > 0 ? Math.max(...urls.map(u => u.length)) : 0,
      has_ip_url: ipMatch ? 1 : 0,
      has_shortener: hasShortener ? 1 : 0,
      urgency_hits: urgencyHits,
      upper_ratio: txt.length > 0 ? uppercaseCount / txt.length : 0,
      digit_ratio: txt.length > 0 ? digitsCount / txt.length : 0,
      at_in_urls: urls.reduce((acc, u) => acc + (u.split('@').length - 1), 0),
      hyphen_in_urls: urls.reduce((acc, u) => acc + (u.split('-').length - 1), 0),
      excl_count: (txt.match(/!/g) || []).length,
      qmark_count: (txt.match(/\?/g) || []).length,
      text_length: txt.length
    };
  };

  const featureTelemetry = result?.all_features || computeLocalFeatures(text);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#090d16',
      color: '#f1f5f9',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      padding: '2.5rem 1rem'
    }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        
        {/* Header Section */}
        <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.9rem',
            borderRadius: '9999px',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            color: '#38bdf8',
            fontSize: '0.8rem',
            fontWeight: '600',
            marginBottom: '0.8rem',
            letterSpacing: '0.05em'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#38bdf8', boxShadow: '0 0 10px #38bdf8' }} />
            ENTERPRISE SOC THREAT DETECTION PLATFORM
          </div>

          <h1 style={{
            fontSize: '2.75rem',
            fontWeight: '900',
            letterSpacing: '-0.025em',
            background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 50%, #c084fc 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: '0.2rem 0'
          }}>
            PhishGuard AI
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1.05rem', maxWidth: '640px', margin: '0.5rem auto 0', lineHeight: '1.5' }}>
            Production Multimodal Threat Intelligence: <strong style={{ color: '#cbd5e1' }}>DistilBERT</strong> Intent Classifier + <strong style={{ color: '#cbd5e1' }}>XGBoost</strong> Security Signals + <strong style={{ color: '#cbd5e1' }}>Meta-Learner</strong>
          </p>
        </header>

        {/* Quick Threat Library Samples */}
        <section style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Select Threat Scenario:
            </span>
            <span style={{ fontSize: '0.75rem', color: '#475569' }}>Click to auto-populate message</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '0.5rem' }}>
            {SAMPLES.map((s, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setText(s.text);
                  setResult(null);
                  setError('');
                }}
                style={{
                  backgroundColor: '#131b2e',
                  color: '#e2e8f0',
                  border: '1px solid #1e293b',
                  borderRadius: '10px',
                  padding: '0.6rem 0.75rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = s.type === 'phish' ? '#ef4444' : '#38bdf8';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#1e293b';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: '700',
                    padding: '0.15rem 0.4rem',
                    borderRadius: '4px',
                    backgroundColor: s.type === 'phish' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                    color: s.type === 'phish' ? '#fca5a5' : '#7dd3fc'
                  }}>
                    {s.badge}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s.title}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Payload Input Console */}
        <section style={{
          backgroundColor: '#111827',
          borderRadius: '14px',
          padding: '1.25rem',
          border: '1px solid #1f2937',
          boxShadow: '0 20px 30px -10px rgba(0,0,0,0.5)',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#cbd5e1' }}>
              Raw Communication Payload (Email / SMS / Corporate Ping)
            </label>
            {text && (
              <button
                onClick={() => { setText(''); setResult(null); }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                Clear Input
              </button>
            )}
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste raw email body, smishing SMS text, or security notification to inspect security signals..."
            rows={7}
            style={{
              width: '100%',
              backgroundColor: '#090d16',
              color: '#f8fafc',
              border: '1px solid #374151',
              borderRadius: '10px',
              padding: '1rem',
              fontSize: '0.95rem',
              lineHeight: '1.6',
              resize: 'vertical',
              boxSizing: 'border-box',
              outline: 'none',
              fontFamily: 'monospace'
            }}
          />

          <div style={{ marginTop: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#64748b' }}>
              <span>Chars: <strong style={{ color: '#94a3b8' }}>{text.length}</strong></span>
              <span>Words: <strong style={{ color: '#94a3b8' }}>{text.trim() ? text.trim().split(/\s+/).length : 0}</strong></span>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={loading || !text.trim()}
              style={{
                background: loading ? '#475569' : 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 2rem',
                fontSize: '0.95rem',
                fontWeight: '700',
                cursor: loading || !text.trim() ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(37, 99, 235, 0.4)',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {loading ? (
                <>
                  <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  Extracting Security Signals...
                </>
              ) : (
                'Run Threat Analysis ⚡'
              )}
            </button>
          </div>
        </section>

        {/* Error Alert */}
        {error && (
          <div style={{
            marginBottom: '2rem',
            padding: '1rem 1.25rem',
            backgroundColor: 'rgba(127, 29, 29, 0.3)',
            borderRadius: '10px',
            border: '1px solid #ef4444',
            color: '#fca5a5',
            fontSize: '0.9rem'
          }}>
            <strong>Diagnostic Error:</strong> {error}
          </div>
        )}

        {/* Analysis Output Dashboard */}
        {result && (
          <section style={{
            backgroundColor: '#111827',
            borderRadius: '16px',
            border: `2px solid ${verdictBorder}`,
            padding: '1.75rem',
            boxShadow: `0 20px 40px -15px ${isFlagged ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
            marginBottom: '3rem'
          }}>
            
            {/* Top Verdict & Threat Gauge Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1.25rem',
              paddingBottom: '1.5rem',
              borderBottom: '1px solid #1f2937'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.4rem 1rem',
                    borderRadius: '8px',
                    fontWeight: '800',
                    fontSize: '0.95rem',
                    letterSpacing: '0.04em',
                    backgroundColor: verdictBadgeBg,
                    color: verdictColor,
                    border: `1px solid ${verdictBorder}`
                  }}>
                    {isFlagged ? '🚨' : '🛡️'} {dynamicVerdict}
                  </span>
                  
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    {isFlagged ? 'Action: Quarantine & Validate' : 'Action: Inbox Clearance'}
                  </span>
                </div>

                {/* Interactive Threshold Policy Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>DECISION POLICY:</span>
                  <button
                    onClick={() => setActiveThreshold(0.070)}
                    style={{
                      background: activeThreshold === 0.070 ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                      border: activeThreshold === 0.070 ? '1px solid #38bdf8' : '1px solid #374151',
                      color: activeThreshold === 0.070 ? '#38bdf8' : '#94a3b8',
                      borderRadius: '6px',
                      padding: '0.25rem 0.6rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      fontWeight: activeThreshold === 0.070 ? '700' : '500'
                    }}
                  >
                    Cost-Calibrated (0.07) [5x Miss Penalty]
                  </button>
                  <button
                    onClick={() => setActiveThreshold(0.500)}
                    style={{
                      background: activeThreshold === 0.500 ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                      border: activeThreshold === 0.500 ? '1px solid #a855f7' : '1px solid #374151',
                      color: activeThreshold === 0.500 ? '#c084fc' : '#94a3b8',
                      borderRadius: '6px',
                      padding: '0.25rem 0.6rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      fontWeight: activeThreshold === 0.500 ? '700' : '500'
                    }}
                  >
                    Standard Baseline (0.50)
                  </button>
                </div>
              </div>

              {/* Gauge & Score View */}
              <div style={{
                textAlign: 'right',
                backgroundColor: '#090d16',
                padding: '0.75rem 1.25rem',
                borderRadius: '12px',
                border: '1px solid #1f2937'
              }}>
                <div style={{ fontSize: '2.4rem', fontWeight: '900', lineHeight: '1', color: verdictColor }}>
                  {(currentRiskScore * 100).toFixed(1)}%
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                  ENSEMBLE THREAT SCORE
                </div>
                <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.15rem' }}>
                  Policy Threshold: {activeThreshold}
                </div>
              </div>
            </div>

            {/* Threshold Impact Visual Notice */}
            {currentRiskScore >= 0.070 && currentRiskScore < 0.500 && (
              <div style={{
                margin: '1.25rem 0',
                padding: '0.85rem 1rem',
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '8px',
                fontSize: '0.82rem',
                color: '#fbbf24',
                lineHeight: '1.5'
              }}>
                💡 <strong>Threshold Calibration in Action:</strong> This message scored <strong style={{ color: '#fff' }}>{(currentRiskScore * 100).toFixed(1)}%</strong>. 
                Under a standard 0.50 threshold, it would be labeled <em>Safe</em>. However, under PhishGuard's enterprise <strong>0.070 Cost-Weighted Policy</strong> (which penalizes missed attacks 5x), it is routed to quarantine for human analyst verification!
              </div>
            )}

            {/* Multimodal Models Breakdown Grid */}
            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Model Ensemble Consensus Breakdown:
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Independent Classifier Signals</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.85rem' }}>
                {/* DistilBERT */}
                <div style={{ backgroundColor: '#090d16', padding: '1rem', borderRadius: '10px', border: '1px solid #1f2937' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>DistilBERT (Semantic)</span>
                    <span style={{ fontSize: '1.15rem', fontWeight: '800', color: '#38bdf8' }}>
                      {(result.distilbert_prob * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ height: '4px', backgroundColor: '#1e293b', borderRadius: '2px', marginTop: '0.5rem', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(result.distilbert_prob * 100, 100)}%`, height: '100%', backgroundColor: '#38bdf8' }} />
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.4rem' }}>
                    Evaluates latent manipulation, urgency, and context
                  </div>
                </div>

                {/* XGBoost */}
                <div style={{ backgroundColor: '#090d16', padding: '1rem', borderRadius: '10px', border: '1px solid #1f2937' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>XGBoost (Heuristics)</span>
                    <span style={{ fontSize: '1.15rem', fontWeight: '800', color: '#f59e0b' }}>
                      {(result.xgb_prob * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ height: '4px', backgroundColor: '#1e293b', borderRadius: '2px', marginTop: '0.5rem', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(result.xgb_prob * 100, 100)}%`, height: '100%', backgroundColor: '#f59e0b' }} />
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.4rem' }}>
                    Analyzes URL dynamics, IP flags, and character ratios
                  </div>
                </div>

                {/* TF-IDF */}
                <div style={{ backgroundColor: '#090d16', padding: '1rem', borderRadius: '10px', border: '1px solid #1f2937' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>TF-IDF + LR (Lexical)</span>
                    <span style={{ fontSize: '1.15rem', fontWeight: '800', color: '#c084fc' }}>
                      {(result.tfidf_prob * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ height: '4px', backgroundColor: '#1e293b', borderRadius: '2px', marginTop: '0.5rem', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(result.tfidf_prob * 100, 100)}%`, height: '100%', backgroundColor: '#c084fc' }} />
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.4rem' }}>
                    High-speed baseline evaluating sublinear word n-grams
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{ marginTop: '1.75rem', display: 'flex', gap: '0.5rem', borderBottom: '1px solid #1f2937', paddingBottom: '0.5rem' }}>
              <button
                onClick={() => setActiveTab('overview')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0.4rem 0.8rem',
                  color: activeTab === 'overview' ? '#38bdf8' : '#64748b',
                  fontWeight: activeTab === 'overview' ? '700' : '500',
                  borderBottom: activeTab === 'overview' ? '2px solid #38bdf8' : '2px solid transparent',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                Top Alarms & Signals ({result.top_signals.length})
              </button>
              <button
                onClick={() => setActiveTab('telemetry')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0.4rem 0.8rem',
                  color: activeTab === 'telemetry' ? '#38bdf8' : '#64748b',
                  fontWeight: activeTab === 'telemetry' ? '700' : '500',
                  borderBottom: activeTab === 'telemetry' ? '2px solid #38bdf8' : '2px solid transparent',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                Full 12-Feature Security Telemetry Matrix 📊
              </button>
            </div>

            {/* Tab 1: Top Signals & Alarms */}
            {activeTab === 'overview' && (
              <div style={{ marginTop: '1rem' }}>
                {result.top_signals.length === 0 ? (
                  <div style={{
                    padding: '1.25rem',
                    backgroundColor: '#090d16',
                    borderRadius: '10px',
                    border: '1px dashed #334155',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>🛡️</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#e2e8f0' }}>
                      No Critical Structural Heuristic Alarms Triggered
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: '0.8rem', maxWidth: '580px', margin: '0.4rem auto 0', lineHeight: '1.5' }}>
                      No direct IP URLs, shorteners, or urgency triggers were found. 
                      The threat score of <strong>{(currentRiskScore * 100).toFixed(1)}%</strong> is driven primarily by natural language semantics (informational/marketing tone).
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {result.top_signals.map((sig, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: '#090d16',
                          padding: '0.75rem 1rem',
                          borderRadius: '8px',
                          borderLeft: '4px solid #ef4444',
                          border: '1px solid #1f2937'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '1.1rem' }}>⚠️</span>
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#f1f5f9' }}>
                              {sig.description}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                              signal_key: {sig.feature} (raw value: {sig.value})
                            </div>
                          </div>
                        </div>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          color: '#f87171',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px'
                        }}>
                          FLAGGED
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Full 12-Feature Telemetry Matrix */}
            {activeTab === 'telemetry' && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem' }}>
                  {[
                    { label: 'Hyperlinks Detected', key: 'num_urls', val: featureTelemetry.num_urls || 0, isBad: (featureTelemetry.num_urls || 0) > 3 },
                    { label: 'Direct IP in URL', key: 'has_ip_url', val: (featureTelemetry.has_ip_url ? 'YES (High Risk)' : 'No'), isBad: featureTelemetry.has_ip_url === 1 },
                    { label: 'URL Shortener Service', key: 'has_shortener', val: (featureTelemetry.has_shortener ? 'YES (Obfuscated)' : 'No'), isBad: featureTelemetry.has_shortener === 1 },
                    { label: 'Social Engineering Urgency', key: 'urgency_hits', val: `${featureTelemetry.urgency_hits || 0} hits`, isBad: (featureTelemetry.urgency_hits || 0) > 0 },
                    { label: 'Uppercase Character Ratio', key: 'upper_ratio', val: `${((featureTelemetry.upper_ratio || 0) * 100).toFixed(1)}%`, isBad: (featureTelemetry.upper_ratio || 0) > 0.15 },
                    { label: 'Numeric Digit Density', key: 'digit_ratio', val: `${((featureTelemetry.digit_ratio || 0) * 100).toFixed(1)}%`, isBad: (featureTelemetry.digit_ratio || 0) > 0.15 },
                    { label: '@ Credential Trick in URL', key: 'at_in_urls', val: featureTelemetry.at_in_urls || 0, isBad: (featureTelemetry.at_in_urls || 0) > 0 },
                    { label: 'Hyphen Domain Obfuscation', key: 'hyphen_in_urls', val: featureTelemetry.hyphen_in_urls || 0, isBad: (featureTelemetry.hyphen_in_urls || 0) > 5 },
                    { label: 'Maximum URL Length', key: 'max_url_len', val: `${featureTelemetry.max_url_len || 0} chars`, isBad: (featureTelemetry.max_url_len || 0) > 80 },
                    { label: 'Exclamation Mark Count', key: 'excl_count', val: featureTelemetry.excl_count || 0, isBad: (featureTelemetry.excl_count || 0) > 3 },
                    { label: 'Question Mark Count', key: 'qmark_count', val: featureTelemetry.qmark_count || 0, isBad: (featureTelemetry.qmark_count || 0) > 3 },
                    { label: 'Payload Character Size', key: 'text_length', val: `${featureTelemetry.text_length || text.length} chars`, isBad: false }
                  ].map((f, i) => (
                    <div
                      key={i}
                      style={{
                        backgroundColor: '#090d16',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #1f2937',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{f.label}</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: '700', color: f.isBad ? '#f87171' : '#38bdf8', marginTop: '0.15rem' }}>
                          {f.val}
                        </div>
                      </div>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: '700',
                        padding: '0.2rem 0.4rem',
                        borderRadius: '4px',
                        backgroundColor: f.isBad ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: f.isBad ? '#fca5a5' : '#6ee7b7'
                      }}>
                        {f.isBad ? 'ALERT' : 'BENIGN'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SOC Action & Export Bar */}
            <div style={{
              marginTop: '1.75rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid #1f2937',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
                  SOC ACTION RECOMMENDATION:
                </span>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#cbd5e1' }}>
                  {result.soc_guidance || (
                    isFlagged
                      ? 'Route message to Security Quarantine Queue. Require SPF/DKIM verification before releasing.'
                      : 'Message conforms to baseline communication patterns. Allow inbox delivery.'
                  )}
                </p>
              </div>

              <button
                onClick={handleCopyReport}
                style={{
                  backgroundColor: '#1e293b',
                  color: copied ? '#4ade80' : '#e2e8f0',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '0.6rem 1.2rem',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s ease'
                }}
              >
                {copied ? '✓ Report Copied to Clipboard!' : '📋 Copy SOC Triage Report'}
              </button>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer style={{ textAlign: 'center', color: '#475569', fontSize: '0.8rem', paddingBottom: '2rem' }}>
          PhishGuard AI Engineering System • Zero-Leakage Evaluated • Cost-Calibrated Decision Policy (τ = 0.070)
        </footer>
      </div>
    </div>
  );
}
