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
import { collection, addDoc, onSnapshot, doc, query, where, serverTimestamp, getDocs, orderBy, limit, updateDoc, increment, runTransaction } from "firebase/firestore";
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
  const [userUid, setUserUid] = useState(null);
  const [depositHistory, setDepositHistory] = useState([]);
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
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

    // Check for Gateway Redirection
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('source') === 'app') {
      window.location.href = `matkaapp://funds${window.location.search}`;
      return;
    }

    const txnStatus = urlParams.get('status')?.toLowerCase();
    const clientTxnId = urlParams.get('client_txn_id');
    const gateway = urlParams.get('gateway');
    const urlAmount = urlParams.get('amount');
    const orderIdParam = urlParams.get('order_id');

    if ((txnStatus === 'success' || txnStatus === 'completed' || gateway === 'ekqr' || gateway === 'imb') && userUid) {
      // Clear URL to prevent refresh issues
      window.history.replaceState({}, document.title, window.location.pathname);

      if (clientTxnId && (gateway === 'ekqr' || txnStatus === 'success')) {
        // Securely verify transaction with gateway
        const verifyTxn = async () => {
          try {
            await runTransaction(db, async (transaction) => {
              const depositRef = doc(db, "deposits", clientTxnId);
              const depSnap = await transaction.get(depositRef);
              
              if (depSnap.exists()) return; // Already credited (Idempotency)

              const today = new Date();
              const dateStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
              const proxyUrl = 'https://us-central1-swami-ji-matka-acf76.cloudfunctions.net/paymentProxy';
              const payload = {
                key: depositSettings.upi_gateway_id || 'c2ce65c8-e370-466e-9978-643698cf44f3',
                client_txn_id: clientTxnId,
                txn_date: dateStr
              };

              const response = await fetch(proxyUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  url: 'https://merchant.upigateway.com/api/check_order_status', 
                  payload: payload
                })
              });

              const result = await response.json();
              const apiStatus = result.data?.status?.toUpperCase() || '';

              if (result && result.status && (apiStatus === 'COMPLETED' || apiStatus === 'SUCCESS')) {
                const amt = Number(result.data.amount);
                const userRef = doc(db, "users", userUid);
                const userSnap = await transaction.get(userRef);
                
                if (!userSnap.exists()) return;

                // 1. Update Balance
                transaction.update(userRef, { 
                  wallet_balance: (userSnap.data().wallet_balance || 0) + amt 
                });

                // 2. Create Deposit Record with fixed ID (prevents double credit)
                transaction.set(depositRef, {
                  userId: userUid,
                  amount: amt,
                  method: 'UPI Gateway',
                  status: 'approved',
                  created_at: serverTimestamp(),
                  txnId: clientTxnId,
                  gatewayOrderId: result.data.order_id || '',
                  note: 'Verified Redirect Deposit'
                });

                // Success UI handled outside transaction
                setImbSuccessAmount(amt);
                setShowImbSuccess(true);
                setTimeout(() => setShowImbSuccess(false), 3000);
              }
            });
          } catch (err) {
            console.error("Verification failed:", err);
          }
        };
        verifyTxn();
      } else if (orderIdParam && gateway === 'imb') {
        // Securely verify IMB transaction
        const verifyIMB = async () => {
          try {
            await runTransaction(db, async (transaction) => {
              const txnIdKey = `IMB_RD_${orderIdParam}`;
              const depositRef = doc(db, "deposits", txnIdKey);
              const depSnap = await transaction.get(depositRef);
              
              if (depSnap.exists()) return; // Already credited

              const proxyUrl = 'https://us-central1-swami-ji-matka-acf76.cloudfunctions.net/paymentProxy';
              const checkUrl = depositSettings.imb_api_url?.replace('create-order', 'check-order-status') || 'https://secure-stage.imb.org.in/api/check-order-status';
              
              const response = await fetch(proxyUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  url: checkUrl, 
                  payload: {
                    user_token: depositSettings.imb_access_token || '61559044c37f7e99485353c294cd74eb',
                    order_id: orderIdParam
                  },
                  useFormEncoding: true
                })
              });

              const result = await response.json();
              if (result && (result.status === 'COMPLETED' || result.status === 'SUCCESS')) {
                const amt = Number(result.result?.amount || urlAmount);
                const userRef = doc(db, "users", userUid);
                const userSnap = await transaction.get(userRef);
                
                if (!userSnap.exists()) return;

                // 1. Update Balance
                transaction.update(userRef, { 
                  wallet_balance: (userSnap.data().wallet_balance || 0) + amt 
                });

                // 2. Create Record
                transaction.set(depositRef, {
                  userId: userUid,
                  amount: amt,
                  method: 'IMB Gateway',
                  status: 'approved',
                  created_at: serverTimestamp(),
                  txnId: txnIdKey,
                  gatewayOrderId: orderIdParam,
                  note: 'Verified IMB Redirect'
                });

                setImbSuccessAmount(amt);
                setShowImbSuccess(true);
                setTimeout(() => setShowImbSuccess(false), 3000);
              }
            });
          } catch (err) {
            console.error("IMB Verification failed:", err);
          }
        };
        verifyIMB();
      } else if (urlAmount && !gateway) {
        // Legacy fallback
        const amt = parseFloat(urlAmount);
        setImbSuccessAmount(amt);
        setShowImbSuccess(true);
        
        const userRef = doc(db, "users", userUid);
        updateDoc(userRef, { wallet_balance: increment(amt) }).then(() => {
          addDoc(collection(db, "deposits"), {
            userId: userUid,
            amount: amt,
            method: 'IMB UPI',
            status: 'approved',
            created_at: serverTimestamp(),
            note: 'Legacy Redirect Deposit'
          });
        });

        setTimeout(() => setShowImbSuccess(false), 3000);
      }
    }

    return () => unsub();
  }, [userUid]);

  // Handle URL Actions (Direct Deposit/Withdrawal)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    if (action === 'deposit') {
      navigate('/deposit');
    } else if (action === 'withdrawal') {
      navigate('/withdrawal');
    }
  }, [window.location.search]);

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
            <CreditCard size={10} />
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
            <button className="funds-action-btn deposit" onClick={() => navigate('/deposit')} style={{width: '100%', whiteSpace: 'nowrap'}}>
              <Banknote size={16} /> DEPOSIT
            </button>
          </div>
          <div style={{flex: '1 1 0%', minWidth: 0}}>
            <div style={{textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '5px', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>पैसे निकालें / Min ₹500</div>
            <button className="funds-action-btn withdrawal" onClick={() => navigate('/withdrawal')} style={{width: '100%', whiteSpace: 'nowrap'}}>
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
    </div>
  );
};

export default FundsPage;
