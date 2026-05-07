import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Download,
  Wallet,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { 
  doc, 
  onSnapshot, 
  collection, 
  addDoc, 
  serverTimestamp, 
  updateDoc, 
  increment,
  query,
  where,
  getDocs,
  runTransaction,
  setDoc
} from "firebase/firestore";
import logo from '../assets/logo.png';
import '../index.css';

const DepositPage = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [manualStep, setManualStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({ upi_id: '', qr_url: '', active_method: 'UPI' });
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState({ name: '', email: '', phone: '', wallet_balance: 0 });
  const [method, setMethod] = useState('UPI');
  const [socialLinks, setSocialLinks] = useState({ whatsapp: '' });
  
  // Gateway State
  const [gatewayData, setGatewayData] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('INIT');
  const [pollingActive, setPollingActive] = useState(false);
  const [pollingTxnId, setPollingTxnId] = useState(null);
  const [pollingGateway, setPollingGateway] = useState(null);
  const [pollingAmount, setPollingAmount] = useState(0);
  const [paymentUrl, setPaymentUrl] = useState('');

  const quickAmounts = [50, 100, 200, 500, 1000, 2000];

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        const userRef = doc(db, "users", u.uid);
        onSnapshot(userRef, (snap) => {
          if (snap.exists()) setUserData({
            name: snap.data().name || '',
            email: snap.data().email || '',
            phone: snap.data().phone || u.phoneNumber || '',
            wallet_balance: snap.data().wallet_balance || 0
          });
        });
      } else {
        navigate('/login');
      }
    });

    const unsubSettings = onSnapshot(doc(db, "settings", "deposit"), (s) => {
      if (s.exists()) {
        const data = s.data();
        setSettings(data);
        setMethod(data.active_method || 'UPI');
      }
    });

    const unsubSocial = onSnapshot(doc(db, "settings", "social"), (docSnap) => {
      if (docSnap.exists()) setSocialLinks(docSnap.data());
    });

    return () => {
      unsubscribeAuth();
      unsubSettings();
      unsubSocial();
    };
  }, [navigate]);

  // Real-Time Database Listener & Active Background Polling Logic
  useEffect(() => {
    let interval;
    let unsub;

    if (pollingActive && pollingTxnId && user) {
      const txnIdKey = pollingGateway === 'IMB' ? `IMB_WH_${pollingTxnId}` : pollingTxnId;

      // 1. Listen to the database record in real-time
      unsub = onSnapshot(doc(db, "deposits", txnIdKey), (docSnap) => {
        if (docSnap.exists() && docSnap.data().status === 'approved') {
          setPollingActive(false);
          try { Browser.close(); } catch(e) {}
          navigate('/funds?status=success');
        }
      });

      // 2. Active fallback polling (in case webhook is delayed or fails)
      interval = setInterval(async () => {
        try {
          const proxyUrl = 'https://us-central1-swami-ji-matka-acf76.cloudfunctions.net/paymentProxy';
          let isSuccess = false;
          let actualAmount = pollingAmount;
          let gatewayOrderId = '';

          if (pollingGateway === 'UPI_GATEWAY') {
            const today = new Date();
            const dateStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
            
            const payload = {
              key: settings.upi_gateway_id || 'c2ce65c8-e370-466e-9978-643698cf44f3',
              client_txn_id: pollingTxnId,
              txn_date: dateStr
            };
            
            const response = await fetch(proxyUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: 'https://merchant.upigateway.com/api/check_order_status', payload })
            });
            const result = await response.json();
            const apiStatus = String(result.data?.status || result.status || '').toUpperCase();
            if (result && ['COMPLETED', 'SUCCESS', 'PAID', 'SUCCESSFUL', 'TRUE', '1'].includes(apiStatus)) {
              isSuccess = true;
              actualAmount = Number(result.data?.amount || pollingAmount);
              gatewayOrderId = result.data?.order_id || '';
            }
          } else if (pollingGateway === 'IMB') {
            const checkUrl = settings.imb_api_url?.replace('create-order', 'check-order-status') || 'https://secure-stage.imb.org.in/api/check-order-status';
            const response = await fetch(proxyUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                url: checkUrl, 
                payload: { user_token: settings.imb_access_token || '61559044c37f7e99485353c294cd74eb', order_id: pollingTxnId },
                useFormEncoding: true
              })
            });
            const result = await response.json();
            const apiStatus = String(result.status || result.result?.status || '').toUpperCase();
            if (result && ['COMPLETED', 'SUCCESS', 'PAID', 'SUCCESSFUL', 'TRUE', '1'].includes(apiStatus)) {
              isSuccess = true;
              actualAmount = Number(result.result?.amount || pollingAmount);
            }
          }

          if (isSuccess) {
            // Securely credit wallet. The onSnapshot listener will catch the 'approved' update and handle navigation/closing.
            await runTransaction(db, async (transaction) => {
              const depositRef = doc(db, "deposits", txnIdKey);
              const depSnap = await transaction.get(depositRef);
              // Only process if it is strictly 'pending' to avoid double-credit
              if (!depSnap.exists() || depSnap.data().status === 'approved') return;

              const userRef = doc(db, "users", user.uid);
              const userSnap = await transaction.get(userRef);
              if (!userSnap.exists()) return;

              transaction.update(userRef, { wallet_balance: (userSnap.data().wallet_balance || 0) + actualAmount });
              transaction.update(depositRef, {
                amount: actualAmount,
                status: 'approved',
                gatewayOrderId: gatewayOrderId,
                note: 'Verified via Active Background Polling'
              });
            });
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      }, 4000); // Poll every 4 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
      if (unsub) unsub();
    };
  }, [pollingActive, pollingTxnId, pollingGateway, pollingAmount, navigate, user, settings]);

  // Scroll to payment box when it appears
  useEffect(() => {
    if (paymentUrl) {
      const el = document.getElementById('payment-box');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }, [paymentUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isNative = Capacitor.isNativePlatform();

    if (!amount || parseFloat(amount) < 100) {
      alert("Minimum deposit amount is ₹100.");
      return;
    }
    const amt = parseFloat(amount);
    setLoading(true);

    if (method === 'UPI') {
      if (manualStep === 1) {
        setManualStep(2);
        setLoading(false);
        return;
      }
      if (!utrNumber || utrNumber.length < 10) {
        alert("Please enter a valid UTR / Transaction ID.");
        setLoading(false);
        return;
      }
      try {
        await addDoc(collection(db, "deposits"), {
          userId: user.uid,
          amount: amt,
          method: 'UPI Manual',
          utrNumber: utrNumber,
          status: 'pending',
          created_at: serverTimestamp(),
          upi_id_used: settings.upi_id
        });
        alert("Deposit request submitted! It will be verified shortly.");
        navigate('/funds');
      } catch (err) { alert("Error: " + err.message); }
      finally { setLoading(false); }
      return;
    }

    if (method === 'UPI_GATEWAY') {
      try {
        const createUrl = settings.upi_gateway_url || 'https://merchant.upigateway.com/api/create_order';
        const client_txn_id = `txn_${Date.now()}`;

        // Create pending request BEFORE opening gateway
        await setDoc(doc(db, "deposits", client_txn_id), {
          userId: user.uid,
          amount: amt,
          method: 'UPI Gateway',
          status: 'pending',
          txnId: client_txn_id,
          created_at: serverTimestamp(),
          note: 'Created before redirect'
        });
        const payload = {
          key: settings.upi_gateway_id || 'c2ce65c8-e370-466e-9978-643698cf44f3',
          client_txn_id: client_txn_id,
          amount: amt,
          p_info: 'Wallet Deposit',
          customer_name: userData.name || 'User',
          customer_email: userData.email || 'user@swamijimatka.com',
          customer_mobile: userData.phone || '0000000000',
          redirect_url: isNative 
            ? `https://swamijimatka.com/app-redirect/ekqr`
            : `https://swamijimatka.com/funds?gateway=ekqr&client_txn_id=${client_txn_id}&amount=${amt}`,
          udf1: user.uid,
          udf2: userData.phone || '',
          udf3: 'Web Redirect Flow'
        };

        // Use the proxy to avoid CORS issues on native AND web
        const proxyUrl = 'https://us-central1-swami-ji-matka-acf76.cloudfunctions.net/paymentProxy';
        const response = await fetch(proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            url: createUrl, 
            payload: payload 
          })
        });

        const result = await response.json();
        if (result && result.status && result.data && result.data.payment_url) {
          // Set payment URL to show in iframe
          setPaymentUrl(result.data.payment_url);
          setPollingTxnId(client_txn_id);
          setPollingGateway('UPI_GATEWAY');
          setPollingAmount(Number(amt));
          setPollingActive(true);
        } else { 
          throw new Error(result.msg || result.message || "Failed to create order. Please check Merchant ID/Key."); 
        }
      } catch (err) { alert("Gateway Error: " + err.message); }
      finally { setLoading(false); }
      return;
    }

    if (method === 'IMB') {
      try {
        let baseUrl = settings.imb_api_url || 'https://secure.imbpayment.in/';
        // Ensure the URL correctly points to the create-order endpoint
        let createUrl = baseUrl;
        if (!createUrl.includes('/api/create-order')) {
          createUrl = createUrl.endsWith('/') ? createUrl + 'api/create-order' : createUrl + '/api/create-order';
        }

        const order_id = `IMB_${Date.now()}`;
        const txnIdKey = `IMB_WH_${order_id}`;

        // Create pending request BEFORE opening gateway
        await setDoc(doc(db, "deposits", txnIdKey), {
          userId: user.uid,
          amount: amt,
          method: 'IMB Gateway',
          status: 'pending',
          txnId: txnIdKey,
          gatewayOrderId: order_id,
          created_at: serverTimestamp(),
          note: 'Created before redirect'
        });
        const payload = {
          customer_mobile: userData.phone || '9999999999',
          user_token: settings.imb_access_token || '61559044c37f7e99485353c294cd74eb',
          amount: amt,
          order_id: order_id,
          redirect_url: isNative
            ? `https://swamijimatka.com/app-redirect/imb`
            : `https://swamijimatka.com/funds?gateway=imb&order_id=${order_id}&amount=${amt}`,
          remark1: userData.email || 'user@swamiji.com',
          remark2: user.uid
        };

        // Use the proxy to avoid CORS issues on native AND web
        const proxyUrl = 'https://us-central1-swami-ji-matka-acf76.cloudfunctions.net/paymentProxy';
        const response = await fetch(proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: createUrl, payload: payload, useFormEncoding: true })
        });

        const result = await response.json();
        // IMB can return status as "SUCCESS" or true/1
        if (result && (result.status === 'SUCCESS' || result.status === true || result.status === 1) && result.result?.payment_url) {
          // Set payment URL to show in iframe
          setPaymentUrl(result.result.payment_url);
          setPollingTxnId(order_id);
          setPollingGateway('IMB');
          setPollingAmount(Number(amt));
          setPollingActive(true);
        } else { 
          const errorMsg = result.message || result.msg || result.error || "Failed to create IMB order";
          throw new Error(errorMsg); 
        }
      } catch (err) { alert("IMB Error: " + err.message); }
      finally { setLoading(false); }
      return;
    }
  };

  const downloadQR = async () => {
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(gatewayData?.payment_url || "")}`;
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `deposit_qr_${amount}.png`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) { alert("Failed to download QR. Take a screenshot instead."); }
  };

  // Polling overlay removed as requested to show iframe in-page
  /*
  if (pollingActive) {
    ...
  }
  */

  return (
    <div className="deposit-page" style={{minHeight: '100vh', background: '#FF6600', paddingBottom: '40px'}}>
      {/* Header */}
      <header className="play-header" style={{background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.1)'}}>
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={28} color="white" />
        </button>
        <div className="header-info">
          <h1 style={{color: 'white', textTransform: 'uppercase', letterSpacing: '1px'}}>Add Cash / पैसे जोड़ें</h1>
        </div>
      </header>

      <div style={{padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        {/* Logo Section */}
        <div style={{textAlign: 'center', marginBottom: '30px', background: 'white', padding: '15px', borderRadius: '50%', boxShadow: '0 8px 20px rgba(0,0,0,0.2)'}}>
          <img src={logo} alt="Logo" style={{height: '100px', width: '100px', objectFit: 'contain'}} />
        </div>

        {/* Content Box */}
        <div style={{background: 'white', width: '100%', maxWidth: '450px', borderRadius: '25px', padding: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)'}}>
          
          {method === 'UPI' && manualStep === 2 ? (
            <div style={{textAlign: 'center'}}>
               <h3 style={{color: '#333', fontWeight: '900', marginBottom: '15px'}}>Scan & Pay ₹{amount}</h3>
               {settings.qr_url ? (
                 <img src={settings.qr_url} alt="QR" style={{width: '220px', borderRadius: '15px', border: '5px solid #f8f9fa', marginBottom: '15px'}} />
               ) : <div style={{height: '220px', background: '#eee', borderRadius: '15px', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>Loading QR...</div>}
               <div style={{background: '#f8f9fa', padding: '10px', borderRadius: '10px', marginBottom: '20px'}}>
                  <p style={{fontSize: '0.8rem', color: '#666', margin: 0}}>UPI ID</p>
                  <p style={{fontSize: '1.1rem', fontWeight: '900', color: '#FF6600', margin: 0}}>{settings.upi_id}</p>
               </div>
               
               <form onSubmit={handleSubmit}>
                 <div style={{marginBottom: '20px', textAlign: 'left'}}>
                    <label style={{fontWeight: 'bold', fontSize: '0.9rem', color: '#333'}}>Enter 12-Digit UTR Number:</label>
                    <input 
                      type="text" 
                      value={utrNumber}
                      onChange={e => setUtrNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 123456789012"
                      maxLength={12}
                      style={{width: '100%', padding: '15px', border: '2px solid #FF6600', borderRadius: '12px', marginTop: '8px', fontSize: '1.2rem', textAlign: 'center', letterSpacing: '2px'}}
                      required
                    />
                 </div>
                 <button type="submit" disabled={loading} style={{width: '100%', padding: '15px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '900', fontSize: '1.1rem'}}>
                   {loading ? 'VERIFYING...' : 'SUBMIT UTR'}
                 </button>
                 <button type="button" onClick={() => setManualStep(1)} style={{marginTop: '15px', background: 'none', border: 'none', color: '#666', fontWeight: 'bold'}}>← Edit Amount</button>
               </form>
            </div>
          ) : paymentStatus !== 'INIT' ? (
             <div style={{textAlign: 'center'}}>
                {paymentStatus === 'PENDING' ? (
                  <>
                    <h3 style={{color: '#333', fontWeight: '900', marginBottom: '15px'}}>Scan to Pay ₹{amount}</h3>
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(gatewayData?.payment_url || "")}`} alt="QR" style={{width: '220px', marginBottom: '20px'}} />
                    <button onClick={downloadQR} style={{width: '100%', padding: '12px', background: '#4F46E5', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '15px'}}>
                      <Download size={20} /> Download QR
                    </button>
                    <p style={{color: '#666', fontSize: '0.9rem'}}><span className="spinner-small" style={{display:'inline-block', marginRight:'8px'}}></span>Waiting for payment...</p>
                  </>
                ) : (
                  <div style={{padding: '20px'}}>
                    <div style={{fontSize: '4rem', marginBottom: '15px'}}>{paymentStatus === 'COMPLETED' ? '✅' : '❌'}</div>
                    <h2 style={{color: '#333'}}>{paymentStatus === 'COMPLETED' ? 'Success!' : 'Failed'}</h2>
                    <button onClick={() => navigate('/funds')} style={{marginTop: '20px', padding: '12px 30px', background: '#FF6600', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold'}}>BACK TO FUNDS</button>
                  </div>
                )}
             </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{textAlign: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px'}}>
                <h2 style={{margin: 0, color: '#333', fontWeight: '900'}}>Add Money</h2>
                <p style={{color: '#666', margin: '5px 0 0', fontSize: '0.9rem'}}>Enter amount to add in your wallet</p>
              </div>

              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', fontWeight: 'bold', color: '#555', marginBottom: '8px', fontSize: '0.9rem'}}>Deposit Amount (Min ₹100)</label>
                <div style={{position: 'relative'}}>
                  <span style={{position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem', fontWeight: '900', color: '#333'}}>₹</span>
                  <input 
                    type="number" 
                    value={amount}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '' || parseFloat(val) >= 0) {
                        setAmount(val);
                      }
                    }}
                    onKeyDown={e => {
                      if (e.key === '-' || e.key === 'e' || e.key === '+') {
                        e.preventDefault();
                      }
                    }}
                    min="0"
                    placeholder="0.00"
                    style={{width: '100%', padding: '12px 12px 12px 35px', fontSize: '1.4rem', fontWeight: '900', border: '2px solid #eee', borderRadius: '12px', outline: 'none', color: '#FF6600'}}
                    required
                  />
                </div>

                <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '15px'}}>
                  {quickAmounts.map(val => (
                    <button 
                      key={val} 
                      type="button" 
                      onClick={() => setAmount(val.toString())}
                      style={{
                        padding: '10px', 
                        background: '#000', 
                        color: 'white', 
                        border: amount === val.toString() ? '3px solid #FFCE3B' : 'none',
                        borderRadius: '10px', 
                        fontWeight: '900',
                        fontSize: '0.9rem',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                      }}
                    >
                      ₹{val}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                style={{
                  width: '100%', 
                  padding: '16px', 
                  background: '#27ae60', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '12px', 
                  fontWeight: '900', 
                  fontSize: '1.1rem', 
                  marginTop: '10px',
                  boxShadow: '0 6px 20px rgba(39, 174, 96, 0.3)'
                }}
              >
                {loading ? 'PROCESSING...' : (method === 'UPI' ? 'NEXT STEP' : 'DEPOSIT NOW')}
              </button>

              <div style={{marginTop: '20px', padding: '15px', background: '#FFF5F5', borderRadius: '12px', border: '2px solid #FEB2B2'}}>
                 <h4 style={{margin: '0 0 10px', color: '#C53030', fontSize: '1rem', fontWeight: '900', textAlign: 'center'}}>(( महत्वपूर्ण सूचना))</h4>
                 <p style={{margin: '0 0 10px', fontSize: '0.85rem', color: '#4A5568', lineHeight: '1.6', fontWeight: 'bold'}}>
                   QR CODE का आप स्क्रीन शॉट लेकर आप अपने किसी भी यूपीआई ऐप या किसी के भी फोन से स्कैन करके पेमेंट कर सकते हैं और स्कैनर के नीचे पेमेंट का बटन है उसे आप सीधा पेटीएम से पेमेंट से ADD कर सकते हो है
                 </p>
                 <p style={{margin: '0 0 10px', fontSize: '0.85rem', color: '#4A5568', lineHeight: '1.6', fontWeight: 'bold'}}>
                   QR कोड 1 मिनट में चेंज होता है हर बार अलग-अलग QR CODE मिलेगा है
                 </p>
                 <p style={{margin: 0, fontSize: '0.85rem', color: '#4A5568', lineHeight: '1.6', fontWeight: 'bold'}}>
                   QR CODE पर पेमेंट करने के बाद Refresh कर लिया को
                 </p>
              </div>
            </form>
          )}
        </div>

        {/* Payment Iframe Box */}
        {paymentUrl && (
          <div id="payment-box" style={{marginTop: '30px', background: 'white', width: '100%', maxWidth: '600px', borderRadius: '25px', padding: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', textAlign: 'center'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
              <h3 style={{margin: 0, color: '#333', fontSize: '1.1rem', fontWeight: '900'}}>Payment Gateway</h3>
              <button 
                onClick={() => { setPaymentUrl(''); setPollingActive(false); }}
                style={{background: '#ffefef', color: '#ff4444', border: 'none', padding: '5px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.8rem'}}
              >
                Close Box
              </button>
            </div>
            
            <div style={{position: 'relative', width: '100%', height: '650px', background: '#f8f9fa', borderRadius: '15px', overflow: 'hidden', border: '2px solid #eee'}}>
              <iframe 
                src={paymentUrl} 
                style={{width: '100%', height: '100%', border: 'none'}} 
                title="Payment"
              />
            </div>
            
            <div style={{marginTop: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
              <div className="spinner-small"></div>
              <p style={{margin: 0, color: '#666', fontSize: '0.9rem', fontWeight: 'bold'}}>
                Monitoring your payment...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepositPage;
