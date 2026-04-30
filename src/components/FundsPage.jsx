import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Wallet, 
  Home, 
  History, 
  Share2, 
  HelpCircle, 
  Banknote, 
  Landmark,
  CreditCard,
  Menu,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Download,
  ExternalLink
} from 'lucide-react';
import Sidebar from './Sidebar';
import AuthPopup from './AuthPopup';
import { db, auth } from "../firebase";
import { onAuthStateChanged, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { collection, addDoc, onSnapshot, doc, query, where, serverTimestamp, getDocs, orderBy, limit, updateDoc, increment } from "firebase/firestore";
import banner1 from '../assets/banner1.png';
import banner2 from '../assets/banner2.png';
import banner3 from '../assets/banner3.png';
import logo from '../assets/logo.png';
import gpayLogo from '../assets/gpay_logo.png';
import phonepeLogo from '../assets/phonepe_logo.png';
import paytmLogo from '../assets/paytm_logo.png';
import '../index.css';

const FundsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('deposit');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('Loading...');
  const [userPhone, setUserPhone] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [depositSettings, setDepositSettings] = useState({ upi_id: '', qr_url: '' });
  const [showDepositPopup, setShowDepositPopup] = useState(false);
  const [userUid, setUserUid] = useState(null);
  const [depositHistory, setDepositHistory] = useState([]);
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [showWithdrawalPopup, setShowWithdrawalPopup] = useState(false);
  const [kycStatus, setKycStatus] = useState('incomplete'); // 'incomplete' or 'complete'
  const [userEmail, setUserEmail] = useState('');
  const [showImbSuccess, setShowImbSuccess] = useState(false);
  const [imbSuccessAmount, setImbSuccessAmount] = useState(0);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        setUserUid(user.uid);
        setUserPhone(user.phoneNumber || '');
        setUserEmail(user.email || '');
        
        // Fetch user profile data from Firestore
        const userDocRef = doc(db, "users", user.uid);
        
        // Listen for real-time wallet updates
        const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserName(data.name || 'User');
            setWalletBalance(data.wallet_balance || 0);
          }
        });

        return () => unsubscribeUser();
      } else {
        setIsLoggedIn(false);
        setUserName('Guest User');
        setWalletBalance(0);
        setShowAuthPopup(true);
      }
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  // Fetch KYC status
  useEffect(() => {
    if (!userUid) return;
    const unsub = onSnapshot(doc(db, "bank_details", userUid), (snap) => {
      if (snap.exists() && snap.data().status === 'complete') {
        setKycStatus('complete');
      } else {
        setKycStatus('incomplete');
      }
    });
    return () => unsub();
  }, [userUid]);

  const [socialLinks, setSocialLinks] = useState({ whatsapp: '', telegram: '' });
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(1));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const latest = snap.docs[0].data().createdAt?.toMillis() || 0;
        const lastRead = Number(localStorage.getItem('lastReadNotification') || 0);
        setHasUnread(latest > lastRead);
      }
    });

    const handleStorage = () => setHasUnread(false);
    window.addEventListener('storage', handleStorage);
    return () => {
      unsub();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "deposit"), (s) => {
      if (s.exists()) setDepositSettings(s.data());
    });

    // Check for IMB Success redirection (e.g., /funds?status=success&amount=100)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('status') === 'success' && urlParams.get('amount') && userUid) {
      const amt = parseFloat(urlParams.get('amount'));
      setImbSuccessAmount(amt);
      setShowImbSuccess(true);
      
      // Update wallet (Note: In production, this should be verified server-side)
      const userRef = doc(db, "users", userUid);
      updateDoc(userRef, {
        wallet_balance: increment(amt)
      }).then(() => {
        // Add to history
        addDoc(collection(db, "deposits"), {
          userId: userUid,
          amount: amt,
          method: 'IMB UPI',
          status: 'approved',
          created_at: serverTimestamp(),
          note: 'Automatic IMB Deposit'
        });
      });

      // Clear params and hide after 3 seconds
      setTimeout(() => {
        setShowImbSuccess(false);
        navigate('/funds', { replace: true });
      }, 3000);
    }

    return () => unsub();
  }, [userUid]);

  useEffect(() => {
    const unsubSocial = onSnapshot(doc(db, "settings", "social"), (docSnap) => {
      if (docSnap.exists()) {
        setSocialLinks(docSnap.data());
      }
    });
    return () => unsubSocial();
  }, []);

  // Fetch Deposit History
  useEffect(() => {
    if (!userUid) return;
    const q = query(collection(db, "deposits"), where("userId", "==", userUid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort manually to avoid index requirement
      const sortedByTime = data.sort((a, b) => {
        const tA = a.created_at?.toMillis ? a.created_at.toMillis() : (a.created_at instanceof Date ? a.created_at.getTime() : 0);
        const tB = b.created_at?.toMillis ? b.created_at.toMillis() : (b.created_at instanceof Date ? b.created_at.getTime() : 0);
        return tB - tA;
      });
      setDepositHistory(sortedByTime);
    }, (err) => {
      console.error("[HISTORY] Deposit Listener Error:", err);
    });

    return () => unsubscribe();
  }, [userUid]);

  // Fetch Withdrawal History
  useEffect(() => {
    if (!userUid) return;
    const q = query(collection(db, "withdrawals"), where("userId", "==", userUid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const manualSorted = data.sort((a, b) => {
        const tA = a.created_at?.toMillis ? a.created_at.toMillis() : (a.created_at instanceof Date ? a.created_at.getTime() : 0);
        const tB = b.created_at?.toMillis ? b.created_at.toMillis() : (b.created_at instanceof Date ? b.created_at.getTime() : 0);
        return tB - tA;
      });
      setWithdrawalHistory(manualSorted);
    }, (err) => {
      console.error("[HISTORY] Withdrawal Error:", err);
    });
    return () => unsubscribe();
  }, [userUid]);

  return (
    <div className="home-container" style={{background: '#F8F9FA'}}>
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        userName={userName} 
        userPhone={userPhone} 
        isLoggedIn={isLoggedIn}
      />

      {showAuthPopup && (
        <AuthPopup 
          onClose={() => setShowAuthPopup(false)} 
          onNavigate={navigate} 
        />
      )}

      {/* Top Header synced with Home */}
      <header className="home-header">
        <div className="header-left">
          <button className="menu-btn" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={24} color="#000000" />
          </button>
          <img src={logo} alt="Logo" className="header-logo-img" />
        </div>

        <div className="header-center">
          <span className="brand-name-hindi">स्वामी जी मटका</span>
        </div>

        <div className="header-right">
          <div className="wallet-badge" onClick={() => navigate('/funds')} style={{ cursor: 'pointer' }}>
            <CreditCard size={16} />
            <span>₹ {walletBalance.toFixed(2)}</span>
          </div>
          <button className="notification-btn" onClick={() => navigate('/notifications')} style={{ position: 'relative' }}>
            <Bell size={20} />
            {hasUnread && <span className="notification-badge"></span>}
          </button>
        </div>
      </header>

      {/* IMB SUCCESS OVERLAY */}
      {showImbSuccess && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.9)', zIndex: 10000, 
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          color: 'white', textAlign: 'center'
        }}>
          <div style={{
            width: '80px', height: '80px', background: '#27ae60', borderRadius: '50%', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px',
            boxShadow: '0 0 20px rgba(39, 174, 96, 0.5)'
          }}>
            <CheckCircle size={50} color="white" />
          </div>
          <h2 style={{fontSize: '1.8rem', fontWeight: '900', marginBottom: '10px'}}>PAYMENT SUCCESSFUL!</h2>
          <p style={{fontSize: '1.1rem', opacity: 0.9}}>₹ {imbSuccessAmount.toFixed(2)} added to your wallet.</p>
          <div style={{marginTop: '30px', fontSize: '0.8rem', color: '#aaa'}}>Redirecting back...</div>
        </div>
      )}

      {/* Notice Banner (Moving Marquee) */}
      <div className="marquee-container" style={{
        backgroundColor: 'black', 
        color: '#FFEA00', 
        padding: '8px 0', 
        margin: 0, 
        borderBottom: '2px solid #FF6600',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{
          background: '#FF6600',
          color: 'black',
          padding: '2px 10px',
          fontWeight: '900',
          fontSize: '0.7rem',
          zIndex: 10,
          whiteSpace: 'nowrap',
          boxShadow: '2px 0 10px rgba(0,0,0,0.5)'
        }}>NOTICE</div>
        <div className="marquee-content" style={{
          animation: 'marquee 15s linear infinite',
          fontWeight: 'bold',
          fontSize: '0.9rem',
          textTransform: 'uppercase'
        }}>
          Withdrawals available 24x7. Fast payments & secure play. Best Matka Experience!
        </div>
      </div>

      <div style={{padding: '15px', paddingBottom: '90px'}}>
        {/* Top Buttons (Deposit/Withdrawal Actions) */}
        <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}>
          <div style={{flex: '1 1 0%', minWidth: 0}}>
            <div style={{textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '5px', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>पैसे डालें / Min ₹100</div>
            <button className="funds-action-btn deposit" onClick={() => setShowDepositPopup(true)} style={{width: '100%', whiteSpace: 'nowrap'}}>
              <Banknote size={16} /> DEPOSIT
            </button>
          </div>
          <div style={{flex: '1 1 0%', minWidth: 0}}>
            <div style={{textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '5px', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>पैसे निकालें / Min ₹500</div>
            <button className="funds-action-btn withdrawal" onClick={() => setShowWithdrawalPopup(true)} style={{width: '100%', whiteSpace: 'nowrap'}}>
              <Landmark size={16} /> WITHDRAW
            </button>
          </div>
        </div>

        {/* History Tabs */}
        <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
          <button 
            className={`funds-history-btn ${activeTab === 'deposit' ? 'active' : ''}`}
            onClick={() => setActiveTab('deposit')}
          >
            &darr; Deposit History
          </button>
          <button 
            className={`funds-history-btn ${activeTab === 'withdrawal' ? 'active' : ''}`}
            onClick={() => setActiveTab('withdrawal')}
          >
            &uarr; Withdrawal History
          </button>
        </div>

        {/* Title */}
        <h3 style={{textAlign: 'center', color: '#5e4e42', marginBottom: '15px', fontSize: '1rem', fontWeight: '900'}}>
          {activeTab === 'deposit' ? 'Deposit History / जमा हिस्ट्री' : 'Withdrawal History / निकासी हिस्ट्री'}
        </h3>

        {/* Table */}
        <div style={{overflowX: 'auto', marginBottom: '20px', borderRadius: '5px', boxShadow: '0 0 5px rgba(0,0,0,0.1)'}}>
          <table className="funds-table">
            <thead>
              <tr>
                <th>Sr</th>
                <th>Amount</th>
                <th>Date/Time</th>
                <th>Method</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {activeTab === 'deposit' ? (
                depositHistory.length > 0 ? (
                  depositHistory.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td style={{fontWeight: 'bold'}}>₹{item.amount.toFixed(2)}</td>
                      <td style={{fontSize: '0.8rem'}}>
                        {item.created_at?.toDate ? item.created_at.toDate().toLocaleString('en-IN', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'}) : 'Just now'}
                      </td>
                      <td>{item.method || 'UPI'}</td>
                      <td style={{
                        color: item.status === 'approved' ? '#2e7d32' : item.status === 'pending' ? '#f57c00' : '#d32f2f', 
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        fontSize: '0.75rem'
                      }}>
                        {item.status}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{textAlign: 'center', padding: '15px', color: '#666'}}>No deposit history found.</td>
                  </tr>
                )
              ) : (
                withdrawalHistory.length > 0 ? (
                  withdrawalHistory.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td style={{fontWeight: 'bold'}}>₹{item.amount.toFixed(2)}</td>
                      <td style={{fontSize: '0.8rem'}}>
                        {item.created_at?.toDate ? item.created_at.toDate().toLocaleString('en-IN', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'}) : 'Just now'}
                      </td>
                      <td>{item.bank_name || 'Bank'}</td>
                      <td style={{
                        color: item.status === 'approved' ? '#2e7d32' : item.status === 'pending' ? '#f57c00' : '#d32f2f', 
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        fontSize: '0.75rem'
                      }}>
                        {item.status}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{textAlign: 'center', padding: '15px', color: '#666'}}>No withdrawal history found.</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px'}}>
          <button style={{padding: '8px 15px', background: '#ccc', color: 'white', border: 'none', borderRadius: '3px', fontWeight: 'bold'}} disabled>Prev</button>
          <span style={{fontWeight: '900', fontSize: '1.2rem', color: '#4a3b32', letterSpacing: '2px'}}>Page 1 / 1</span>
          <button style={{padding: '8px 15px', background: '#ccc', color: 'white', border: 'none', borderRadius: '3px', fontWeight: 'bold'}} disabled>Next</button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <div className="nav-item" onClick={() => navigate('/my-bids')}>
          <History size={20} />
          <span>My Bids</span>
        </div>
        <div className="nav-item active">
          <div className="funds-icon" style={{background: 'black', color: 'white'}}>₹</div>
          <span style={{fontWeight: 'bold', color: 'black'}}>Funds</span>
        </div>
        <div className="nav-item main" onClick={() => navigate('/home')}>
          <div className="home-btn-circle" style={{background: '#FFB800'}}>
            <Home color="black" fill="black" size={24} />
          </div>
        </div>
        <div className="nav-item" onClick={() => navigate('/panel-chart')}>
          <BarChart3 size={24} />
          <span>Charts</span>
        </div>
        <div className="nav-item" onClick={() => {
          if (socialLinks.whatsapp) {
            window.location.href = `https://wa.me/${socialLinks.whatsapp.replace(/\D/g, '')}`;
          }
        }}>
          <HelpCircle size={24} />
          <span>Support</span>
        </div>
      </nav>

      {showDepositPopup && (
        <DepositPopup 
          settings={depositSettings} 
          userId={userUid}
          userName={userName}
          userEmail={userEmail}
          userPhone={userPhone}
          onClose={() => setShowDepositPopup(false)} 
        />
      )}

      {showWithdrawalPopup && (
        <WithdrawalPopup 
          userId={userUid}
          walletBalance={walletBalance}
          kycStatus={kycStatus}
          userName={userName}
          userPhone={userPhone}
          onClose={() => setShowWithdrawalPopup(false)}
          navigate={navigate}
        />
      )}
    </div>
  );
};

const WithdrawalPopup = ({ userId, walletBalance, kycStatus, userName, userPhone, onClose, navigate }) => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('PhonePe');
  const [payoutNumber, setPayoutNumber] = useState('');
  const [bankInfo, setBankInfo] = useState({ holderName: '', accountNumber: '', ifsc: '' });
  const [loading, setLoading] = useState(false);
  const [validationMsg, setValidationMsg] = useState('');

  useEffect(() => {
    if (!amount) {
      setValidationMsg('');
      return;
    }

    const amt = parseFloat(amount);
    if (amt < 500) {
      setValidationMsg('Enter amount greater than 500');
    } else if (amt > walletBalance) {
      setValidationMsg(`Enter amount less than ${walletBalance.toFixed(2)}`);
    } else {
      setValidationMsg('');
    }
  }, [amount, walletBalance]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) < 500) {
      alert("Enter amount greater than 500");
      return;
    }

    if (parseFloat(amount) > walletBalance) {
      alert("Insufficient balance");
      return;
    }

    // Validate details
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
      // 1. Atomic Wallet Deduction
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        wallet_balance: increment(-parseFloat(amount))
      });

      // 2. Create Withdrawal Request
      const withdrawalData = {
        userId,
        amount: parseFloat(amount),
        username: userName,
        phone: userPhone,
        current_balance: walletBalance - parseFloat(amount),
        status: 'pending',
        created_at: serverTimestamp(),
        type: 'withdrawal',
        payoutMethod: method,
      };

      if (method === 'Bank Account') {
        withdrawalData.bankDetails = bankInfo;
      } else {
        withdrawalData.payoutNumber = payoutNumber;
      }

      await addDoc(collection(db, "withdrawals"), withdrawalData);

      alert("Withdrawal request placed successfully! Amount deducted from wallet.");
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const isBelowMin = walletBalance < 500;

  const renderPayoutFields = () => {
    if (method === 'Bank Account') {
      return (
        <div style={{marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px'}}>
          <div>
            <label style={{fontSize: '0.85rem', fontWeight: 'bold', color: '#666'}}>Account Holder Name:</label>
            <input 
              type="text" 
              value={bankInfo.holderName}
              onChange={e => setBankInfo({...bankInfo, holderName: e.target.value})}
              placeholder="As per bank passbook" 
              style={{width:'100%', padding:'12px', border:'1px solid #ccc', borderRadius:'8px', outline:'none', marginTop: '5px'}}
              required
            />
          </div>
          <div>
            <label style={{fontSize: '0.85rem', fontWeight: 'bold', color: '#666'}}>Account Number:</label>
            <input 
              type="text" 
              value={bankInfo.accountNumber}
              onChange={e => setBankInfo({...bankInfo, accountNumber: e.target.value})}
              placeholder="Enter account number" 
              style={{width:'100%', padding:'12px', border:'1px solid #ccc', borderRadius:'8px', outline:'none', marginTop: '5px'}}
              required
            />
          </div>
          <div>
            <label style={{fontSize: '0.85rem', fontWeight: 'bold', color: '#666'}}>IFSC Code:</label>
            <input 
              type="text" 
              value={bankInfo.ifsc}
              onChange={e => setBankInfo({...bankInfo, ifsc: e.target.value.toUpperCase()})}
              placeholder="e.g. SBIN0001234" 
              style={{width:'100%', padding:'12px', border:'1px solid #ccc', borderRadius:'8px', outline:'none', marginTop: '5px'}}
              required
            />
          </div>
        </div>
      );
    }
    
    return (
      <div style={{marginTop: '15px'}}>
        <label style={{fontSize: '0.85rem', fontWeight: 'bold', color: '#666'}}>{method} Number:</label>
        <input 
          type="text" 
          value={payoutNumber}
          onChange={e => setPayoutNumber(e.target.value.replace(/\D/g, ''))}
          maxLength={10}
          placeholder={`Enter 10 digit ${method} number`} 
          style={{width:'100%', padding:'12px', border:'1px solid #ccc', borderRadius:'8px', outline:'none', marginTop: '5px'}}
          required
        />
      </div>
    );
  };

  return (
    <div className="popup-overlay" style={{position: 'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', zIndex: 2000, display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div className="popup-content" style={{background:'white', width:'95%', maxWidth:'420px', borderRadius:'15px', padding:'20px', position:'relative', maxHeight: '90vh', overflowY: 'auto'}}>
        <button onClick={onClose} style={{position:'absolute', top:'10px', right:'10px', background:'#FF6600', color:'white', border:'none', borderRadius:'5px', padding:'5px 10px', fontWeight:'bold'}}>X</button>
        
        <h2 style={{textAlign:'center', color:'#FF6600', fontSize:'1.4rem', fontWeight:'900', marginBottom:'15px'}}>WITHDRAWAL</h2>

        <form onSubmit={handleSubmit}>
          <div style={{background: '#f8f9fa', padding: '15px', borderRadius: '12px', marginBottom: '20px', textAlign: 'center'}}>
            <p style={{fontSize: '0.8rem', color: '#666', margin: 0}}>Available Balance</p>
            <h3 style={{fontSize: '1.6rem', margin: 0, color: '#2e7d32', fontWeight: '900'}}>₹ {walletBalance.toFixed(2)}</h3>
          </div>

          <div style={{marginBottom:'20px', borderBottom: '1px solid #eee', paddingBottom: '20px'}}>
            <label style={{display:'block', fontWeight:'bold', marginBottom:'8px', fontSize:'0.9rem'}}>Withdrawal Amount (Min ₹500):</label>
            <input 
              type="number" 
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Enter amount" 
              style={{width:'100%', padding:'12px', border:'1px solid #ccc', borderRadius:'8px', outline:'none', fontSize: '1.1rem'}}
              required
            />
            {validationMsg && (
              <p style={{color: '#d32f2f', fontSize: '0.75rem', marginTop: '5px', fontWeight: 'bold'}}>{validationMsg}</p>
            )}
          </div>

          <div style={{marginBottom:'15px'}}>
            <label style={{display:'block', fontWeight:'bold', marginBottom:'10px', fontSize:'0.9rem'}}>Select Payout Method:</label>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '15px'}}>
              {['PhonePe', 'Paytm', 'GPay', 'Bank Account'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  style={{
                    padding: '12px 5px', 
                    borderRadius: '8px', 
                    border: '2px solid', 
                    borderColor: method === m ? '#FF6600' : '#E0E0E0',
                    background: method === m ? '#FFF5F0' : 'white',
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                    color: method === m ? '#FF6600' : '#666',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {m === 'PhonePe' && <img src={phonepeLogo} alt="PhonePe" style={{width: '20px', height: '20px', objectFit: 'contain'}} />}
                  {m === 'Paytm' && <img src={paytmLogo} alt="Paytm" style={{width: '32px', height: '20px', objectFit: 'contain'}} />}
                  {m === 'GPay' && <img src={gpayLogo} alt="Google Pay" style={{width: '20px', height: '20px', objectFit: 'contain'}} />}
                  {m === 'Bank Account' && <Landmark size={18} color={method === m ? '#FF6600' : '#666'} />}
                  {m === 'GPay' ? 'Google Pay' : m}
                </button>
              ))}
            </div>
          </div>

          {renderPayoutFields()}

          <div style={{marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px'}}>
            <button 
              type="submit" 
              disabled={loading || validationMsg !== ''}
              style={{
                width:'100%', 
                padding:'15px', 
                background: (loading || validationMsg !== '') ? '#ccc' : '#FF6600', 
                color:'white', 
                border:'none', 
                borderRadius:'12px', 
                fontWeight:'900', 
                fontSize:'1.1rem', 
                cursor: (loading) ? 'default' : 'pointer',
                boxShadow: (loading) ? 'none' : '0 4px 15px rgba(255, 102, 0, 0.3)'
              }}
            >
              {loading ? 'PROCESSING...' : 'PLACE WITHDRAWAL'}
            </button>
            {isBelowMin && (
              <p style={{textAlign: 'center', color: '#d32f2f', fontSize: '0.75rem', marginTop: '10px', fontWeight: 'bold'}}>
                Balance is below minimum limit (₹500)
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

const DepositPopup = ({ settings, userId, userName, userEmail, userPhone, onClose }) => {
  const [amount, setAmount] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [manualStep, setManualStep] = useState(1); // 1: Amount, 2: UTR View
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState(settings.active_method === 'IMB' ? 'IMB' : (settings.active_method === 'UPI_GATEWAY' ? 'UPI_GATEWAY' : 'UPI'));
  const [socialLinks, setSocialLinks] = useState({ whatsapp: '' });
  
  // UPI Gateway Specific State
  const [gatewayData, setGatewayData] = useState(null); // { payment_url, order_id, client_txn_id }
  const [paymentStatus, setPaymentStatus] = useState('INIT'); // INIT, PENDING, COMPLETED, FAILED
  const [pollingActive, setPollingActive] = useState(false);

  useEffect(() => {
    if (settings.active_method) {
      setMethod(settings.active_method === 'IMB' ? 'IMB' : (settings.active_method === 'UPI_GATEWAY' ? 'UPI_GATEWAY' : 'UPI'));
    }
  }, [settings.active_method]);

  // Handle Polling for UPI Gateway Status
  useEffect(() => {
    let pollInterval;
    if (pollingActive && gatewayData?.client_txn_id && paymentStatus === 'PENDING') {
      pollInterval = setInterval(async () => {
        try {
          const today = new Date();
          const dateStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
          
          const checkUrl = 'https://merchant.upigateway.com/api/check_order_status';
          const isNative = window.Capacitor && window.Capacitor.isNative;
          let response;
          const payload = {
            key: settings.upi_gateway_id || 'c2ce65c8-e370-466e-9978-643698cf44f3',
            client_txn_id: gatewayData.client_txn_id,
            txn_date: dateStr
          };

          if (isNative) {
            response = await fetch(checkUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
          } else {
            // Web: Use the generic payment proxy
            const proxyUrl = 'https://paymentproxy-vmgxnvieya-uc.a.run.app';
            response = await fetch(proxyUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                url: checkUrl, 
                payload: payload,
                headers: { 'Authorization': `Bearer ${payload.key}` }
              })
            });
          }
          
          const result = await response.json();
          if (result && result.status && result.data.status === 'COMPLETED') {
            setPaymentStatus('COMPLETED');
            setPollingActive(false);
            
            // Credit Wallet
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, {
              wallet_balance: increment(result.data.amount)
            });

            // Add to history
            await addDoc(collection(db, "deposits"), {
              userId,
              amount: result.data.amount,
              method: 'UPI Gateway',
              status: 'approved',
              created_at: serverTimestamp(),
              txnId: gatewayData.client_txn_id,
              gatewayOrderId: gatewayData.order_id
            });

            alert(`₹${result.data.amount} has been successfully added to your wallet!`);
          } else if (result.status && result.data.status === 'FAILED') {
            setPaymentStatus('FAILED');
            setPollingActive(false);
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 5000); // Poll every 5 seconds
    }
    return () => clearInterval(pollInterval);
  }, [pollingActive, gatewayData, paymentStatus, userId, settings.upi_gateway_id]);

  const downloadQR = async () => {
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(gatewayData?.payment_url || "")}`;
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `deposit_qr_${amount}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Failed to download QR. Please take a screenshot instead.");
    }
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "social"), (docSnap) => {
      if (docSnap.exists()) setSocialLinks(docSnap.data());
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount) {
      alert("Please enter amount.");
      return;
    }
    const amt = parseFloat(amount);
    if (amt < 100) {
      alert("Minimum deposit amount is ₹100.");
      return;
    }

    setLoading(true);



    if (method === 'UPI') {
      if (manualStep === 1) {
        setManualStep(2);
        setLoading(false);
        return;
      }

      // Step 2: Submit UTR
      if (!utrNumber || utrNumber.length < 10) {
        alert("Please enter a valid UTR / Transaction ID.");
        setLoading(false);
        return;
      }

      try {
        await addDoc(collection(db, "deposits"), {
          userId,
          amount: amt,
          method: 'UPI Manual',
          utrNumber: utrNumber,
          status: 'pending',
          created_at: serverTimestamp(),
          upi_id_used: settings.upi_id
        });

        alert("Deposit request submitted successfully! It will be verified within 5-10 minutes.");
        onClose();
      } catch (err) {
        console.error(err);
        alert("Failed to submit deposit: " + err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (method === 'UPI_GATEWAY') {
      try {
        if (!settings.upi_gateway_id) {
          alert("UPI Gateway is not configured. Please contact support.");
          setLoading(false);
          return;
        }

        const createUrl = settings.upi_gateway_url || 'https://merchant.upigateway.com/api/create_order';
        const isNative = window.Capacitor && window.Capacitor.isNative;
        const client_txn_id = `txn_${Date.now()}`;
        const payload = {
          key: settings.upi_gateway_id || 'c2ce65c8-e370-466e-9978-643698cf44f3',
          client_txn_id: client_txn_id,
          amount: amt,
          p_info: 'Wallet Deposit',
          customer_name: userName || 'User',
          customer_email: userEmail || 'user@swamiji.com',
          customer_mobile: userPhone || '9999999999',
          redirect_url: window.location.origin + '/funds?status=success&amount=' + amt
        };

        let response;
        if (isNative) {
          response = await fetch(createUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } else {
          // Web: Use the generic payment proxy
          const proxyUrl = 'https://paymentproxy-vmgxnvieya-uc.a.run.app';
          const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              url: createUrl, 
              payload: payload,
              headers: { 'Authorization': `Bearer ${payload.key}` } 
            })
          });
        }

        const result = await response.json();
        if (result && result.status && result.data.payment_url) {
          setGatewayData({
            payment_url: result.data.payment_url,
            order_id: result.data.order_id,
            client_txn_id: client_txn_id
          });
          setPaymentStatus('PENDING');
          setPollingActive(true);
        } else {
          throw new Error(result.msg || "Failed to create order");
        }
      } catch (err) {
        console.error("Gateway Error:", err);
        alert("Gateway Error: " + err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (method === 'IMB') {
      try {
        if (!settings.imb_access_token) {
          alert("IMB Gateway is not configured correctly. Please contact support.");
          setLoading(false);
          return;
        }

        let createUrl = settings.imb_api_url || 'https://secure-stage.imb.org.in/api/create-order';
        
        // Safety: Strip any old corsproxy wrapper if accidentally saved in Admin Panel
        if (createUrl.includes('corsproxy.io')) {
          const urlMatch = createUrl.match(/url=(.+)/);
          if (urlMatch && urlMatch[1]) {
            createUrl = decodeURIComponent(urlMatch[1]);
          }
        }
        
        // Ensure it ends with the correct endpoint if it's just the domain
        if (createUrl.endsWith('.in') || createUrl.endsWith('.in/')) {
           createUrl = createUrl.replace(/\/$/, '') + '/api/create-order';
        }

        const order_id = `IMB_${Date.now()}`;
        const isNative = window.Capacitor && window.Capacitor.isNative;
        
        const payload = {
          customer_mobile: userPhone || '9999999999',
          user_token: settings.imb_access_token || '61559044c37f7e99485353c294cd74eb',
          amount: amt,
          order_id: order_id,
          redirect_url: window.location.origin + '/funds?status=success&amount=' + amt,
          remark1: userEmail || 'user@swamiji.com',
          remark2: userName || 'User'
        };

        let result;
        if (isNative) {
          // Construct form data for native fetch
          const formData = new URLSearchParams();
          Object.keys(payload).forEach(key => formData.append(key, payload[key]));
          
          const response = await fetch(createUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
          });
          result = await response.json();
        } else {
          // Web: Use the generic payment proxy
          const proxyUrl = 'https://paymentproxy-vmgxnvieya-uc.a.run.app';
          const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              url: createUrl, 
              payload: payload, 
              useFormEncoding: true 
            })
          });
          result = await response.json();
        }

        if (result && result.status && result.result && result.result.payment_url) {
          // For IMB, we'll redirect directly or show QR
          window.location.href = result.result.payment_url;
        } else {
          throw new Error(result.message || "Failed to create IMB order");
        }
      } catch (err) {
        console.error("IMB Gateway Error:", err);
        alert("IMB Gateway Error: " + err.message);
      } finally {
        setLoading(false);
      }
      return;
    }
  };

  return (
    <div className="popup-overlay" style={{position: 'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', zIndex: 2000, display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div className="popup-content" style={{background:'white', width:'90%', maxWidth:'400px', borderRadius:'15px', padding:'20px', position:'relative'}}>
        <button onClick={onClose} style={{position:'absolute', top:'10px', right:'10px', background:'#d32f2f', color:'white', border:'none', borderRadius:'5px', padding:'5px 10px', fontWeight:'bold'}}>X</button>
        
        <h2 style={{textAlign:'center', color:'#5e4e42', fontSize:'1.4rem', fontWeight:'900', marginBottom:'20px'}}>Deposit via</h2>

        {/* Selection buttons hidden as per requirement to show only ONE method */}
        {/* 
        <div style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
          <button 
            onClick={() => setMethod('UPI')}
            style={{flex:1, padding:'10px', border:'1px solid #0D47A1', borderRadius:'5px', background: method === 'UPI' ? '#0D47A1' : 'white', color: method === 'UPI' ? 'white' : '#0D47A1', fontWeight:'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'}}
          >
            UPI Manual
          </button>
          <button 
             onClick={() => setMethod('IMB UPI')}
             style={{flex:1, padding:'10px', border:'1px solid #0D47A1', borderRadius:'5px', background: method === 'IMB UPI' ? '#0D47A1' : 'white', color: method === 'IMB UPI' ? 'white' : '#0D47A1', fontWeight:'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'}}
          >
            ⚡ IMB UPI
          </button>
        </div>
        */}

        {method === 'UPI' ? (
          manualStep === 1 ? (
            <form onSubmit={handleSubmit}>
              <div style={{marginBottom:'15px'}}>
                <label style={{display:'block', fontWeight:'bold', marginBottom:'10px', fontSize:'0.9rem'}}>Enter Deposit Amount:</label>
                <input 
                  type="number" 
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Min. ₹100" 
                  style={{width:'100%', padding:'12px', border:'1px solid #ccc', borderRadius:'8px', outline:'none', fontSize: '1.1rem'}}
                  required
                />
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px'}}>
                  {[50, 100, 200, 500, 1000, 2000].map(val => (
                    <button 
                      key={val} 
                      type="button" 
                      onClick={() => setAmount(val.toString())}
                      style={{padding: '8px', border: '1px solid #0D47A1', borderRadius: '5px', background: 'white', color: '#0D47A1', fontWeight: 'bold'}}
                    >
                      +₹{val}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                style={{width:'100%', padding:'15px', background: '#27ae60', color:'white', border:'none', borderRadius:'10px', fontWeight:'900', fontSize:'1.1rem', cursor:'pointer', marginTop: '10px'}}
              >
                DEPOSIT
              </button>

              <div style={{marginTop: '25px', padding: '15px', background: '#FFF5F5', border: '1px solid #FEB2B2', borderRadius: '10px'}}>
                <h4 style={{margin: '0 0 8px', color: '#C53030', fontSize: '0.9rem', fontWeight: 'bold'}}>Important Notice</h4>
                <p style={{margin: 0, fontSize: '0.8rem', color: '#666', lineHeight: '1.4'}}>
                  राशि 5-10 मिनट में जुड़ जाएगी। यदि नहीं जुड़ी या कोई समस्या है तो व्हाट्सएप पर संपर्क करें।
                </p>
                <button 
                  type="button"
                  onClick={() => {
                    if (socialLinks.whatsapp) window.location.href = `https://wa.me/${socialLinks.whatsapp.replace(/\D/g, '')}`;
                  }}
                  style={{marginTop: '10px', width: '100%', padding: '8px', background: '#25D366', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer'}}
                >
                  CONTACT WHATSAPP
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{textAlign:'center', marginBottom:'20px'}}>
                {settings.qr_url ? (
                   <img src={settings.qr_url} alt="QR Code" style={{width:'200px', height:'200px', border:'5px solid #F0F4FF', borderRadius:'15px', marginBottom:'10px'}} />
                ) : (
                  <div style={{width:'200px', height:'200px', background:'#f0f0f0', margin:'0 auto 10px', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'15px', color:'#999'}}>Loading QR...</div>
                )}
                
                <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', fontWeight:'900', fontSize:'1.2rem', color:'#333'}}>
                  <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg" alt="UPI" style={{height:'22px'}} />
                  <span>{settings.upi_id || 'Generating UPI...'}</span>
                </div>
                <p style={{fontSize: '0.85rem', color: '#666', marginTop: '5px'}}>Pay exactly ₹{amount} on the above QR/UPI</p>
              </div>

              <div style={{marginBottom:'20px'}}>
                <label style={{display:'block', fontWeight:'bold', marginBottom:'5px', fontSize:'0.9rem'}}>Enter 12-Digit UTR Number:</label>
                <input 
                  type="text" 
                  value={utrNumber}
                  onChange={e => setUtrNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 123456789012" 
                  maxLength={12}
                  style={{width:'100%', padding:'12px', border:'2px solid #0D47A1', borderRadius:'8px', outline:'none', fontSize: '1.2rem', textAlign: 'center', letterSpacing: '2px'}}
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                style={{width:'100%', padding:'15px', background: '#27ae60', color:'white', border:'none', borderRadius:'10px', fontWeight:'900', fontSize:'1.1rem', cursor:'pointer'}}
              >
                {loading ? 'SUBMITTING...' : 'SUBMIT UTR'}
              </button>
              
              <button 
                type="button" 
                onClick={() => setManualStep(1)} 
                style={{width: '100%', marginTop: '10px', background: 'none', border: 'none', color: '#666', fontWeight: 'bold', cursor: 'pointer'}}
              >
                ← Edit Amount
              </button>
            </form>
          )
        ) : method === 'UPI_GATEWAY' ? (
          <form onSubmit={handleSubmit}>
            <div style={{marginBottom:'15px'}}>
              <label style={{display:'block', fontWeight:'bold', marginBottom:'10px', fontSize:'0.9rem'}}>Enter Deposit Amount:</label>
              <input 
                type="number" 
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Min. ₹100" 
                disabled={paymentStatus !== 'INIT'}
                style={{width:'100%', padding:'12px', border:'1px solid #ccc', borderRadius:'8px', outline:'none', fontSize: '1.1rem'}}
                required
              />
              {paymentStatus === 'INIT' && (
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px'}}>
                  {[50, 100, 200, 500, 1000, 2000].map(val => (
                    <button 
                      key={val} 
                      type="button" 
                      onClick={() => setAmount(val.toString())}
                      style={{padding: '8px', border: '1px solid #0D47A1', borderRadius: '5px', background: 'white', color: '#0D47A1', fontWeight: 'bold'}}
                    >
                      +₹{val}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {paymentStatus === 'INIT' ? (
              <button 
                type="submit" 
                disabled={loading}
                style={{
                  width:'100%', 
                  padding:'15px', 
                  background: loading ? '#ccc' : '#27ae60', 
                  color:'white', 
                  border:'none', 
                  borderRadius:'10px', 
                  fontWeight:'900', 
                  fontSize:'1.1rem', 
                  cursor:'pointer', 
                  marginTop: '10px',
                  boxShadow: loading ? 'none' : '0 4px 10px rgba(39, 174, 96, 0.3)'
                }}
              >
                {loading ? 'PROCESSING...' : 'DEPOSIT'}
              </button>
            ) : (
              <div style={{textAlign: 'center', marginTop: '20px', padding: '20px', background: '#F8F9FA', borderRadius: '15px', border: '2px dashed #CBD5E1'}}>
                {paymentStatus === 'PENDING' ? (
                  <>
                    <h3 style={{fontSize: '1.1rem', color: '#1E293B', marginBottom: '15px', fontWeight: 'bold'}}>Scan to Pay ₹{amount}</h3>
                    <div style={{display: 'inline-block', padding: '15px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '15px'}}>
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(gatewayData?.payment_url || "")}`} 
                        alt="Deposit QR"
                        style={{width: '200px', height: '200px'}}
                      />
                    </div>
                    
                    <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                      <button 
                        type="button"
                        onClick={downloadQR}
                        style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '12px', background: '#4F46E5', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold'}}
                      >
                        <Download size={18} /> DOWNLOAD QR
                      </button>
                      
                      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#64748B', fontSize: '0.85rem', marginTop: '5px'}}>
                        <div className="spinner-small"></div>
                        Waiting for payment confirmation...
                      </div>
                    </div>
                  </>
                ) : paymentStatus === 'COMPLETED' ? (
                  <div style={{color: '#059669'}}>
                    <div style={{fontSize: '3rem', marginBottom: '10px'}}>✅</div>
                    <h3 style={{fontWeight: 'bold'}}>Payment Successful!</h3>
                    <p style={{fontSize: '0.9rem'}}>Wallet updated. You can close this popup.</p>
                  </div>
                ) : (
                  <div style={{color: '#DC2626'}}>
                    <div style={{fontSize: '3rem', marginBottom: '10px'}}>❌</div>
                    <h3 style={{fontWeight: 'bold'}}>Payment Failed</h3>
                    <p style={{fontSize: '0.9rem'}}>Please try again or contact support.</p>
                    <button onClick={() => setPaymentStatus('INIT')} style={{marginTop: '15px', padding: '8px 20px', background: '#DC2626', color: 'white', border: 'none', borderRadius: '8px'}}>RETRY</button>
                  </div>
                )}
              </div>
            )}

            <div style={{marginTop: '25px', padding: '15px', background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '10px'}}>
              <h4 style={{margin: '0 0 8px', color: '#0369A1', fontSize: '0.9rem', fontWeight: 'bold'}}>How it works?</h4>
              <p style={{margin: 0, fontSize: '0.8rem', color: '#666', lineHeight: '1.4'}}>
                1. Enter amount & click Generate QR.<br/>
                2. Scan & Pay using any UPI App.<br/>
                3. Do not close this popup until you see the success message.
              </p>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{textAlign: 'center', padding: '10px', background: '#F0F4FF', borderRadius: '12px', marginBottom: '20px'}}>
              <div style={{fontSize: '2rem', marginBottom: '10px'}}>⚡</div>
              <h3 style={{fontSize: '1rem', color: '#1A237E', fontWeight: 'bold'}}>Automatic Payment</h3>
              <p style={{fontSize: '0.8rem', color: '#5C6BC0'}}>Instant wallet update. No screenshot needed.</p>
            </div>

            <div style={{marginBottom:'15px'}}>
              <label style={{display:'block', fontWeight:'bold', marginBottom:'5px', fontSize:'0.9rem'}}>Amount (₹ INR):</label>
              <input 
                type="number" 
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Min. ₹100" 
                style={{width:'100%', padding:'12px', border:'1px solid #ccc', borderRadius:'8px', outline:'none', fontSize: '1rem'}}
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{
                width:'100%', 
                padding:'15px', 
                background: loading ? '#ccc' : '#4F46E5', 
                color:'white', 
                border:'none', 
                borderRadius:'10px', 
                fontWeight:'900', 
                fontSize:'1.1rem', 
                cursor:'pointer', 
                boxShadow: loading ? 'none' : '0 4px 10px rgba(0,0,0,0.1)'
              }}
            >
              {loading ? 'PROCESSING...' : 'PAY NOW ⚡'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default FundsPage;
