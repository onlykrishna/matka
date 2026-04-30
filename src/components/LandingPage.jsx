import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Star, CheckCircle2, Bell, Wallet, Download, X, MoreVertical } from 'lucide-react';
import logo from '../assets/logo.png';

function LandingPage() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // Check if already running as installed PWA
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    ) {
      setIsStandalone(true);
      return;
    }

    // 1. Check if the global prompt was already captured before this component mounted
    if (window.__pwaPrompt) {
      setDeferredPrompt(window.__pwaPrompt);
      console.log('PWA: Picked up globally-captured prompt on mount.');
    }

    // 2. Listen for the prompt becoming available (fires if it was NOT captured yet)
    const handlePromptReady = () => {
      if (window.__pwaPrompt) {
        setDeferredPrompt(window.__pwaPrompt);
        console.log('PWA: Picked up prompt via pwaPromptReady event.');
      }
    };

    // 3. Also listen for the raw beforeinstallprompt as a fallback
    const handleRawPrompt = (e) => {
      e.preventDefault();
      window.__pwaPrompt = e;
      setDeferredPrompt(e);
      console.log('PWA: Picked up raw beforeinstallprompt in LandingPage.');
    };

    window.addEventListener('pwaPromptReady', handlePromptReady);
    window.addEventListener('beforeinstallprompt', handleRawPrompt);

    return () => {
      window.removeEventListener('pwaPromptReady', handlePromptReady);
      window.removeEventListener('beforeinstallprompt', handleRawPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    // Re-check window.__pwaPrompt in case state is stale
    const prompt = deferredPrompt || window.__pwaPrompt;

    if (prompt) {
      try {
        prompt.prompt();
        const { outcome } = await prompt.userChoice;
        console.log(`PWA install outcome: ${outcome}`);
        // Clear the prompt after use
        window.__pwaPrompt = null;
        setDeferredPrompt(null);
      } catch (err) {
        console.error('PWA prompt error:', err);
        // If prompt fails (e.g., already used), show guide
        setShowGuide(true);
      }
    } else {
      // No prompt available — show the visual reinstall guide
      setShowGuide(true);
    }
  };

  return (
    <div className="landing-container">
      {/* Header */}
      <header className="landing-header">
        <img src={logo} alt="Swami Ji Matka" className="landing-logo" />
        <Menu size={28} color="black" />
      </header>

      {/* Hero Section */}
      <main className="landing-hero">
        <div className="hero-visual">
          <div className="hero-glow"></div>
          <img src={logo} alt="Swami Ji Matka" className="hero-image" />
        </div>

        <div className="sub-header-pill">
          <Star size={14} fill="#D32F2F" color="#D32F2F" />
          Official SWAMI JI MATKA Android Application
        </div>

        <div className="landing-content">
          <h1 className="landing-title">
            Download the <span>SWAMI JI MATKA</span> app for secure play &amp; fast payouts.
          </h1>

          <div className="landing-buttons">
            {!isStandalone && (
              <a
                href="/SwamiJi_Matka.apk"
                download="SwamiJi_Matka.apk"
                className="landing-btn btn-download"
              >
                <Download size={20} />
                <span>
                  Install Application <br />
                  <span className="btn-subtext">Official Android App</span>
                </span>
              </a>
            )}

            <Link to="/login" className="landing-btn btn-white">Login</Link>
            <Link to="/register" className="landing-btn btn-white">Register</Link>
          </div>

          <p className="landing-note">
            Opens instantly on Android Chrome &amp; Samsung Internet.
          </p>
        </div>
      </main>

      {/* Features */}
      <div className="landing-features">
        <div className="feature-chip"><CheckCircle2 size={16} /> Verified Markets</div>
        <div className="feature-chip"><Bell size={16} /> Smart Notifications</div>
        <div className="feature-chip"><Wallet size={16} /> Secure Wallet</div>
      </div>

      {/* REINSTALL GUIDE MODAL — shown when browser blocks the native popup */}
      {showGuide && (
        <div
          onClick={() => setShowGuide(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', zIndex: 9999,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', borderTopLeftRadius: '28px', borderTopRightRadius: '28px',
              width: '100%', maxWidth: '500px', padding: '28px 24px 36px', position: 'relative'
            }}
          >
            {/* Close */}
            <button
              onClick={() => setShowGuide(false)}
              style={{
                position: 'absolute', right: '20px', top: '20px',
                background: '#f0f0f0', border: 'none', borderRadius: '50%',
                width: '34px', height: '34px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <X size={18} color="#555" />
            </button>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '64px', height: '64px', background: '#FFF3E0',
                borderRadius: '20px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 14px'
              }}>
                <Download size={34} color="#E65100" />
              </div>
              <h2 style={{ fontSize: '1.3rem', color: '#1a1a1a', margin: '0 0 6px 0', fontWeight: 700 }}>
                Install App in 2 Steps
              </h2>
              <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>
                Browser blocked auto-install (happens after uninstall). Follow these steps:
              </p>
            </div>

            {/* Step 1 */}
            <div style={{
              display: 'flex', gap: '14px', alignItems: 'flex-start',
              padding: '16px', background: '#F1F8E9', borderRadius: '14px',
              border: '1.5px solid #AED581', marginBottom: '12px'
            }}>
              <div style={{
                background: '#33691E', color: 'white', minWidth: '28px', height: '28px',
                borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontWeight: 700, fontSize: '13px'
              }}>1</div>
              <div>
                <p style={{ margin: '0 0 4px 0', fontWeight: 700, color: '#1B5E20', fontSize: '1rem' }}>
                  Tap the Chrome Menu
                </p>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#388E3C', lineHeight: 1.5 }}>
                  Look for the <strong style={{ fontSize: '1rem' }}><MoreVertical size={15} style={{ verticalAlign: 'middle' }} /></strong> (three dots) button at the <strong>top-right corner</strong> of Chrome.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div style={{
              display: 'flex', gap: '14px', alignItems: 'flex-start',
              padding: '16px', background: '#E3F2FD', borderRadius: '14px',
              border: '1.5px solid #90CAF9', marginBottom: '24px'
            }}>
              <div style={{
                background: '#0D47A1', color: 'white', minWidth: '28px', height: '28px',
                borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontWeight: 700, fontSize: '13px'
              }}>2</div>
              <div>
                <p style={{ margin: '0 0 4px 0', fontWeight: 700, color: '#0D47A1', fontSize: '1rem' }}>
                  Select "Add to Home Screen"
                </p>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#1565C0', lineHeight: 1.5 }}>
                  Scroll down in the menu and tap <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong>. Then tap <strong>Install</strong> on the popup.
                </p>
              </div>
            </div>

            {/* Note */}
            <div style={{
              background: '#FFF8E1', borderRadius: '10px', padding: '12px 16px',
              border: '1px solid #FFE082', marginBottom: '20px'
            }}>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#E65100', lineHeight: 1.5 }}>
                <strong>Why this happens:</strong> After uninstalling, Chrome temporarily blocks the automatic install popup for security. The Chrome menu method works instantly and always.
              </p>
            </div>

            <button
              onClick={() => setShowGuide(false)}
              style={{
                width: '100%', padding: '16px', background: 'linear-gradient(135deg, #2E7D32, #1B5E20)',
                color: 'white', border: 'none', borderRadius: '14px',
                fontWeight: 700, cursor: 'pointer', fontSize: '1rem', letterSpacing: '0.3px'
              }}
            >
              Got it, I'll install now!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LandingPage;
