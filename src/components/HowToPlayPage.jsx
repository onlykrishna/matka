import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Info, LogIn, Wallet, Target, HelpCircle, History, Share2, Smartphone } from 'lucide-react';

const HowToPlayPage = () => {
  const navigate = useNavigate();

  const steps = [
    {
      title: "Login / Register",
      desc: "App open karein, apna mobile number use karke login karein. Naya user ho to simple registration form se apni SWAMI JI MATKA ID bana sakte hain.",
      icon: <LogIn size={20} />
    },
    {
      title: "Wallet Me Paisa Add Karein",
      desc: "\"Wallet\" section me jaa kar \"Add Money\" par tap karein, payment method select karein aur amount add karein.",
      icon: <Wallet size={20} />
    },
    {
      title: "Market & Session Chunein",
      desc: "Apni pasand ka market (jaise MOON, SUN) select karein aur Open / Close session choose karein, jisme aap bet lagana chahte hain.",
      icon: <Target size={20} />
    },
    {
      title: "Choose Bet Type (5 Main Types)",
      desc: "Niche diye gaye table me sabhi bet types ki jaankari di gayi hai:",
      isTable: true,
      icon: <HelpCircle size={20} />
    },
    {
      title: "Number & Amount Enter Karein",
      desc: "Bet type choose karne ke baad apna number likhein aur har number ke liye kitna amount lagana hai wo enter karein.",
      icon: <Smartphone size={20} />
    },
    {
      title: "Bid Submit Karein",
      desc: "Sab numbers aur amount check karne ke baad \"Submit Bid\" par tap karein. Aapke sabhi bets confirm ho jaayenge aur bid history me dikhai denge.",
      icon: <History size={20} />
    },
    {
      title: "Result & Winnings",
      desc: "Result declare hone ke baad \"Results\" page me apna market check karein. Jeetne par aapka winning amount turant aapke wallet me add ho jaata hai.",
      icon: <CheckCircleIcon />
    },
    {
      title: "Withdraw Winnings",
      desc: "\"Wallet\" me jaakar \"Withdraw\" option choose karein, amount enter karein, Bank / UPI detail select karein aur withdrawal request submit karein.",
      icon: <Share2 size={20} />
    }
  ];

  return (
    <div className="guide-container">
      {/* Hero Header */}
      <div className="guide-card-header">
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <button onClick={() => navigate('/home')} style={{background: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <ChevronLeft size={20} color="#FF6600" />
          </button>
          <div>
            <h1 style={{fontSize: '1.4rem', margin: 0, fontWeight: '900'}}>How to Play</h1>
            <p style={{fontSize: '0.8rem', margin: '2px 0 0', opacity: 0.9}}>SWAMI JI MATKA Guide</p>
          </div>
        </div>
      </div>

      <div style={{padding: '0 20px'}}>
        <p style={{fontSize: '0.9rem', color: '#666', marginBottom: '25px', lineHeight: 1.6}}>
           Niche diye gaye steps follow karke aap asaani se har game type par bid laga sakte hain.
        </p>

        <div className="guide-steps-list">
          {steps.map((step, index) => (
            <div key={index} className="guide-step">
              <div className="step-number-box">{index + 1}</div>
              <div className="step-content">
                <span className="step-title">{step.title}</span>
                <p className="step-desc">{step.desc}</p>
                
                {step.isTable && (
                  <div className="bet-table-container">
                    <table className="bet-table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><b>Single Digit</b></td>
                          <td>0 se 9 tak koi bhi ek number choose karein. Agar result me wahi digit aata hai to aap jeet jaate hain.</td>
                        </tr>
                        <tr>
                          <td><b>Jodi Digit</b></td>
                          <td>00 se 99 tak koi bhi 2 digit ka number choose karein. Result ki Jodi match hone par winning milegi.</td>
                        </tr>
                        <tr>
                          <td><b>Single Pana</b></td>
                          <td>Teen alag-alag digits ka number, jisme koi digit repeat nahi hota (jaise 123, 246). Valid Single Pana list app me dekh sakte hain.</td>
                        </tr>
                        <tr>
                          <td><b>Double Pana</b></td>
                          <td>Teen digits jisme do same aur ek different digit hota hai (jaise 112, 373).</td>
                        </tr>
                        <tr>
                          <td><b>Triple Pana</b></td>
                          <td>Tino digits same hote hain (jaise 000, 555, 999). High risk, high reward bet.</td>
                        </tr>
                      </tbody>
                    </table>
                    <div style={{padding: '10px', background: '#FFF9F5', fontSize: '0.75rem', color: '#666', borderTop: '1px dashed #FFE0CC'}}>
                      * Har bet type ka rate aur winning amount app ke "Game Rates" section me clearly mention hai.
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{padding: '30px 20px', textAlign: 'center'}}>
        <div style={{background: 'white', padding: '20px', borderRadius: '15px', border: '1px solid #FFE0CC'}}>
          <HelpCircle size={30} color="#FF6600" style={{marginBottom: '10px'}} />
          <h3 style={{fontSize: '1rem', color: '#1B2559', marginBottom: '5px'}}>Still have questions?</h3>
          <p style={{fontSize: '0.8rem', color: '#666'}}>Contact our support team for instant help via WhatsApp.</p>
        </div>
      </div>
    </div>
  );
};

const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export default HowToPlayPage;
