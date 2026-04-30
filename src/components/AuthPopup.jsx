import React from 'react';

const AuthPopup = ({ onClose, onNavigate }) => (
  <div className="popup-overlay" onClick={onClose} style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
    <div className="popup-content" onClick={e => e.stopPropagation()} style={{background: 'white', padding: '30px', borderRadius: '20px', color: '#1B2559', width: '85%', maxWidth: '350px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.2)'}}>
      <h3 style={{marginBottom: '10px', color: '#D32F2F', fontSize: '1.4rem', fontWeight: 900}}>LOGIN REQUIRED</h3>
      <p style={{marginBottom: '20px', color: '#666', fontSize: '0.95rem', fontWeight: 600}}>Please login or register to access this restricted feature on the platform.</p>
      <div style={{display: 'flex', gap: '15px', justifyContent: 'center'}}>
        <button onClick={() => { onClose(); onNavigate('/login'); }} style={{flex: 1, padding: '12px', background: '#FF6600', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '1rem'}}>LOGIN</button>
        <button onClick={() => { onClose(); onNavigate('/register'); }} style={{flex: 1, padding: '12px', background: '#0D47A1', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '1rem'}}>REGISTER</button>
      </div>
    </div>
  </div>
);

export default AuthPopup;
