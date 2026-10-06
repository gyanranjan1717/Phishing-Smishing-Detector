import React, { useState } from 'react';

const SAMPLES = [
  {
    title: 'PayPal Urgency Phish',
    text: 'URGENT SECURITY ALERT: Your PayPal account has been suspended due to unauthorized access. Click http://192.168.1.1/verify to confirm your credentials immediately!'
  },
  {
    title: 'Corporate Bank OTP (Legit)',
    text: 'Your one-time passcode for online banking authorization is 849201. Do not share this PIN with anyone. Expires in 10 minutes.'
  },
  {
    title: 'Subtle Vendor Invoice (Spear-Phish)',
    text: 'Hi Sarah, please find the updated quarterly audit invoices attached in our OneDrive repository. Kindly review the payment terms before Friday.'
  },
  {
    title: 'Engineering Team Standup (Legit)',
    text: 'Hi everyone, quick reminder that our sprint retrospective has been moved to 3 PM UTC. See you in the main Zoom room!'
  }
];

export default function App() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

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
    } catch (err) {
      setError(err.message || 'Failed to connect to PhishGuard API service.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'system-ui, sans-serif', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '850px', margin: '0 auto' }}>
        <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
            PhishGuard AI
          </h1>
          <p style={{ color: '#94a3b8', marginTop: '0.5rem', fontSize: '1.1rem' }}>
            Multimodal Threat Detection Engine (DistilBERT + XGBoost Security Signals + Meta-Learner)
          </p>
        </header>

        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            Try Pre-loaded Threat Samples:
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {SAMPLES.map((s, idx) => (
              <button
                key={idx}
                onClick={() => setText(s.text)}
                style={{
                  backgroundColor: '#1e293b',
                  color: '#cbd5e1',
                  border: '1px solid #334155',
                  borderRadius: '9999px',
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>

        <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '1.2rem', border: '1px solid #334155', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)' }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste an email body, SMS message, or notification text here to inspect risk signals..."
            rows={6}
            style={{
              width: '100%',
              backgroundColor: '#0f172a',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '1rem',
              fontSize: '0.95rem',
              resize: 'vertical',
              boxSizing: 'border-box',
              outline: 'none'
            }}
          />

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              {text.length} characters
            </span>
            <button
              onClick={handleAnalyze}
              disabled={loading || !text.trim()}
              style={{
                backgroundColor: loading ? '#475569' : '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.7rem 1.8rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {loading ? 'Analyzing Signals...' : 'Inspect Security Signals'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#7f1d1d', borderRadius: '8px', border: '1px solid #991b1b', color: '#fecaca' }}>
            Warning: {error}
          </div>
        )}

        {result && (
          <div style={{
            marginTop: '2rem',
            backgroundColor: '#1e293b',
            borderRadius: '12px',
            border: '2px solid ' + (result.is_phishing ? '#ef4444' : '#22c55e'),
            padding: '1.5rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span style={{
                  display: 'inline-block',
                  padding: '0.3rem 0.8rem',
                  borderRadius: '9999px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  letterSpacing: '0.05em',
                  backgroundColor: result.is_phishing ? '#ef4444' : '#22c55e',
                  color: '#fff'
                }}>
                  {result.verdict}
                </span>
                <p style={{ margin: '0.5rem 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
                  Calibrated Decision Threshold: <strong>{result.threshold}</strong> (Cost-weighted)
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: result.is_phishing ? '#f87171' : '#4ade80' }}>
                  {(result.risk_score * 100).toFixed(1)}%
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Ensemble Threat Score</div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', backgroundColor: '#0f172a', padding: '1rem', borderRadius: '8px' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>DistilBERT (Semantic)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#38bdf8' }}>{(result.distilbert_prob * 100).toFixed(1)}%</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>XGBoost (Heuristics)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f59e0b' }}>{(result.xgb_prob * 100).toFixed(1)}%</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>TF-IDF (Lexical)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#a855f7' }}>{(result.tfidf_prob * 100).toFixed(1)}%</div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#f1f5f9', marginBottom: '0.8rem' }}>
                Threat Signals Identified
              </h3>
              {result.top_signals.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic' }}>
                  No structural threat heuristics triggered. The score is predominantly based on natural language semantics.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {result.top_signals.map((sig, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', backgroundColor: '#0f172a', padding: '0.6rem 0.9rem', borderRadius: '6px', borderLeft: '4px solid #ef4444' }}>
                      <span style={{ fontSize: '0.9rem', color: '#e2e8f0' }}>{sig.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
