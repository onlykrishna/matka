import React, { useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const AppRedirect = () => {
  const { gateway } = useParams();
  const location = useLocation();

  const handleRedirect = () => {
    // location.search contains the gateway's response params (e.g. ?client_txn_id=...&status=...)
    let searchParams = new URLSearchParams(location.search);
    
    // Add the gateway identifier to the params so FundsPage knows how to verify
    if (gateway) {
      searchParams.set('gateway', gateway);
    }
    
    // Construct the deep link back to the native app
    const appUrl = `matkaapp://funds?${searchParams.toString()}`;
    window.location.href = appUrl;
  };

  // Attempt auto-redirect, if Chrome blocks it, user can click the button
  useEffect(() => {
    const timer = setTimeout(() => {
      handleRedirect();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#F8F9FA', padding: '20px', textAlign: 'center' }}>
      <CheckCircle size={64} color="#4CAF50" style={{ marginBottom: '20px' }} />
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>Transaction Complete</h2>
      <p style={{ color: '#666', fontSize: '16px', marginBottom: '30px' }}>Your payment was processed. Please return to the app to update your wallet balance.</p>
      <button 
        onClick={handleRedirect}
        style={{ padding: '15px 40px', backgroundColor: '#D32F2F', color: 'white', border: 'none', borderRadius: '30px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(211, 47, 47, 0.3)' }}
      >
        Return to App
      </button>
    </div>
  );
};

export default AppRedirect;
