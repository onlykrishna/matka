import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Landmark,
  Wallet,
  CheckCircle,
  AlertCircle,
  CreditCard
} from 'lucide-react';
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { 
  doc, 
  onSnapshot, 
  collection, 
  addDoc, 
  serverTimestamp, 
  updateDoc, 
  increment
} from "firebase/firestore";
import logo from '../assets/logo.png';
import gpayLogo from '../assets/gpay_logo.png';
import phonepeLogo from '../assets/phonepe_logo.png';
import paytmLogo from '../assets/paytm_logo.png';
import '../index.css';

const WithdrawalPage = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('PhonePe');
  const [payoutNumber, setPayoutNumber] = useState('');
  const [bankInfo, setBankInfo] = useState({ holderName: '', accountNumber: '', ifsc: '' });
  const [loading, setLoading] = useState(false);
  const [validationMsg, setValidationMsg] = useState('');
  const [user, setUser] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        const userRef = doc(db, "users", u.uid);
        onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            setWalletBalance(snap.data().wallet_balance || 0);
            setUserName(snap.data().name || '');
            setUserPhone(snap.data().phone || u.phoneNumber || '');
          }
        });
      } else {
        navigate('/login');
      }
    });
    return () => unsubscribeAuth();
  }, [navigate]);

  useEffect(() => {
    if (!amount) {
      setValidationMsg('');
      return;
    }
    const amt = parseFloat(amount);
    if (amt < 500) setValidationMsg('Minimum withdrawal is ₹500');
    else if (amt > walletBalance) setValidationMsg(`Insufficient balance (Max ₹${walletBalance.toFixed(2)})`);
    else setValidationMsg('');
  }, [amount, walletBalance]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) < 500) {
      alert("Minimum withdrawal is ₹500");
      return;
    }
    if (parseFloat(amount) > walletBalance) {
      alert("Insufficient balance");
      return;
    }

    if (method === 'Bank Account') {
      if (!bankInfo.holderName || !bankInfo.accountNumber || !bankInfo.ifsc) {
        alert("Please fill all bank details.");
        return;
      }
    } else {
      if (!payoutNumber || payoutNumber.length < 10) {
        alert("Please enter a valid 10-digit number.");
        return;
      }
    }

    setLoading(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { wallet_balance: increment(-parseFloat(amount)) });

      const withdrawalData = {
        userId: user.uid,
        amount: parseFloat(amount),
        username: userName,
        phone: userPhone,
        current_balance: walletBalance - parseFloat(amount),
        status: 'pending',
        created_at: serverTimestamp(),
        type: 'withdrawal',
        payoutMethod: method,
      };

      if (method === 'Bank Account') withdrawalData.bankDetails = bankInfo;
      else withdrawalData.payoutNumber = payoutNumber;

      await addDoc(collection(db, "withdrawals"), withdrawalData);
      alert("Withdrawal request placed successfully!");
      navigate('/funds');
    } catch (err) { alert("Error: " + err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="withdrawal-page" style={{minHeight: '100vh', background: '#FF6600', paddingBottom: '40px'}}>
      <header className="play-header" style={{background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.1)'}}>
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={28} color="white" />
        </button>
        <div className="header-info">
          <h1 style={{color: 'white', textTransform: 'uppercase', letterSpacing: '1px'}}>Withdraw Cash / पैसे निकालें</h1>
        </div>
      </header>

      {/* Moving Text Strip */}
      <div style={{ 
        background: '#000', 
        color: '#fff', 
        padding: '8px 0', 
        width: '100%', 
        overflow: 'hidden',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
      }}>
        <marquee behavior="scroll" direction="left" scrollamount="6" style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
          निकासी और जमा की सुविधा 24x7 उपलब्ध है। Withdrawal and deposit facilities are available 24x7 &nbsp;&nbsp;&nbsp;&nbsp; निकासी और जमा की सुविधा 24x7 उपलब्ध है। Withdrawal and deposit facilities are available 24x7
        </marquee>
      </div>

      <div style={{padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        {/* Wallet Summary */}
        <div style={{background: 'rgba(0,0,0,0.8)', width: '100%', maxWidth: '450px', borderRadius: '15px', padding: '15px', marginBottom: '20px', textAlign: 'center', color: 'white', border: '1px solid rgba(255,255,255,0.2)'}}>
           <p style={{fontSize: '0.8rem', opacity: 0.8, margin: 0}}>Available for Withdrawal</p>
           <h2 style={{fontSize: '2.2rem', fontWeight: '900', margin: '5px 0', color: '#FFCE3B'}}>₹ {walletBalance.toFixed(2)}</h2>
        </div>

        {/* Content Box */}
        <div style={{background: 'white', width: '100%', maxWidth: '450px', borderRadius: '25px', padding: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)'}}>
          <form onSubmit={handleSubmit}>
            <div style={{marginBottom: '20px'}}>
              <label style={{display: 'block', fontWeight: 'bold', color: '#333', marginBottom: '10px'}}>Enter Amount (Min ₹500)</label>
              <input 
                type="number" 
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="₹ 0.00"
                style={{width: '100%', padding: '15px', fontSize: '1.5rem', fontWeight: '900', border: '2px solid #eee', borderRadius: '12px', outline: 'none'}}
                required
              />
              {validationMsg && <p style={{color: '#d32f2f', fontSize: '0.8rem', marginTop: '5px', fontWeight: 'bold'}}>{validationMsg}</p>}
            </div>

            <div style={{marginBottom: '20px'}}>
              <label style={{display: 'block', fontWeight: 'bold', color: '#333', marginBottom: '12px'}}>Select Payout Method</label>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                {['PhonePe', 'Paytm', 'GPay', 'Bank Account'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    style={{
                      padding: '12px 5px', 
                      borderRadius: '12px', 
                      border: '2px solid', 
                      borderColor: method === m ? '#FF6600' : '#f0f0f0',
                      background: method === m ? '#fff5f0' : '#f8f9fa',
                      fontWeight: 'bold',
                      fontSize: '0.85rem',
                      color: method === m ? '#FF6600' : '#666',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {m === 'PhonePe' && <img src={phonepeLogo} alt="PhonePe" style={{width: '20px', height: '20px', objectFit: 'contain'}} />}
                    {m === 'Paytm' && <img src={paytmLogo} alt="Paytm" style={{width: '32px', height: '20px', objectFit: 'contain'}} />}
                    {m === 'GPay' && <img src={gpayLogo} alt="GPay" style={{width: '20px', height: '20px', objectFit: 'contain'}} />}
                    {m === 'Bank Account' && <Landmark size={18} />}
                    {m === 'GPay' ? 'Google Pay' : m}
                  </button>
                ))}
              </div>
            </div>

            {method === 'Bank Account' ? (
              <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                <input 
                  type="text" 
                  value={bankInfo.holderName}
                  onChange={e => setBankInfo({...bankInfo, holderName: e.target.value})}
                  placeholder="Account Holder Name" 
                  style={{width:'100%', padding:'12px', border:'1px solid #ddd', borderRadius:'10px'}}
                  required
                />
                <input 
                  type="text" 
                  value={bankInfo.accountNumber}
                  onChange={e => setBankInfo({...bankInfo, accountNumber: e.target.value})}
                  placeholder="Bank Account Number" 
                  style={{width:'100%', padding:'12px', border:'1px solid #ddd', borderRadius:'10px'}}
                  required
                />
                <input 
                  type="text" 
                  value={bankInfo.ifsc}
                  onChange={e => setBankInfo({...bankInfo, ifsc: e.target.value.toUpperCase()})}
                  placeholder="IFSC Code (e.g. SBIN0001234)" 
                  style={{width:'100%', padding:'12px', border:'1px solid #ddd', borderRadius:'10px'}}
                  required
                />
              </div>
            ) : (
              <div>
                <label style={{fontSize: '0.8rem', fontWeight: 'bold', color: '#666', display:'block', marginBottom:'5px'}}>{method} Number:</label>
                <input 
                  type="text" 
                  value={payoutNumber}
                  onChange={e => setPayoutNumber(e.target.value.replace(/\D/g, ''))}
                  maxLength={10}
                  placeholder={`Enter 10 digit ${method} number`} 
                  style={{width:'100%', padding:'15px', border:'1px solid #ddd', borderRadius:'10px', fontSize: '1.1rem'}}
                  required
                />
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading || validationMsg !== ''}
              style={{
                width: '100%', 
                padding: '18px', 
                background: (loading || validationMsg !== '') ? '#ccc' : '#D32F2F', 
                color: 'white', 
                border: 'none', 
                borderRadius: '15px', 
                fontWeight: '900', 
                fontSize: '1.2rem', 
                marginTop: '30px',
                boxShadow: (loading || validationMsg !== '') ? 'none' : '0 6px 20px rgba(211, 47, 47, 0.3)'
              }}
            >
              {loading ? 'PROCESSING...' : 'REQUEST WITHDRAWAL'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default WithdrawalPage;
