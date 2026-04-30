import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Send, 
  Database, 
  Users as UsersIcon, 
  CheckCircle, 
  ArrowUpCircle, 
  Settings as SettingsIcon,
  Search,
  ChevronRight,
  Menu,
  X,
  Lock,
  ArrowDownCircle,
  AlertCircle,
  History,
  Bell,
  Trash2
} from 'lucide-react';
import { auth, db, firebaseConfig } from '../firebase';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  where,
  getDocs,
  setDoc,
  limit,
  increment,
  getDoc,
  runTransaction,
  writeBatch
} from "firebase/firestore";
import './admin.css';

const secondaryApp = getApps().find(a => a.name === 'Secondary') || initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    // Listen for new notifications
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const latest = snapshot.docs[0].data();
        const lastRead = localStorage.getItem('lastReadNotificationAdmin') || 0;
        const latestTime = latest.createdAt?.toMillis?.() || Date.now();
        if (latestTime > Number(lastRead)) {
          setHasUnread(true);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const menuItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'Add Game', label: 'Add Game', icon: <PlusCircle size={20} /> },
    { id: 'Result Publish', label: 'Result Publish', icon: <Send size={20} /> },
    { id: 'View Game Data', label: 'View Game Data', icon: <Database size={20} /> },
    { id: 'Users', label: 'Users', icon: <UsersIcon size={20} /> },
    { id: 'Deposit Setting', label: 'Deposit Setting', icon: <CheckCircle size={20} /> },
    { id: 'Deposit', label: 'Deposit', icon: <ArrowUpCircle size={20} /> },
    { id: 'Withdrawal', label: 'Withdrawal', icon: <ArrowDownCircle size={20} /> },
    { id: 'Transactions', label: 'Transactions', icon: <History size={20} /> },
    { id: 'Banner Settings', label: 'Banner Settings', icon: <PlusCircle size={20} /> },
    { id: 'Notifications', label: 'Notifications', icon: <Bell size={20} />, badge: hasUnread },
    { id: 'Market Settings', label: 'Market Settings', icon: <PlusCircle size={20} /> },
    { id: 'Setting', label: 'Setting', icon: <SettingsIcon size={20} /> },
  ];
  const [games, setGames] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form States for Add Game
  const [gameTitle, setGameTitle] = useState('');
  const [openTime, setOpenTime] = useState('');
  const [closeTime, setCloseTime] = useState('');
  const [marketNames, setMarketNames] = useState([]);
  const [newMarketName, setNewMarketName] = useState('');
  const [isAddingNewName, setIsAddingNewName] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [gameSuccessMsg, setGameSuccessMsg] = useState('');
  const [gameToDelete, setGameToDelete] = useState(null);

  // Form States for Add User
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [userSuccessMsg, setUserSuccessMsg] = useState('');
  const [userErrorMsg, setUserErrorMsg] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [showAddUserPopup, setShowAddUserPopup] = useState(false);

  // Deposit Setting States
  const [upiId, setUpiId] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [qrFile, setQrFile] = useState(null);
  const [isSavingDeposit, setIsSavingDeposit] = useState(false);
  const [depositSuccessMsg, setDepositSuccessMsg] = useState('');
  const [depositErrorMsg, setDepositErrorMsg] = useState('');
  const [imbAccessToken, setImbAccessToken] = useState('');
  const [imbApiUrl, setImbApiUrl] = useState('');
  const [upiGatewayId, setUpiGatewayId] = useState('');
  const [upiGatewayUrl, setUpiGatewayUrl] = useState('');
  const [activePaymentMethod, setActivePaymentMethod] = useState('MANUAL'); // MANUAL, IMB, UPI_GATEWAY
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [viewingUser, setViewingUser] = useState(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);

  // Deposit Approval States
  const [depositRequests, setDepositRequests] = useState([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [viewingScreenshot, setViewingScreenshot] = useState(null);
  const [viewingWithdrawal, setViewingWithdrawal] = useState(null); // stores the full withdrawal object
  const [viewingWithdrawalKyc, setViewingWithdrawalKyc] = useState(null); // stores the KYC details for the viewed request
  const [isProcessingApproval, setIsProcessingApproval] = useState(null);

  // Admin Security States
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(
    JSON.parse(sessionStorage.getItem('adminUser')) || null
  );
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Settings States
  const [settingUsername, setSettingUsername] = useState('');
  const [settingPassword, setSettingPassword] = useState('');
  const [settingSuccess, setSettingSuccess] = useState('');
  const [isEditingCredentials, setIsEditingCredentials] = useState(false);
  const [isPublishingResult, setIsPublishingResult] = useState(false);
  const [viewingGameDetails, setViewingGameDetails] = useState(null);
  const [viewingGameBetsData, setViewingGameBetsData] = useState(null);
  const [bidsAnalyticsData, setBidsAnalyticsData] = useState(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [dashboardTimeFilter, setDashboardTimeFilter] = useState('today');
  const [filteredDashboardStats, setFilteredDashboardStats] = useState({
    deposits: 0,
    withdrawals: 0,
    newUsers: 0,
    totalDepCount: 0,
    totalWithCount: 0,
    allTimeDeposits: 0,
    allTimeWithdrawals: 0,
    allTimeDepCount: 0,
    allTimeWithCount: 0,
    isLoading: true
  });
  
  // Social Settings
  const [settingWhatsapp, setSettingWhatsapp] = useState('');
  const [settingTelegram, setSettingTelegram] = useState('');
  const [isEditingSocial, setIsEditingSocial] = useState(false);
  const [socialSuccess, setSocialSuccess] = useState('');

  // Notification States
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [isPublishingNotif, setIsPublishingNotif] = useState(false);
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [manualTxAmt, setManualTxAmt] = useState('');
  const [manualTxType, setManualTxType] = useState('NONE'); // NONE, DEPOSIT, WITHDRAW
  const [isManualTxLoading, setIsManualTxLoading] = useState(false);

  // Banner States
  const [bannerUrls, setBannerUrls] = useState(['', '', '']);
  const [bannerFiles, setBannerFiles] = useState([null, null, null]);
  const [isSavingBanners, setIsSavingBanners] = useState(false);
  const [bannerSuccess, setBannerSuccess] = useState('');

  // Market States
  const [markets, setMarkets] = useState([]);
  const [isSavingMarket, setIsSavingMarket] = useState(false);
  const [marketSuccess, setMarketSuccess] = useState('');

  // Selective Result Publish States
  const [resTitle, setResTitle] = useState('');
  const [resDate, setResDate] = useState('');
  const [resNum, setResNum] = useState('');
  const [resSuccess, setResSuccess] = useState('');

  // Nuclear Reset State
  const [nuclearStep, setNuclearStep] = useState(0); 
  const [isResetting, setIsResetting] = useState(false);

  // Rollback State
  const [isRollingBack, setIsRollingBack] = useState(null);

  useEffect(() => {
    if (isAdminLoggedIn) {
      setSettingUsername(isAdminLoggedIn.username);
      setSettingPassword(isAdminLoggedIn.password);
    }
  }, [isAdminLoggedIn]);

  // Fetch Market Names Library
  useEffect(() => {
    const q = query(collection(db, "market_names"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const names = snapshot.docs.map(doc => doc.data().name);
      setMarketNames(names);
    });
    return () => unsubscribe();
  }, [isAdminLoggedIn]);

  // Fetch Games for Admin View
  useEffect(() => {
    if (!isAdminLoggedIn) return;
    const q = query(collection(db, "games"), orderBy("title", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const gamesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGames(gamesData);
    });
    return () => unsubscribe();
  }, [isAdminLoggedIn]);

  // Fetch Users for Admin View
  useEffect(() => {
    if (!isAdminLoggedIn) return;
    const q = query(collection(db, "users"), orderBy("created_at", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      setUsersList(data);
    });
    return () => unsubscribe();
  }, [isAdminLoggedIn]);

  useEffect(() => {
    if (!isAdminLoggedIn) return;
    const q = query(collection(db, "deposits"), orderBy("created_at", "desc"), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDepositRequests(docs);
    });
    return () => unsubscribe();
  }, [isAdminLoggedIn]);

  // Fetch Withdrawal Requests
  useEffect(() => {
    if (!isAdminLoggedIn) return;
    const q = query(collection(db, "withdrawals"), orderBy("created_at", "desc"), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWithdrawalRequests(docs);
    });
    return () => unsubscribe();
  }, [isAdminLoggedIn]);

  // Fetch Game Data Analytics
  useEffect(() => {
    if (!viewingGameBetsData) return;
    const fetchAnalytics = async () => {
      setIsLoadingAnalytics(true);
      try {
        const q = query(collection(db, 'bets'), where('gameId', '==', viewingGameBetsData.id));
        const snap = await getDocs(q);
        
        let jodi = {};
        let andar = {};
        let bahar = {};

        snap.forEach(doc => {
          const bid = doc.data();
          bid.items.forEach(item => {
            const amt = Number(item.amount) || 0;
            if (['JODI', 'CROSSING', 'COPY PASTE'].includes(item.type)) {
               jodi[item.number] = (jodi[item.number] || 0) + amt;
            } else if (item.type === 'ANDAR') {
               andar[item.number] = (andar[item.number] || 0) + amt;
            } else if (item.type === 'BAHAR') {
               bahar[item.number] = (bahar[item.number] || 0) + amt;
            }
          });
        });
        
        // Sort keys alphanumerically
        const sortObj = (obj) => Object.keys(obj).sort().reduce((res, key) => (res[key] = obj[key], res), {});
        setBidsAnalyticsData({ jodi: sortObj(jodi), andar: sortObj(andar), bahar: sortObj(bahar) });
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setIsLoadingAnalytics(false);
      }
    };
    fetchAnalytics();
  }, [viewingGameBetsData]);

  // Fetch Dashboard Filtered Stats
  useEffect(() => {
    if (!isAdminLoggedIn) return;
    const fetchFilteredStats = async () => {
      setFilteredDashboardStats(prev => ({...prev, isLoading: true}));
      try {
        const now = new Date();
        let startDate = new Date();
        startDate.setHours(0,0,0,0);

        if (dashboardTimeFilter === 'yesterday') {
          startDate.setDate(startDate.getDate() - 1);
          now.setDate(now.getDate() - 1);
          now.setHours(23,59,59,999);
        } else if (dashboardTimeFilter === 'this_week') {
          startDate.setDate(startDate.getDate() - startDate.getDay()); 
        } else if (dashboardTimeFilter === 'this_month') {
          startDate.setDate(1); 
        }

        // 1. Fetch Filtered Users
        const usersQ = query(collection(db, 'users'), where('created_at', '>=', startDate), where('created_at', '<=', now));
        const usersSnap = await getDocs(usersQ);
        const newUsers = usersSnap.size;

        // 2. Fetch Filtered Deposits (Approved)
        const depQ = query(collection(db, 'deposits'), where('created_at', '>=', startDate), where('created_at', '<=', now), where('status', '==', 'approved'));
        const depSnap = await getDocs(depQ);
        let totalDep = 0;
        depSnap.forEach(d => totalDep += Number(d.data().amount) || 0);

        // 3. Fetch Filtered Withdrawals (Approved)
        const withQ = query(collection(db, 'withdrawals'), where('created_at', '>=', startDate), where('created_at', '<=', now));
        const withSnap = await getDocs(withQ);
        let totalWith = 0;
        withSnap.forEach(w => {
           const d = w.data();
           if(d.status === 'approved' || d.status === 'paid') totalWith += Number(d.amount) || 0;
        });

        // 4. ALL-TIME STATS (Live counts and sums)
        const allDepQ = query(collection(db, 'deposits'), where('status', '==', 'approved'));
        const allDepSnap = await getDocs(allDepQ);
        let allTimeDeposits = 0;
        allDepSnap.forEach(d => allTimeDeposits += Number(d.data().amount) || 0);

        const allWithQ = query(collection(db, 'withdrawals'), where('status', 'in', ['approved', 'paid']));
        const allWithSnap = await getDocs(allWithQ);
        let allTimeWithdrawals = 0;
        allWithSnap.forEach(w => allTimeWithdrawals += Number(w.data().amount) || 0);

        setFilteredDashboardStats({ 
          deposits: totalDep, 
          withdrawals: totalWith, 
          newUsers, 
          allTimeDeposits, 
          allTimeWithdrawals,
          allTimeDepCount: allDepSnap.size,
          allTimeWithCount: allWithSnap.size,
          isLoading: false 
        });
      } catch (err) {
        console.error("Error fetching dashboard stats", err);
        setFilteredDashboardStats(prev => ({...prev, isLoading: false}));
      }
    };
    fetchFilteredStats();
  }, [isAdminLoggedIn, dashboardTimeFilter]);

  // Fetch Deposit Settings
  useEffect(() => {
    if (!isAdminLoggedIn) return;
    const unsub = onSnapshot(doc(db, "settings", "deposit"), (s) => {
      if (s.exists()) {
        const d = s.data();
        setUpiId(d.upi_id || '');
        setQrCodeUrl(d.qr_url || '');
      }
    });

    const unsubSocial = onSnapshot(doc(db, "settings", "social"), (s) => {
      if (s.exists()) {
        const d = s.data();
        setSettingWhatsapp(d.whatsapp || '');
        setSettingTelegram(d.telegram || '');
      }
    });

    // Fetch Deposit Settings
    const unsubDeposit = onSnapshot(doc(db, "settings", "deposit"), (s) => {
      if (s.exists()) {
        const data = s.data();
        setUpiId(data.upi_id || '');
        setQrCodeUrl(data.qr_url || '');
        setImbAccessToken(data.imb_token || '');
        setImbApiUrl(data.imb_api_url || '');
        setUpiGatewayId(data.upi_gateway_id || '');
        setUpiGatewayUrl(data.upi_gateway_url || '');
        setActivePaymentMethod(data.active_method || 'MANUAL');
      }
    });
    return () => { unsubSocial(); unsubDeposit(); };
  }, [isAdminLoggedIn]);

  // Fetch notifications for admin list
  useEffect(() => {
    if (!isAdminLoggedIn) return;
    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(20));
    const unsub = onSnapshot(q, (snapshot) => {
      setAdminNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [isAdminLoggedIn]);

  // Fetch current banners
  useEffect(() => {
    if (!isAdminLoggedIn) return;
    const unsub = onSnapshot(doc(db, "settings", "banners"), (s) => {
      if (s.exists()) {
        setBannerUrls(s.data().urls || ['', '', '']);
      }
    });
    return () => unsub();
  }, [isAdminLoggedIn]);

  // Fetch Game Markets
  useEffect(() => {
    if (!isAdminLoggedIn) return;
    const q = query(collection(db, "game_markets"), orderBy("title", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMarkets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [isAdminLoggedIn]);

  const handleUpdateSocialSettings = async (e) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, "settings", "social"), {
        whatsapp: settingWhatsapp,
        telegram: settingTelegram
      }, { merge: true });
      setSocialSuccess('Social links updated successfully!');
      setTimeout(() => setSocialSuccess(''), 3000);
      setIsEditingSocial(false);
    } catch (err) {
      console.error("Error updating social links", err);
    }
  };

  const handlePublishNotification = async (e) => {
    e.preventDefault();
    if (!notifTitle || !notifMessage) return;
    setIsPublishingNotif(true);
    try {
      // Save to Firestore - This will trigger the Cloud Function automatically
      await addDoc(collection(db, "notifications"), {
        title: notifTitle,
        message: notifMessage,
        createdAt: serverTimestamp(),
        author: isAdminLoggedIn.username
      });

      setNotifTitle('');
      setNotifMessage('');
      alert('✓ Notification Published! The Cloud is now pushing it to all users...');
    } catch (err) {
      console.error("Error publishing notification", err);
      alert('Error: ' + err.message);
    } finally {
      setIsPublishingNotif(false);
    }
  };

  const handleSaveBannerSettings = async (e) => {
    e.preventDefault();
    setIsSavingBanners(true);
    try {
      let finalUrls = [...bannerUrls];

      // Upload any new files selected
      for (let i = 0; i < 3; i++) {
        if (bannerFiles[i]) {
          const formData = new FormData();
          formData.append('image', bannerFiles[i]);
          const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
          });
          const resData = await response.json();
          if (resData.success) {
            finalUrls[i] = resData.data.url;
          }
        }
      }

      await setDoc(doc(db, "settings", "banners"), {
        urls: finalUrls,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setBannerSuccess('Banners Updated Successfully!');
      setBannerFiles([null, null, null]);
      setTimeout(() => setBannerSuccess(''), 3000);
    } catch (err) {
      console.error("Error saving banners", err);
      alert("Failed to save banners: " + err.message);
    } finally {
      setIsSavingBanners(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    
    try {
      const q = query(collection(db, 'admins'), where('username', '==', loginUsername));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        // Smart initialization for the first ever login attempt
        if ((loginUsername === 'scalebetter' && loginPassword === 'scaleadmin') || 
            (loginUsername === 'shardabhai' && loginPassword === '2323sharda')) {
          
          const adminRef1 = doc(collection(db, 'admins'));
          await setDoc(adminRef1, { username: 'scalebetter', password: 'scaleadmin', role: 'superadmin' });
          const adminRef2 = doc(collection(db, 'admins'));
          await setDoc(adminRef2, { username: 'shardabhai', password: '2323sharda', role: 'admin' });
          
          const matchedUser = loginUsername === 'scalebetter' 
            ? { id: adminRef1.id, username: 'scalebetter', role: 'superadmin', password: 'scaleadmin' }
            : { id: adminRef2.id, username: 'shardabhai', role: 'admin', password: '2323sharda' };

          sessionStorage.setItem('adminUser', JSON.stringify(matchedUser));
          setIsAdminLoggedIn(matchedUser);
          setIsLoggingIn(false);
          return;
        } else {
          setLoginError('Invalid Username or Password');
          setIsLoggingIn(false);
          return;
        }
      }

      let matchedUser = null;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.password === loginPassword) {
          matchedUser = { id: doc.id, ...data };
        }
      });

      if (matchedUser) {
        sessionStorage.setItem('adminUser', JSON.stringify(matchedUser));
        setIsAdminLoggedIn(matchedUser);
      } else {
        setLoginError('Invalid Username or Password');
      }
    } catch (err) {
      console.error(err);
      setLoginError('Error connecting to database');
    }
    setIsLoggingIn(false);
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    if (!isAdminLoggedIn) return;
    try {
      const adminRef = doc(db, 'admins', isAdminLoggedIn.id);
      await updateDoc(adminRef, {
        username: settingUsername,
        password: settingPassword
      });
      const updatedUser = { ...isAdminLoggedIn, username: settingUsername, password: settingPassword };
      sessionStorage.setItem('adminUser', JSON.stringify(updatedUser));
      setIsAdminLoggedIn(updatedUser);
      setSettingSuccess('Credentials Updated Successfully!');
      setTimeout(() => setSettingSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      alert('Error updating credentials');
    }
  };
  const handleApproveDeposit = async (request) => {
    if (request.status !== 'pending') return;
    setIsProcessingApproval(request.id);
    
    try {
      // 1. Update User Balance (Atomic Increment)
      const userRef = doc(db, "users", request.userId);
      await updateDoc(userRef, {
        wallet_balance: increment(request.amount)
      });
      
      // 2. Mark Deposit as Approved
      const depositRef = doc(db, "deposits", request.id);
      await updateDoc(depositRef, {
        status: 'approved',
        processed_at: serverTimestamp(),
        processed_by: isAdminLoggedIn?.username || 'admin'
      });
      
      console.log("[DEP_APPROVE] Success for ID:", request.id);
    } catch (err) {
      console.error("[DEP_APPROVE] Error:", err);
      alert("Failed to approve: " + err.message);
    } finally {
      setIsProcessingApproval(null);
    }
  };

  const handleRejectDeposit = async (request) => {
    if (request.status !== 'pending') return;
    if (!window.confirm("Are you sure you want to REJECT this deposit request?")) return;
    
    setIsProcessingApproval(request.id);
    try {
      const depositRef = doc(db, "deposits", request.id);
      await updateDoc(depositRef, {
        status: 'rejected',
        processed_at: serverTimestamp(),
        processed_by: isAdminLoggedIn?.username || 'admin'
      });
    } catch (err) {
      console.error("[DEP_REJECT] Error:", err);
      alert("Failed to reject: " + err.message);
    } finally {
      setIsProcessingApproval(null);
    }
  };

  const handleApproveWithdrawal = async (request) => {
    if (request.status !== 'pending') return;
    setIsProcessingApproval(request.id);
    try {
      const withdrawalRef = doc(db, "withdrawals", request.id);
      await updateDoc(withdrawalRef, {
        status: 'approved',
        processed_at: serverTimestamp(),
        processed_by: isAdminLoggedIn?.username || 'admin'
      });
      alert("Withdrawal Approved!");
      setViewingWithdrawal(null);
    } catch (err) {
      console.error("[WTH_APPROVE] Error:", err);
      alert("Failed to approve: " + err.message);
    } finally {
      setIsProcessingApproval(null);
    }
  };

  const handleRejectWithdrawal = async (request) => {
    console.log("[WTH_REJECT] Clicked for:", request?.id);
    
    if (!request || !request.id) {
      alert("Error: Invalid Request Data");
      return;
    }

    if (request.status !== 'pending') {
      alert(`This request is already ${request.status}`);
      return;
    }

    const userId = request.userId || request.uid;
    const amount = parseFloat(request.amount);

    if (!userId || isNaN(amount)) {
      alert("Error: Critical data missing (UserID or Amount).");
      return;
    }

    // Removed window.confirm to avoid silent bypasses
    setIsProcessingApproval(request.id);
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, "users", userId);
        const withdrawalRef = doc(db, "withdrawals", request.id);
        
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) {
          throw "User document does not exist!";
        }

        // Apply Refund
        transaction.update(userRef, {
          wallet_balance: increment(amount)
        });

        // Update Withdrawal Status
        transaction.update(withdrawalRef, {
          status: 'rejected',
          processed_at: serverTimestamp(),
          processed_by: isAdminLoggedIn?.username || 'admin',
          rejection_reason: 'Admin rejected'
        });
      });
      
      alert(`SUCCESS: ₹${amount} has been refunded.`);
      setViewingWithdrawal(null);
    } catch (err) {
      console.error("[WTH_REJECT] Error:", err);
      alert("FAILED: " + (err.message || err));
    } finally {
      setIsProcessingApproval(null);
    }
  };

  const handleViewWithdrawalDetails = async (request) => {
    setViewingWithdrawal(request);
    
    // If the request already has payout details (new system), we don't need to fetch separate KYC docs
    if (request.payoutMethod) {
       setViewingWithdrawalKyc('direct'); // Mark as direct payout info
       return;
    }

    setViewingWithdrawalKyc(null); // Loading state for legacy requests
    try {
      const kycSnap = await getDoc(doc(db, "bank_details", request.userId));
      if (kycSnap.exists()) {
        setViewingWithdrawalKyc(kycSnap.data());
      } else {
        setViewingWithdrawalKyc('none');
      }
    } catch (err) {
      console.error("KYC Fetch Error:", err);
    }
  };

  const getUserInfo = (uid) => {
    const user = usersList.find(u => u.uid === uid);
    return user ? `${user.name} (${user.phone})` : "Unknown User";
  };

  const handleAddMarketName = async () => {
    if (!newMarketName.trim()) return;
    try {
      const nameRef = doc(db, "market_names", newMarketName.toUpperCase());
      await setDoc(nameRef, { name: newMarketName.toUpperCase() });
      setNewMarketName('');
      setIsAddingNewName(false);
      setGameTitle(newMarketName.toUpperCase());
      setSaveSuccessMsg('Name saved successfully!');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Error adding market name:', err);
    }
  };

   const handleCreateGame = async (e) => {
    e.preventDefault();
    if (!gameTitle || !openTime || !closeTime) return;
    setLoading(true);
    try {
      // Auto-fetch the previous result (Circle 1) based on the last game with the same title
      const previousGames = games
        .filter(g => g.title === gameTitle && g.number2 && g.number2 !== 'XX')
        .sort((a, b) => {
          const timeA = a.created_at?.toMillis?.() || 0;
          const timeB = b.created_at?.toMillis?.() || 0;
          return timeB - timeA;
        });
      
      let previousWinningNumber;
      if (previousGames.length > 0) {
        previousWinningNumber = previousGames[0].number2;
      } else {
        previousWinningNumber = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      }

      await addDoc(collection(db, "games"), {
        title: gameTitle,
        openTime: openTime,
        closeTime: closeTime,
        number1: previousWinningNumber,
        number2: 'XX',
        status: 'open',
        created_at: serverTimestamp()
      });
      setGameTitle('');
      setOpenTime('');
      setCloseTime('');
      setGameSuccessMsg('✓ Game Created Successfully! It is now live on the Home Page.');
      setTimeout(() => setGameSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error adding game:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateResult = async (game, num2, explicitId = null) => {
    if (isPublishingResult) return;
    if (!num2 || num2.length !== 2) {
      alert("Please enter a valid 2-digit winning number (e.g. 05)");
      return;
    }

    const gameId = explicitId || game.id;
    // Time Check
    const now = new Date();
    const closeStr = game.closeTime;
    const openStr = game.openTime;
    const createdAt = game.created_at;

    const openTimePart = openStr.includes('T') ? openStr.split('T')[1].substring(0, 5) : openStr;
    const closeTimePart = closeStr.includes('T') ? closeStr.split('T')[1].substring(0, 5) : closeStr;

    const parseMinutes = (s) => {
      const [h, m] = s.split(':').map(Number);
      return h * 60 + m;
    };

    const openMin = parseMinutes(openTimePart);
    const closeMin = parseMinutes(closeTimePart);

    let targetDate = new Date();
    if (createdAt && createdAt.toDate) {
      targetDate = new Date(createdAt.toDate());
      const [cH, cM] = closeTimePart.split(':').map(Number);
      targetDate.setHours(cH, cM, 0, 0);

      if (openMin > closeMin) {
        targetDate.setDate(targetDate.getDate() + 1);
      }

      if (targetDate < createdAt.toDate()) {
        targetDate.setDate(targetDate.getDate() + 1);
      }
    } else {
      const [cH, cM] = closeTimePart.split(':').map(Number);
      targetDate.setHours(cH, cM, 0, 0);
    }

    if (targetDate > now) {
      alert("This game has not ended yet. You can only publish the result after the Close Time passes.");
      return;
    }

    setIsPublishingResult(gameId);
    try {
      const andarStr = num2.charAt(0);
      const baharStr = num2.charAt(1);

      // 1. Fetch all pending bets for this game
      const betsRef = collection(db, 'bets');
      const q = query(betsRef, where('gameId', '==', gameId), where('status', '==', 'pending'));
      const betsSnap = await getDocs(q);

      const winningUsers = {}; // uid -> { totalWon: 0, betDocs: [] }
      const losingBets = [];

      let gameTotalPlaced = 0;
      let gameTotalWon = 0;

      betsSnap.forEach(docSnap => {
        const betData = docSnap.data();
        let betTotalWon = 0;
        
        gameTotalPlaced += Number(betData.totalAmount || 0);

        betData.items.forEach(item => {
          if (['JODI', 'CROSSING', 'COPY PASTE'].includes(item.type)) {
            if (item.number === num2) betTotalWon += (item.amount * 95);
          } else if (item.type === 'ANDAR') {
            if (item.number === andarStr) betTotalWon += (item.amount * 9.5);
          } else if (item.type === 'BAHAR') {
            if (item.number === baharStr) betTotalWon += (item.amount * 9.5);
          }
        });

        if (betTotalWon > 0) {
          gameTotalWon += betTotalWon;
          if (!winningUsers[betData.uid]) {
            winningUsers[betData.uid] = { totalWon: 0, betDocs: [] };
          }
          winningUsers[betData.uid].totalWon += betTotalWon;
          winningUsers[betData.uid].betDocs.push({ id: docSnap.id, wonAmount: betTotalWon });
        } else {
          losingBets.push(docSnap.id);
        }
      });

      // 2. Process Winning Users securely via Transactions
      for (const [uid, winData] of Object.entries(winningUsers)) {
        const userRef = doc(db, 'users', uid);
        await runTransaction(db, async (transaction) => {
          const userSnap = await transaction.get(userRef);
          if (userSnap.exists()) {
             const currentBal = userSnap.data().wallet_balance || 0;
             transaction.update(userRef, { wallet_balance: currentBal + winData.totalWon });
             
             winData.betDocs.forEach(bet => {
               const bRef = doc(db, 'bets', bet.id);
               transaction.update(bRef, {
                 status: 'win',
                 wonAmount: bet.wonAmount,
                 winningNumber: num2,
                 settledAt: serverTimestamp()
               });
             });
          }
        });
      }

      // 3. Mark losing bets in batches
      let batch = writeBatch(db);
      let batchCount = 0;
      for (const betId of losingBets) {
        batch.update(doc(db, 'bets', betId), { status: 'loss', winningNumber: num2, settledAt: serverTimestamp() });
        batchCount++;
        if (batchCount === 500) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      }
      if (batchCount > 0) await batch.commit();

      // 4. Update Game Status
      const gameRef = doc(db, "games", gameId);
      await updateDoc(gameRef, {
        number2: num2,
        status: 'completed',
        totalPlaced: gameTotalPlaced,
        totalWon: gameTotalWon,
        result_published_at: serverTimestamp()
      });

      // 5. Send Notification to all users
      try {
        await addDoc(collection(db, 'notifications'), {
          title: `📢 Result Out: ${game.title} ( ${num2} )`,
          message: `The winning number for ${game.title} is 【 ${num2} 】. Today's result is now live on the chart. Congratulations to all winners!`,
          createdAt: serverTimestamp(),
          type: 'result',
          gameId: gameId
        });
      } catch (notifErr) {
        console.error('Notification failed to send:', notifErr);
      }

      setResSuccess('✓ Result Published & Bets Settled!');
    } catch (err) {
      console.error('Error publishing result:', err);
      alert('Failed to publish result: ' + (err.message || err));
    } finally {
      setIsPublishingResult(false);
    }
  };

  const handleRollbackResult = async (game) => {
    if (!window.confirm(`⚠️ DANGER: Are you sure you want to Backup/Rollback results for ${game.title}? \n\nThis will deduct ₹${game.totalWon || 0} from winning users and reset all bets to 'Pending'.`)) {
      return;
    }

    const gameId = game.id;
    setIsRollingBack(gameId);

    try {
      // 1. Find all won bets to deduct balance
      const betsRef = collection(db, 'bets');
      const q = query(betsRef, where('gameId', '==', gameId));
      const betsSnap = await getDocs(q);
      
      const winners = []; 
      const allBetIds = [];

      betsSnap.forEach(snap => {
        const data = snap.data();
        allBetIds.push(snap.id);
        if (data.status === 'win' && data.wonAmount > 0) {
          winners.push({ uid: data.uid, amount: data.wonAmount });
        }
      });

      // 2. Perform Wallet Deductions
      for (const winner of winners) {
        const userRef = doc(db, 'users', winner.uid);
        await runTransaction(db, async (transaction) => {
          const userSnap = await transaction.get(userRef);
          if (userSnap.exists()) {
            const currentBal = userSnap.data().wallet_balance || 0;
            transaction.update(userRef, { wallet_balance: currentBal - winner.amount });
          }
        });
      }

      // 3. Reset Bets to Pending
      const batch = writeBatch(db);
      allBetIds.forEach(id => {
        batch.set(doc(db, 'bets', id), {
          status: 'pending',
          wonAmount: 0,
          winningNumber: deleteField?.() || null, // Clean up winning markers
          settledAt: deleteField?.() || null,
        }, { merge: true });
      });
      await batch.commit();

      // 4. Reset Game Document
      await updateDoc(doc(db, 'games', gameId), {
        status: 'open',
        number2: deleteField?.() || null,
        totalWon: 0,
        totalPlaced: 0
      });

      alert("✓ Money Backed Up successfully! The game is now back to 'Awaiting Result'.");
    } catch (err) {
      console.error(err);
      alert("Rollback failed: " + err.message);
    } finally {
      setIsRollingBack(null);
    }
  };

  const handleDeleteGame = async (gameId) => {
    try {
      await deleteDoc(doc(db, "games", gameId));
      setGameToDelete(null);
    } catch (err) {
      console.error('Error deleting game:', err);
      alert('Failed to delete game: ' + err.message);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setUserErrorMsg('');
    if (!newUserName || !newUserPhone || !newUserPassword) return;
    setIsCreatingUser(true);
    try {
      const virtualEmail = `${newUserPhone}@swamiji.com`;
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, virtualEmail, newUserPassword);
      const user = userCredential.user;
      
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: newUserName,
        phone: newUserPhone,
        wallet_balance: 0,
        role: 'user',
        status: 'active',
        created_at: serverTimestamp()
      });
      
      setNewUserName('');
      setNewUserPhone('');
      setNewUserPassword('');
      setUserSuccessMsg('✓ User successfully created!');
      setTimeout(() => setUserSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error creating user:', err);
      if (err.code === 'auth/email-already-in-use') {
        setUserErrorMsg('Phone number already registered.');
      } else {
        setUserErrorMsg(err.message);
      }
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleAdminManualFundUpdate = async (userId, type) => {
    if (!manualTxAmt || parseFloat(manualTxAmt) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    const amount = parseFloat(manualTxAmt);
    setIsManualTxLoading(true);

    try {
      const userRef = doc(db, "users", userId);
      const incrementValue = type === 'DEPOSIT' ? amount : -amount;

      // 1. Update User Balance
      await updateDoc(userRef, {
        wallet_balance: increment(incrementValue)
      });

      // 2. Create History Record
      const collectionName = type === 'DEPOSIT' ? "deposits" : "withdrawals";
      const historyData = {
        userId: userId,
        amount: amount,
        created_at: serverTimestamp(),
        status: 'approved',
        remark: `Manual ${type} by Admin`,
        type: type.toLowerCase(),
        isManual: true,
        userName: viewingUser.name,
        userPhone: viewingUser.phone
      };

      await addDoc(collection(db, collectionName), historyData);

      // 3. Success notification
      setViewingUser(prev => ({
        ...prev,
        wallet_balance: (prev.wallet_balance || 0) + incrementValue
      }));
      setManualTxAmt('');
      setManualTxType('NONE');
      alert(`Successfully ${type === 'DEPOSIT' ? 'added' : 'deducted'} ₹${amount}`);
    } catch (err) {
      console.error("Manual transaction failed:", err);
      alert("Transaction failed: " + err.message);
    } finally {
      setIsManualTxLoading(false);
    }
  };

  const IMGBB_API_KEY = "700e2158aeb458374dfa76a696872280";

  const handleSaveManualPayment = async (e) => {
    if (e) e.preventDefault();
    setIsSavingDeposit(true);
    setDepositSuccessMsg('');
    setDepositErrorMsg('');

    try {
      let finalQrUrl = qrCodeUrl;
      if (qrFile) {
        const formData = new FormData();
        formData.append("image", qrFile);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
          method: "POST",
          body: formData
        });
        const imgData = await res.json();
        if (imgData.success) {
          finalQrUrl = imgData.data.url;
        }
      }
      
      await setDoc(doc(db, "settings", "deposit"), {
        upi_id: upiId,
        qr_url: finalQrUrl,
        updated_at: serverTimestamp(),
        last_updated_by: isAdminLoggedIn?.username || 'admin'
      }, { merge: true });
      
      setQrFile(null);
      setQrCodeUrl(finalQrUrl);
      setDepositSuccessMsg('✓ Manual UPI Settings updated independently!');
      setTimeout(() => setDepositSuccessMsg(''), 5000);
    } catch (err) {
      console.error("[MANUAL_SAVE] ERROR:", err);
      setDepositErrorMsg('FAILED: ' + (err.message || 'Check connection'));
    } finally {
      setIsSavingDeposit(false);
    }
  };

  const handleSaveIMBGateway = async (e) => {
    if (e) e.preventDefault();
    setIsSavingDeposit(true);
    setDepositSuccessMsg('');
    setDepositErrorMsg('');

    try {
      await setDoc(doc(db, "settings", "deposit"), {
        imb_access_token: imbAccessToken,
        imb_api_url: imbApiUrl || 'https://secure.imbpayment.in/',
        updated_at: serverTimestamp(),
        last_updated_by: isAdminLoggedIn?.username || 'admin'
      }, { merge: true });
      
      setDepositSuccessMsg('✓ IMB Gateway Settings updated independently!');
      setTimeout(() => setDepositSuccessMsg(''), 5000);
    } catch (err) {
      console.error("[IMB_SAVE] ERROR:", err);
      setDepositErrorMsg('FAILED: ' + (err.message || 'Check connection'));
    } finally {
      setIsSavingDeposit(false);
    }
  };

  const handleSaveUPIGateway = async (e) => {
    if (e) e.preventDefault();
    setIsSavingDeposit(true);
    setDepositSuccessMsg('');
    setDepositErrorMsg('');

    try {
      await setDoc(doc(db, "settings", "deposit"), {
        upi_gateway_id: upiGatewayId,
        upi_gateway_url: upiGatewayUrl,
        updated_at: serverTimestamp(),
        last_updated_by: isAdminLoggedIn?.username || 'admin'
      }, { merge: true });
      
      setDepositSuccessMsg('✓ UPI Gateway Settings updated independently!');
      setTimeout(() => setDepositSuccessMsg(''), 5000);
    } catch (err) {
      console.error("[UPI_GATEWAY_SAVE] ERROR:", err);
      setDepositErrorMsg('FAILED: ' + (err.message || 'Check connection'));
    } finally {
      setIsSavingDeposit(false);
    }
  };

  const handleSetActivePaymentMethod = async (method) => {
    setIsSavingDeposit(true);
    setDepositSuccessMsg('');
    setDepositErrorMsg('');

    try {
      await setDoc(doc(db, "settings", "deposit"), {
        active_method: method,
        updated_at: serverTimestamp(),
        last_updated_by: isAdminLoggedIn?.username || 'admin'
      }, { merge: true });
      
      setActivePaymentMethod(method);
      setDepositSuccessMsg(`✓ ${method} activated successfully!`);
      setTimeout(() => setDepositSuccessMsg(''), 5000);
    } catch (err) {
      console.error("[ACTIVE_METHOD_SAVE] ERROR:", err);
      setDepositErrorMsg('FAILED: ' + (err.message || 'Check connection'));
    } finally {
      setIsSavingDeposit(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        const pendingDeps = depositRequests.filter(r => r.status === 'pending');
        const pendingWiths = withdrawalRequests.filter(r => r.status === 'pending');
        const totalPendingDepAmt = pendingDeps.reduce((sum, req) => sum + (Number(req.amount) || 0), 0);
        const totalPendingWithAmt = pendingWiths.reduce((sum, req) => sum + (Number(req.amount) || 0), 0);
        
        return (
          <div className="admin-view">
            <h1>Dashboard Overview</h1>
            
            <h3 style={{marginTop: '20px', color: '#1B2559', borderBottom: '2px solid #EEE', paddingBottom: '10px'}}>Global Live Metrics</h3>
            <div className="stats-grid" style={{marginBottom: '30px'}}>
              <div className="stat-card" style={{background: '#E8EAF6'}}>
                <p>Total Customers</p>
                <h3 style={{color: '#3F51B5'}}>{usersList.length}</h3>
              </div>
              <div className="stat-card" style={{background: '#E8F5E9'}}>
                <p>Pending Deposits</p>
                <div style={{display: 'flex', alignItems: 'flex-end', gap: '10px'}}>
                  <h3 style={{color: '#2E7D32', margin: 0}}>{pendingDeps.length}</h3>
                  <span style={{color: '#4CAF50', fontWeight: 'bold', fontSize: '1.2rem', paddingBottom: '2px'}}>₹{totalPendingDepAmt}</span>
                </div>
              </div>
              <div className="stat-card" style={{background: '#FFEBEE'}}>
                <p>Pending Withdrawals</p>
                <div style={{display: 'flex', alignItems: 'flex-end', gap: '10px'}}>
                  <h3 style={{color: '#D32F2F', margin: 0}}>{pendingWiths.length}</h3>
                  <span style={{color: '#EF5350', fontWeight: 'bold', fontSize: '1.2rem', paddingBottom: '2px'}}>₹{totalPendingWithAmt}</span>
                </div>
              </div>
            </div>

            <h3 style={{marginTop: '20px', color: '#1B2559', borderBottom: '2px solid #EEE', paddingBottom: '10px'}}>All-Time Business Metrics</h3>
            <div className="stats-grid" style={{marginBottom: '30px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'}}>
              <div className="stat-card" style={{background: '#F0F4FF', border: '1px solid #D9E2FF'}}>
                <p style={{color: '#2B3674', fontWeight: 'bold'}}>Total Deposits (Approved)</p>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <h3 style={{color: '#2B3674', margin: 0}}>₹{filteredDashboardStats.allTimeDeposits}</h3>
                  <span style={{fontSize: '0.85rem', color: '#718096'}}>Qty: {filteredDashboardStats.allTimeDepCount}</span>
                </div>
              </div>
              <div className="stat-card" style={{background: '#FFF5F5', border: '1px solid #FFEBEB'}}>
                <p style={{color: '#9B2C2C', fontWeight: 'bold'}}>Total Withdrawals (Paid)</p>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <h3 style={{color: '#9B2C2C', margin: 0}}>₹{filteredDashboardStats.allTimeWithdrawals}</h3>
                  <span style={{fontSize: '0.85rem', color: '#718096'}}>Qty: {filteredDashboardStats.allTimeWithCount}</span>
                </div>
              </div>
              <div className="stat-card" style={{
                background: (filteredDashboardStats.allTimeDeposits - filteredDashboardStats.allTimeWithdrawals) >= 0 ? '#F0FFF4' : '#FFF5F5',
                border: '1px solid #C6F6D5'
              }}>
                <p style={{
                  color: (filteredDashboardStats.allTimeDeposits - filteredDashboardStats.allTimeWithdrawals) >= 0 ? '#276749' : '#9B2C2C', 
                  fontWeight: '900'
                }}>NET PROFIT / LOSS</p>
                <h3 style={{
                  color: (filteredDashboardStats.allTimeDeposits - filteredDashboardStats.allTimeWithdrawals) >= 0 ? '#276749' : '#9B2C2C', 
                  margin: 0
                }}>
                  ₹{filteredDashboardStats.allTimeDeposits - filteredDashboardStats.allTimeWithdrawals}
                </h3>
              </div>
            </div>

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '40px', borderBottom: '2px solid #EEE', paddingBottom: '10px'}}>
              <h3 style={{color: '#1B2559', margin: 0}}>Filtered Time Reports</h3>
              <select 
                value={dashboardTimeFilter} 
                onChange={e => setDashboardTimeFilter(e.target.value)}
                style={{padding: '8px 15px', borderRadius: '8px', border: '1px solid #CCC', fontSize: '1rem', fontWeight: 'bold', background: 'white', color: '#333', cursor: 'pointer', outline: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'}}
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
              </select>
            </div>

            {filteredDashboardStats.isLoading ? (
               <div style={{textAlign: 'center', padding: '40px', color: '#666', fontWeight: 'bold', fontSize: '1.2rem'}}>Calculating Data...</div>
            ) : (
              <div className="stats-grid" style={{marginTop: '20px'}}>
                <div className="stat-card" style={{border: '1px solid #E0E0E0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)'}}>
                  <p style={{color: '#666'}}>New Customers Added</p>
                  <h3 style={{color: '#1B2559'}}>{filteredDashboardStats.newUsers}</h3>
                </div>
                <div className="stat-card" style={{border: '1px solid #E0E0E0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)'}}>
                  <p style={{color: '#666'}}>Total Processed Deposits</p>
                  <h3 style={{color: '#2E7D32'}}>₹ {filteredDashboardStats.deposits}</h3>
                </div>
                <div className="stat-card" style={{border: '1px solid #E0E0E0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)'}}>
                  <p style={{color: '#666'}}>Total Processed Withdrawals</p>
                  <h3 style={{color: '#C62828'}}>₹ {filteredDashboardStats.withdrawals}</h3>
                </div>
                <div className="stat-card" style={{background: '#FFF3E0', border: '1px solid #FFE0B2'}}>
                  <p style={{color: '#E65100'}}>Admin P&L (Cashflow)</p>
                  <h3 style={{color: '#FF6F00'}}>₹ {filteredDashboardStats.deposits - filteredDashboardStats.withdrawals}</h3>
                </div>
              </div>
            )}

          </div>
        );
      case 'Withdrawal':
        return (
          <div className="admin-view">
            <h1>Withdrawal Requests</h1>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Amount</th>
                  <th>Balance</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {withdrawalRequests.map((req) => (
                  <tr key={req.id}>
                    <td>
                      <div style={{display: 'flex', flexDirection: 'column'}}>
                        <strong>{req.username}</strong>
                        <span style={{fontSize: '0.8rem', color: '#666'}}>{req.phone}</span>
                      </div>
                    </td>
                    <td style={{fontWeight: 'bold', color: '#D32F2F'}}>₹ {req.amount}</td>
                    <td>₹ {req.current_balance || 'N/A'}</td>
                    <td style={{fontSize: '0.85rem'}}>
                      {req.created_at?.toDate ? req.created_at.toDate().toLocaleString() : 'Just now'}
                    </td>
                    <td>
                      <span className={`status-badge ${req.status}`}>
                        {req.status}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="publish-btn" 
                        style={{background: '#4F46E5', fontSize: '12px'}}
                        onClick={() => handleViewWithdrawalDetails(req)}
                      >
                        VIEW
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {viewingWithdrawal && (
              <div className="popup-overlay" onClick={() => setViewingWithdrawal(null)}>
                <div className="popup-content" onClick={e => e.stopPropagation()} style={{maxWidth: '450px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                    <h2>Request Details</h2>
                    <button onClick={() => setViewingWithdrawal(null)} style={{background: 'none', border: 'none'}}><X /></button>
                  </div>

                  <div className="kyc-details-scroll" style={{maxHeight: '400px', overflowY: 'auto'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #eee'}}>
                      <strong>Withdrawal Amount:</strong>
                      <span style={{color: '#D32F2F', fontWeight: '900', fontSize: '1.2rem'}}>₹ {viewingWithdrawal.amount}</span>
                    </div>

                    <h4 style={{marginTop: '20px', borderBottom: '2px solid #ddd', paddingBottom: '10px', color: '#1B2559', display: 'flex', alignItems: 'center', gap: '8px'}}>
                       <ArrowDownCircle size={18} /> Payout Details
                    </h4>

                    {viewingWithdrawal.payoutMethod ? (
                      <div style={{background: '#F0F4FF', padding: '15px', borderRadius: '12px', marginTop: '10px'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                           <span style={{color: '#666'}}>Method:</span>
                           <strong style={{color: '#4F46E5'}}>{viewingWithdrawal.payoutMethod}</strong>
                        </div>
                        
                        {viewingWithdrawal.payoutMethod === 'Bank Account' ? (
                          <div style={{display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px', borderTop: '1px solid #DDE2F2'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between'}}>
                               <span style={{color: '#666'}}>Holder:</span>
                               <strong>{viewingWithdrawal.bankDetails?.holderName}</strong>
                            </div>
                            <div style={{display: 'flex', justifyContent: 'space-between'}}>
                               <span style={{color: '#666'}}>Acc No:</span>
                               <strong>{viewingWithdrawal.bankDetails?.accountNumber}</strong>
                            </div>
                            <div style={{display: 'flex', justifyContent: 'space-between'}}>
                               <span style={{color: '#666'}}>IFSC:</span>
                               <strong>{viewingWithdrawal.bankDetails?.ifsc}</strong>
                            </div>
                          </div>
                        ) : (
                          <div style={{display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #DDE2F2'}}>
                             <span style={{color: '#666'}}>{viewingWithdrawal.payoutMethod} Number:</span>
                             <strong style={{fontSize: '1.1rem'}}>{viewingWithdrawal.payoutNumber}</strong>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        {!viewingWithdrawalKyc ? (
                          <p>Loading Bank Details...</p>
                        ) : viewingWithdrawalKyc === 'none' ? (
                          <p style={{color: '#D32F2F', fontWeight: 'bold', padding: '10px', background: '#FEE2E2', borderRadius: '8px'}}>No Bank Details found for this user!</p>
                        ) : (
                          <div style={{display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', padding: '15px', background: '#f8f9fa', borderRadius: '10px'}}>
                             <p style={{fontSize: '0.8rem', color: '#999', marginBottom: '5px'}}>Legacy Request (Fetched via Profile KYC)</p>
                            {viewingWithdrawalKyc.phonepe && (
                              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                <span style={{color: '#666'}}>PhonePe:</span>
                                <strong>{viewingWithdrawalKyc.phonepe}</strong>
                              </div>
                            )}
                            {viewingWithdrawalKyc.gpay && (
                              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                <span style={{color: '#666'}}>Google Pay:</span>
                                <strong>{viewingWithdrawalKyc.gpay}</strong>
                              </div>
                            )}
                            {viewingWithdrawalKyc.paytm && (
                              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                <span style={{color: '#666'}}>Paytm:</span>
                                <strong>{viewingWithdrawalKyc.paytm}</strong>
                              </div>
                            )}
                            {viewingWithdrawalKyc.bhim && (
                              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                <span style={{color: '#666'}}>BHIM UPI:</span>
                                <strong>{viewingWithdrawalKyc.bhim}</strong>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {viewingWithdrawal.status === 'pending' && (
                      <div style={{marginTop: '30px', display: 'flex', gap: '15px'}}>
                        <button 
                          onClick={() => handleApproveWithdrawal(viewingWithdrawal)}
                          disabled={isProcessingApproval === viewingWithdrawal.id}
                          style={{flex: 1, background: '#2E7D32', color: 'white', padding: '12px', border: 'none', borderRadius: '10px', fontWeight: '900'}}
                        >
                          {isProcessingApproval === viewingWithdrawal.id ? '...' : 'APPROVE'}
                        </button>
                        <button 
                          onClick={() => handleRejectWithdrawal(viewingWithdrawal)}
                          disabled={isProcessingApproval === viewingWithdrawal.id}
                          style={{flex: 1, background: '#D32F2F', color: 'white', padding: '12px', border: 'none', borderRadius: '10px', fontWeight: '900'}}
                        >
                          {isProcessingApproval === viewingWithdrawal.id ? '...' : 'REJECT'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'Transactions': {
        const transactionsList = [
          ...depositRequests.filter(r => r.status !== 'pending').map(r => ({...r, type: 'Deposit'})),
          ...withdrawalRequests.filter(r => r.status !== 'pending').map(r => ({...r, type: 'Withdrawal'}))
        ].sort((a, b) => {
          const dateA = a.processed_at?.toDate ? a.processed_at.toDate().getTime() : (a.created_at?.toDate ? a.created_at.toDate().getTime() : 0);
          const dateB = b.processed_at?.toDate ? b.processed_at.toDate().getTime() : (b.created_at?.toDate ? b.created_at.toDate().getTime() : 0);
          return dateB - dateA;
        });

        return (
          <div className="admin-view">
            <h1>Transaction History</h1>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>User</th>
                  <th>Amount</th>
                  <th>Date Processed</th>
                  <th>Status</th>
                  <th>Action By</th>
                </tr>
              </thead>
              <tbody>
                {transactionsList.map((req) => (
                  <tr key={req.id}>
                    <td>
                      <span style={{
                        padding: '4px 10px', 
                        borderRadius: '12px', 
                        fontSize: '0.75rem', 
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        background: req.type === 'Deposit' ? '#E8F5E9' : '#FFF3E0',
                        color: req.type === 'Deposit' ? '#2E7D32' : '#E65100'
                      }}>
                        {req.type}
                      </span>
                    </td>
                    <td>
                      <div style={{display: 'flex', flexDirection: 'column'}}>
                        <strong>{req.username || getUserInfo(req.userId)}</strong>
                        <span style={{fontSize: '0.8rem', color: '#666'}}>{req.phone || req.userId}</span>
                      </div>
                    </td>
                    <td style={{fontWeight: '900', color: req.type === 'Deposit' ? '#2E7D32' : '#D32F2F'}}>
                      ₹ {req.amount}
                    </td>
                    <td style={{fontSize: '0.85rem'}}>
                      {req.processed_at?.toDate ? req.processed_at.toDate().toLocaleString() : (req.created_at?.toDate ? req.created_at.toDate().toLocaleString() : 'Recent')}
                    </td>
                    <td>
                      <span className={`status-badge ${req.status}`}>
                        {req.status}
                      </span>
                    </td>
                    <td style={{fontSize: '0.85rem', color: '#666'}}>
                      {req.processed_by || 'Admin'}
                    </td>
                  </tr>
                ))}
                {transactionsList.length === 0 && (
                  <tr><td colSpan="6" style={{textAlign: 'center', padding: '30px', color: '#666'}}>No processed transactions found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        );
      }

      case 'Add Game':
        return (
          <div className="admin-view">
            <h1>Add New Game</h1>
            <form className="admin-form" onSubmit={handleCreateGame}>
              <div className="form-group">
                <label>Select Game Name</label>
                {!isAddingNewName ? (
                  <div className="select-with-add">
                    <select 
                      value={gameTitle} 
                      onChange={(e) => setGameTitle(e.target.value)}
                      required
                    >
                      <option value="">-- Select Game Name --</option>
                      {marketNames.map((name, i) => (
                        <option key={i} value={name}>{name}</option>
                      ))}
                    </select>
                    <button 
                      type="button" 
                      className="add-name-toggle"
                      onClick={() => setIsAddingNewName(true)}
                    >
                      + ADD NEW NAME
                    </button>
                    {saveSuccessMsg && (
                      <div style={{ color: '#388E3C', fontSize: '0.9rem', fontWeight: 700, marginTop: '5px' }}>
                        ✓ {saveSuccessMsg}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="add-name-input-box">
                    <input 
                      type="text" 
                      placeholder="Type New Game Name..." 
                      value={newMarketName}
                      onChange={(e) => setNewMarketName(e.target.value)}
                    />
                    <div className="add-name-actions">
                      <button type="button" className="save-name-btn" onClick={handleAddMarketName}>SAVE NAME</button>
                      <button type="button" className="cancel-name-btn" onClick={() => setIsAddingNewName(false)}>CANCEL</button>
                    </div>
                  </div>
                )}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Open Time</label>
                  <input 
                    type="time" 
                    value={openTime} 
                    onChange={(e) => setOpenTime(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Close Time</label>
                  <input 
                    type="time" 
                    value={closeTime} 
                    onChange={(e) => setCloseTime(e.target.value)} 
                    required 
                  />
                </div>
              </div>
              
              {gameSuccessMsg && (
                <div style={{ color: '#388E3C', fontSize: '1rem', fontWeight: 800, textAlign: 'center', marginTop: '5px' }}>
                  {gameSuccessMsg}
                </div>
              )}
              
              <button type="submit" className="admin-btn-primary" disabled={loading}>
                {loading ? 'CREATING...' : 'CREATE GAME SESSION'}
              </button>
            </form>

            <div style={{marginTop: '40px'}}>
              <h2>Existing Game Sessions (Today)</h2>
              <p style={{color: '#666', fontSize: '0.9rem'}}>Delete individual sessions if created by mistake.</p>
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Timings</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {games.filter(g => {
                       const today = new Date().toISOString().split('T')[0];
                       const gameDate = g.created_at?.toDate ? g.created_at.toDate().toISOString().split('T')[0] : '';
                       return gameDate === today;
                    }).map((g) => (
                      <tr key={g.id}>
                        <td><strong>{g.title}</strong></td>
                        <td>{g.openTime} - {g.closeTime}</td>
                        <td>
                          <span style={{
                            padding: '4px 10px', 
                            borderRadius: '12px', 
                            fontSize: '0.75rem', 
                            fontWeight: 'bold',
                            background: g.status === 'completed' ? '#E8F5E9' : '#E3F2FD',
                            color: g.status === 'completed' ? '#2E7D32' : '#1565C0'
                          }}>
                            {g.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <button 
                            onClick={async () => {
                              if(window.confirm(`Are you sure you want to delete the game session for ${g.title}?`)) {
                                await deleteDoc(doc(db, "games", g.id));
                              }
                            }}
                            style={{background: 'none', border: 'none', color: '#D32F2F', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                            title="Delete Game"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {games.filter(g => {
                       const today = new Date().toISOString().split('T')[0];
                       const gameDate = g.created_at?.toDate ? g.created_at.toDate().toISOString().split('T')[0] : '';
                       return gameDate === today;
                    }).length === 0 && (
                       <tr><td colSpan="4" style={{textAlign: 'center', padding: '20px', color: '#999'}}>No game sessions found for today.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      case 'Result Publish':
        return (
          <div className="admin-view">
            <h1>Result Publish & Chart Backfill</h1>
            <p className="admin-subtitle">Select a game and date to publish results. This will settle bets (if session exists) and update charts.</p>
            
            <div className="admin-form-container" style={{background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '30px', maxWidth: '600px'}}>
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!resTitle || !resDate || !resNum) return;
                
                const safeTitle = resTitle.replace(/[^a-zA-Z0-9]/g, '_');
                const gameId = `${safeTitle}_${resDate}`;
                setIsPublishingResult(gameId);

                try {
                  const gameRef = doc(db, "games", gameId);
                  const gameSnap = await getDoc(gameRef);

                  if (gameSnap.exists()) {
                    // Standard Logic: Settle Bets & Update
                    await handleUpdateResult(gameSnap.data(), resNum, gameId);
                  } else {
                    // Backfill Logic: Create new doc for chart
                    const market = markets.find(m => m.title === resTitle);
                    if (!market) {
                      alert("Error: Market template not found for this game. Please check Market Settings.");
                      return;
                    }

                    await setDoc(gameRef, {
                      title: resTitle,
                      openTime: market.openTime,
                      closeTime: market.closeTime,
                      number1: 'XX',
                      number2: resNum,
                      status: 'completed',
                      created_at: new Date(resDate + 'T12:00:00'),
                      isBackfilled: true,
                      result_published_at: serverTimestamp()
                    });
                    setResSuccess(`Historical result for ${resTitle} (${resDate}) added to chart!`);
                  }
                  
                  setResNum('');
                  setTimeout(() => setResSuccess(''), 4000);
                } catch (err) {
                  console.error(err);
                  alert("Publishing Failed: " + err.message);
                } finally {
                  setIsPublishingResult(null);
                }
              }}>
                <div className="form-group" style={{marginBottom: '20px'}}>
                  <label>1. Select Game Market</label>
                  <select value={resTitle} onChange={e => setResTitle(e.target.value)} required style={{padding: '12px', border: '2px solid #E0E5F2', borderRadius: '10px', width: '100%'}}>
                    <option value="">-- Choose Game --</option>
                    {markets.map((m, i) => <option key={i} value={m.title}>{m.title}</option>)}
                  </select>
                </div>

                <div className="form-group" style={{marginBottom: '20px'}}>
                  <label>2. Select Date (Past or Today)</label>
                  <input 
                    type="date" 
                    value={resDate} 
                    onChange={e => setResDate(e.target.value)} 
                    max={new Date().toISOString().split('T')[0]} 
                    required 
                    style={{padding: '12px', border: '2px solid #E0E5F2', borderRadius: '10px', width: '100%'}} 
                  />
                </div>

                <div className="form-group" style={{marginBottom: '25px'}}>
                  <label>3. Enter Winning Number (2 Digits)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 52" 
                    maxLength={2} 
                    value={resNum} 
                    onChange={e => setResNum(e.target.value.replace(/[^0-9]/g, ''))} 
                    required 
                    style={{padding: '12px', border: '2px solid #E0E5F2', borderRadius: '10px', width: '100%', fontSize: '1.2rem', fontWeight: 'bold', textAlign: 'center'}}
                  />
                </div>

                {resSuccess && <div style={{padding: '15px', background: '#D1FAE5', color: '#065F46', borderRadius: '10px', marginBottom: '20px', fontWeight: 'bold'}}>✓ {resSuccess}</div>}

                <button 
                  type="submit" 
                  className="admin-btn-primary" 
                  disabled={isPublishingResult}
                  style={{background: isPublishingResult ? '#CBD5E0' : '#4F46E5', height: '55px', fontSize: '1rem'}}
                >
                  {isPublishingResult ? 'PROCESSING...' : 'PUBLISH & UPDATE CHART'}
                </button>
              </form>
            </div>
            
            <div style={{marginTop: '40px'}}>
              <h2>Recent Activities</h2>
              <p style={{color: '#666', fontSize: '0.9rem'}}>Current games awaiting results:</p>
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {games.filter(g => g.status === 'open').slice(0, 10).map((g) => (
                      <tr key={g.id}>
                        <td><strong>{g.title}</strong></td>
                        <td>{g.created_at?.toDate ? g.created_at.toDate().toLocaleDateString() : 'Today'}</td>
                        <td><span style={{color: '#4F46E5', fontWeight: 'bold'}}>{g.status.toUpperCase()}</span></td>
                        <td><button onClick={() => { setResTitle(g.title); setResDate(g.created_at?.toDate ? g.created_at.toDate().toISOString().split('T')[0] : ''); }} style={{background: '#f0f4ff', color: '#4f46e5', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem'}}>Quick Select</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{marginTop: '40px'}}>
              <h2>Today's Published Results</h2>
              <p style={{color: '#666', fontSize: '0.9rem'}}>Games that were already published today. Use 'Backup Money' to fix mistakes.</p>
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Result</th>
                      <th>Total Won</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {games.filter(g => {
                      if (g.status !== 'completed') return false;
                      const today = new Date().toISOString().split('T')[0];
                      const gameDate = g.created_at?.toDate ? g.created_at.toDate().toISOString().split('T')[0] : '';
                      return gameDate === today;
                    }).map((g) => (
                      <tr key={g.id}>
                        <td><strong>{g.title}</strong></td>
                        <td><span style={{fontSize: '1.1rem', fontWeight: 900, color: '#D32F2F'}}>{g.number2}</span></td>
                        <td style={{color: '#D32F2F', fontWeight: 'bold'}}>₹{g.totalWon || 0}</td>
                        <td>
                          <button 
                            className="publish-btn" 
                            style={{background: '#000', fontSize: '0.75rem', padding: '8px 15px'}}
                            disabled={isRollingBack === g.id}
                            onClick={() => handleRollbackResult(g)}
                          >
                            {isRollingBack === g.id ? 'ROLLING BACK...' : 'BACKUP MONEY'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {games.filter(g => {
                      if (g.status !== 'completed') return false;
                      const today = new Date().toISOString().split('T')[0];
                      const gameDate = g.created_at?.toDate ? g.created_at.toDate().toISOString().split('T')[0] : '';
                      return gameDate === today;
                    }).length === 0 && (
                      <tr><td colSpan="4" style={{textAlign: 'center', padding: '20px', color: '#999'}}>No results published yet today.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      case 'View Game Data':
        return (
          <div className="admin-view">
            <h1>View Game Data</h1>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px'}}>
              {games.filter(g => g.status === 'completed' || g.status === 'closed').map(game => (
                <div key={game.id} className="game-card" onClick={() => setViewingGameBetsData(game)} style={{cursor: 'pointer', transition: 'transform 0.2s'}} onMouseOver={e => e.currentTarget.style.transform='scale(1.02)'} onMouseOut={e => e.currentTarget.style.transform='scale(1)'}>
                  <div className="game-card-top" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <h3 className="market-name" style={{margin: 0}}>{game.title}</h3>
                    <span style={{fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '12px'}}>
                      {game.created_at?.toDate?.()?.toLocaleDateString() || 'Recent'}
                    </span>
                  </div>
                  <div className="game-card-middle" style={{marginTop: '15px', justifyContent: 'center'}}>
                    <div style={{color: 'white', fontWeight: '900', fontSize: '1rem', background: 'rgba(0,0,0,0.2)', padding: '8px 15px', borderRadius: '8px'}}>
                      Tap to View Analytics <Database size={16} style={{verticalAlign: 'middle', marginLeft: '5px'}}/>
                    </div>
                  </div>
                </div>
              ))}
              {games.filter(g => g.status === 'completed' || g.status === 'closed').length === 0 && (
                <div style={{color: '#666', gridColumn: '1 / -1', textAlign: 'center', padding: '30px', fontWeight: 'bold', fontSize: '1.1rem'}}>No completed games available for analysis.</div>
              )}
            </div>
          </div>
        );
      case 'Users':
        return (
          <div className="admin-view">
            <h1>User Management</h1>
            {userSuccessMsg && <div className="success-message" style={{marginBottom: '15px', color: 'green', fontWeight: 'bold'}}>{userSuccessMsg}</div>}
            {userErrorMsg && <div className="error-text" style={{marginBottom: '15px'}}>{userErrorMsg}</div>}
            
            <button 
              className="admin-btn-primary" 
              onClick={() => setShowAddUserPopup(true)}
              style={{marginBottom: '20px', width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px', backgroundColor: '#eef2ff', color: '#4F46E5', fontWeight: 'bold', border: 'none'}}
            >
              <PlusCircle size={18} /> Add User
            </button>

            {showAddUserPopup && (
              <div className="popup-overlay" onClick={() => setShowAddUserPopup(false)} style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <div className="popup-content" onClick={e => e.stopPropagation()} style={{background: '#f8f9fa', padding: '30px', borderRadius: '15px', color: '#1B2559', width: '90%', maxWidth: '400px', cursor: 'default', boxShadow: '0 10px 30px rgba(0,0,0,0.3)'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px'}}>
                    <h3 style={{margin: 0, fontSize: '1.2rem', color: '#333'}}>Directly Add User</h3>
                    <button onClick={() => setShowAddUserPopup(false)} style={{background: 'none', border: 'none', cursor: 'pointer', padding: '5px'}}><X size={20} color="#666" /></button>
                  </div>
                  <form className="admin-form" onSubmit={(e) => { 
                    handleCreateUser(e); 
                    if(newUserName && newUserPhone && newUserPassword) setShowAddUserPopup(false); 
                  }} style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                    <div className="form-group" style={{marginBottom: 0}}>
                      <label style={{color: '#001a4d', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '8px', display: 'block'}}>Full Name</label>
                      <input type="text" value={newUserName} onChange={e => setNewUserName(e.target.value)} required placeholder="e.g. Rahul Kumar" style={{background: 'white', border: '1px solid #dcdde1', padding: '12px', width: '100%', borderRadius: '10px'}} />
                    </div>
                    <div className="form-group" style={{marginBottom: 0}}>
                      <label style={{color: '#001a4d', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '8px', display: 'block'}}>Phone Number</label>
                      <input type="tel" value={newUserPhone} onChange={e => setNewUserPhone(e.target.value)} required placeholder="10-digit number" style={{background: 'white', border: '1px solid #dcdde1', padding: '12px', width: '100%', borderRadius: '10px'}} />
                    </div>
                    <div className="form-group" style={{marginBottom: 0}}>
                      <label style={{color: '#001a4d', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '8px', display: 'block'}}>Password</label>
                      <input type="text" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} required placeholder="Choose a password" style={{background: 'white', border: '1px solid #dcdde1', padding: '12px', width: '100%', borderRadius: '10px'}} />
                    </div>
                    <button type="submit" className="submit-btn" disabled={isCreatingUser} style={{marginTop: '15px', fontSize: '1.1rem', fontWeight: 900, padding: '12px', color: '#FF6600', background: 'transparent', textAlign: 'center', border: 'none', width: '100%', textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer'}}>
                      {isCreatingUser ? 'ADDING...' : 'ADD USER'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            <div className="search-bar" style={{display: 'flex', alignItems: 'center', background: 'white', padding: '10px 15px', borderRadius: '10px', margin: '15px 0', border: '1px solid #ddd'}}>
              <Search size={20} color="#666" style={{marginRight: '10px'}} />
              <input 
                type="text" 
                placeholder="Search user by name or phone..." 
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                style={{border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '1rem', color: '#333'}}
              />
            </div>

            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Balance</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList
                    .filter(u => (u.name && u.name.toLowerCase().includes(userSearchQuery.toLowerCase())) || (u.phone && u.phone.includes(userSearchQuery)))
                    .map((usr, i) => (
                      <tr key={i}>
                        <td style={{textTransform: 'capitalize', fontWeight: 'bold'}}>{usr.name}</td>
                      <td>{usr.phone}</td>
                      <td style={{color: '#1B5E20', fontWeight: 'bold'}}>₹ {usr.wallet_balance || 0}</td>
                      <td>
                        <button 
                          onClick={() => setViewingUser(usr)}
                          style={{padding: '6px 12px', background: '#eef2ff', color: '#4F46E5', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer'}}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {usersList.length === 0 && (
                    <tr><td colSpan="4" style={{textAlign: 'center', padding: '20px'}}>No users registered yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {viewingUser && (
              <div className="popup-overlay" onClick={() => { setViewingUser(null); setConfirmDeleteUser(null); }} style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <div className="popup-content" onClick={e => e.stopPropagation()} style={{background: '#f8f9fa', padding: '30px', borderRadius: '15px', color: '#1B2559', width: '90%', maxWidth: '350px', cursor: 'default', boxShadow: '0 10px 30px rgba(0,0,0,0.3)'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px'}}>
                    <h3 style={{margin: 0, fontSize: '1.2rem', color: '#333'}}>User Profile</h3>
                    <button onClick={() => { setViewingUser(null); setConfirmDeleteUser(null); }} style={{background: 'none', border: 'none', cursor: 'pointer', padding: '5px'}}><X size={20} color="#666" /></button>
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '15px', fontSize: '1.05rem'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ddd', paddingBottom: '10px'}}>
                      <strong style={{color: '#666'}}>Name:</strong> <span style={{textTransform: 'capitalize', fontWeight: 'bold'}}>{viewingUser.name}</span>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ddd', paddingBottom: '10px'}}>
                      <strong style={{color: '#666'}}>Phone:</strong> <span style={{fontWeight: 'bold'}}>{viewingUser.phone}</span>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                      <strong style={{color: '#666'}}>Balance:</strong> <span style={{color: '#1B5E20', fontWeight: 'bold'}}>₹ {viewingUser.wallet_balance || 0}</span>
                    </div>
                  </div>

                  {/* Manual Fund Adjustment SECTION */}
                  <div style={{marginTop: '25px', padding: '15px', background: '#fff', borderRadius: '12px', boxShadow: 'inset 0 0 5px rgba(0,0,0,0.05)', border: '1px solid #eee'}}>
                    <h4 style={{margin: '0 0 15px 0', fontSize: '1rem', color: '#333', textAlign: 'center'}}>Manual Fund Adjustment</h4>
                    
                    {manualTxType === 'NONE' ? (
                      <div style={{display: 'flex', gap: '10px'}}>
                        <button 
                          onClick={() => setManualTxType('DEPOSIT')}
                          style={{flex: 1, background: '#E8F5E9', color: '#2E7D32', border: '1px solid #2E7D32', padding: '8px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer'}}
                        >
                          Manual Deposit
                        </button>
                        <button 
                          onClick={() => setManualTxType('WITHDRAW')}
                          style={{flex: 1, background: '#FFF3E0', color: '#E65100', border: '1px solid #E65100', padding: '8px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer'}}
                        >
                          Manual Withdraw
                        </button>
                      </div>
                    ) : (
                      <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          <span style={{fontSize: '0.8rem', fontWeight: 'bold', color: manualTxType === 'DEPOSIT' ? '#2E7D32' : '#C62828'}}>
                            Action: {manualTxType}
                          </span>
                          <button onClick={() => { setManualTxType('NONE'); setManualTxAmt(''); }} style={{fontSize: '0.75rem', background: 'none', border: 'none', color: '#666', textDecoration: 'underline', cursor: 'pointer'}}>Cancel</button>
                        </div>
                        <input 
                          type="number" 
                          placeholder="Enter Amount" 
                          value={manualTxAmt}
                          onChange={(e) => setManualTxAmt(e.target.value)}
                          style={{padding: '10px', borderRadius: '8px', border: '1px solid #ddd'}}
                        />
                        <button 
                          disabled={isManualTxLoading}
                          onClick={() => handleAdminManualFundUpdate(viewingUser.uid, manualTxType)}
                          style={{
                            background: manualTxType === 'DEPOSIT' ? '#2E7D32' : '#C62828',
                            color: 'white',
                            border: 'none',
                            padding: '10px',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            opacity: isManualTxLoading ? 0.6 : 1
                          }}
                        >
                          {isManualTxLoading ? 'Processing...' : (manualTxType === 'DEPOSIT' ? 'ADD FUNDS' : 'DEDUCT FUNDS')}
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {confirmDeleteUser === viewingUser.uid ? (
                    <div style={{marginTop: '30px', background: '#FFEBEE', padding: '15px', borderRadius: '10px', textAlign: 'center'}}>
                      <p style={{color: '#D32F2F', fontWeight: 'bold', marginBottom: '15px'}}>Are you absolutely sure?</p>
                      <div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                        <button 
                          onClick={async () => {
                            try {
                              await deleteDoc(doc(db, "users", viewingUser.uid));
                              setConfirmDeleteUser(null);
                              setViewingUser(null);
                            } catch (e) {
                              alert("Failed to delete user: " + e.message);
                            }
                          }}
                          style={{flex: 1, background: '#D32F2F', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer'}}
                        >
                          Yes, Delete
                        </button>
                        <button 
                          onClick={() => setConfirmDeleteUser(null)}
                          style={{flex: 1, background: '#e0e0e0', color: '#333', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer'}}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setConfirmDeleteUser(viewingUser.uid)}
                      style={{marginTop: '30px', width: '100%', background: '#fff', border: '1px solid #D32F2F', color: '#D32F2F', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer'}}
                    >
                      Delete Profile
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      case 'Deposit Setting':
        return (
          <div className="admin-view">
            <h1>Deposit Setting</h1>
            <p className="admin-subtitle">Configure the payment details visible to users.</p>
            
            <div className="admin-form-container" style={{background: 'transparent', padding: '0', boxShadow: 'none'}}>
              
              {/* SECTION: SELECT ACTIVE METHOD */}
              <div style={{background: '#EEF2FF', padding: '30px', borderRadius: '15px', border: '2px solid #4F46E5', marginBottom: '30px'}}>
                <h3 style={{color: '#1B2559', fontSize: '1.2rem', marginBottom: '15px'}}>CHOOSE ACTIVE DEPOSIT METHOD</h3>
                <p style={{fontSize: '0.85rem', color: '#666', marginBottom: '20px'}}>Select which payment method should be visible to users on the App.</p>
                
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px'}}>
                  <div 
                    onClick={() => handleSetActivePaymentMethod('MANUAL')}
                    style={{
                      padding: '20px', borderRadius: '12px', border: '2px solid', 
                      borderColor: activePaymentMethod === 'MANUAL' ? '#2E7D32' : '#E0E5F2',
                      background: activePaymentMethod === 'MANUAL' ? '#E8F5E9' : 'white',
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    <h4 style={{margin: '0 0 10px', color: activePaymentMethod === 'MANUAL' ? '#2E7D32' : '#4A5568'}}>Manual UPI & QR</h4>
                    <span style={{fontSize: '0.75rem', color: '#718096'}}>{activePaymentMethod === 'MANUAL' ? '● CURRENTLY ACTIVE' : 'Click to activate'}</span>
                  </div>

                  <div 
                    onClick={() => handleSetActivePaymentMethod('IMB')}
                    style={{
                      padding: '20px', borderRadius: '12px', border: '2px solid', 
                      borderColor: activePaymentMethod === 'IMB' ? '#4F46E5' : '#E0E5F2',
                      background: activePaymentMethod === 'IMB' ? '#EEF2FF' : 'white',
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    <h4 style={{margin: '0 0 10px', color: activePaymentMethod === 'IMB' ? '#4F46E5' : '#4A5568'}}>IMB Gateway</h4>
                    <span style={{fontSize: '0.75rem', color: '#718096'}}>{activePaymentMethod === 'IMB' ? '● CURRENTLY ACTIVE' : 'Click to activate'}</span>
                  </div>

                  <div 
                    onClick={() => handleSetActivePaymentMethod('UPI_GATEWAY')}
                    style={{
                      padding: '20px', borderRadius: '12px', border: '2px solid', 
                      borderColor: activePaymentMethod === 'UPI_GATEWAY' ? '#FF6B6B' : '#E0E5F2',
                      background: activePaymentMethod === 'UPI_GATEWAY' ? '#FFF0F0' : 'white',
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    <h4 style={{margin: '0 0 10px', color: activePaymentMethod === 'UPI_GATEWAY' ? '#FF6B6B' : '#4A5568'}}>UPI Gateway</h4>
                    <span style={{fontSize: '0.75rem', color: '#718096'}}>{activePaymentMethod === 'UPI_GATEWAY' ? '● CURRENTLY ACTIVE' : 'Click to activate'}</span>
                  </div>
                </div>
              </div>

              {/* SECTION A: MANUAL PAYMENT */}
              <div style={{background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '30px', opacity: activePaymentMethod === 'MANUAL' ? 1 : 0.6}}>
                <h3 style={{color: '#1B2559', fontSize: '1.2rem', marginBottom: '20px', borderBottom: '2px solid #F4F7FE', paddingBottom: '10px'}}>A. MANUAL PAYMENT (UPI & QR)</h3>
                
                <div className="form-group" style={{marginBottom: '20px'}}>
                  <label style={{fontWeight: '700', color: '#4A5568', display: 'block', marginBottom: '8px'}}>UPI ID (Manual)</label>
                  <input 
                    type="text" 
                    value={upiId} 
                    onChange={e => setUpiId(e.target.value)} 
                    placeholder="e.g. phonepe@upi" 
                    style={{padding: '12px', border: '2px solid #E0E5F2', borderRadius: '12px', width: '100%', fontSize: '0.9rem'}}
                  />
                </div>

                <div className="form-group" style={{marginBottom: '25px'}}>
                   <label style={{fontWeight: '700', color: '#4A5568', display: 'block', marginBottom: '10px'}}>QR Code Image</label>
                   {qrCodeUrl && !qrFile && (
                     <div style={{background: '#F4F7FE', padding: '15px', borderRadius: '12px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '15px'}}>
                        <img src={qrCodeUrl} alt="Current QR" style={{width: '60px', height: '60px', borderRadius: '8px', border: '1px solid #E0E5F2'}} />
                        <span style={{fontSize: '0.8rem', color: '#718096'}}>Current QR is active</span>
                     </div>
                   )}
                   <input type="file" accept="image/*" onChange={e => setQrFile(e.target.files[0])} style={{width: '100%', padding: '12px', background: '#F8F9FA', borderRadius: '8px', border: '1px solid #E0E5F2'}} />
                </div>

                <button 
                  onClick={handleSaveManualPayment}
                  disabled={isSavingDeposit} 
                  className="admin-btn-primary"
                  style={{height: '45px', backgroundColor: '#2E7D32', width: 'auto', padding: '0 30px', fontSize: '0.9rem'}}
                >
                  {isSavingDeposit ? 'SAVING...' : 'SAVE MANUAL UPI & QR'}
                </button>
              </div>

              {/* SECTION B: IMB GATEWAY */}
              <div style={{background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '30px', opacity: activePaymentMethod === 'IMB' ? 1 : 0.6}}>
                <h3 style={{color: '#4F46E5', fontSize: '1.2rem', marginBottom: '20px', borderBottom: '2px solid #F4F7FE', paddingBottom: '10px'}}>B. IMB GATEWAY (AUTOMATIC)</h3>
                
                <div className="form-group" style={{marginBottom: '15px'}}>
                  <label style={{fontSize: '0.9rem', fontWeight: '700', color: '#4A5568', display: 'block', marginBottom: '5px'}}>IMB API URL</label>
                  <input 
                    type="text" 
                    value={imbApiUrl || 'https://secure.imbpayment.in/'} 
                    onChange={e => setImbApiUrl(e.target.value)} 
                    placeholder="https://secure.imbpayment.in/"
                    style={{padding: '12px', border: '2px solid #E0E5F2', borderRadius: '12px', width: '100%', fontSize: '0.9rem'}}
                  />
                  <p style={{fontSize: '0.75rem', color: '#718096', marginTop: '5px'}}>
                    Note: For production, use <b>https://secure.imbpayment.in/</b>. For staging, use <b>https://secure-stage.imb.org.in/</b>
                  </p>
                </div>
                <div className="form-group" style={{marginBottom: '20px'}}>
                  <label style={{fontSize: '0.9rem', fontWeight: '700', color: '#4A5568', display: 'block', marginBottom: '5px'}}>Access Token (Secret)</label>
                  <input 
                    type="password" 
                    value={imbAccessToken} 
                    onChange={e => setImbAccessToken(e.target.value)} 
                    style={{padding: '12px', border: '2px solid #E0E5F2', borderRadius: '12px', width: '100%', fontSize: '0.9rem'}}
                  />
                </div>
                <div className="form-group" style={{marginBottom: '20px'}}>
                  <label style={{fontSize: '0.9rem', fontWeight: '700', color: '#4A5568', display: 'block', marginBottom: '5px'}}>Webhook URL (Copy to IMB Dashboard)</label>
                  <div style={{display: 'flex', gap: '10px'}}>
                    <input 
                      type="text" 
                      readOnly
                      value="https://us-central1-swami-ji-matka-acf76.cloudfunctions.net/imbWebhook" 
                      style={{padding: '12px', border: '2px solid #E0E5F2', borderRadius: '12px', width: '100%', fontSize: '0.8rem', background: '#F4F7FE'}}
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText("https://us-central1-swami-ji-matka-acf76.cloudfunctions.net/imbWebhook");
                        alert("Copied!");
                      }}
                      style={{padding: '0 15px', background: '#4F46E5', color: 'white', border: 'none', borderRadius: '10px', fontSize: '0.8rem', cursor: 'pointer'}}
                    >
                      COPY
                    </button>
                  </div>
                  <p style={{fontSize: '0.7rem', color: '#718096', marginTop: '5px'}}>Set this URL in your IMB merchant dashboard for automatic crediting.</p>
                </div>

                <button 
                  onClick={handleSaveIMBGateway}
                  disabled={isSavingDeposit} 
                  className="admin-btn-primary"
                  style={{height: '45px', backgroundColor: '#4F46E5', width: 'auto', padding: '0 30px', fontSize: '0.9rem'}}
                >
                  {isSavingDeposit ? 'SAVING...' : 'SAVE IMB GATEWAY'}
                </button>
              </div>

              {/* SECTION C: UPI GATEWAY */}
              <div style={{background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '30px', opacity: activePaymentMethod === 'UPI_GATEWAY' ? 1 : 0.6}}>
                <h3 style={{color: '#FF6B6B', fontSize: '1.2rem', marginBottom: '20px', borderBottom: '2px solid #F4F7FE', paddingBottom: '10px'}}>C. UPI GATEWAY (MERCHANT API)</h3>
                
                <div className="form-group" style={{marginBottom: '15px'}}>
                  <label style={{fontSize: '0.9rem', fontWeight: '700', color: '#4A5568', display: 'block', marginBottom: '5px'}}>API Endpoint URL</label>
                  <input 
                    type="text" 
                    value={upiGatewayUrl || 'https://merchant.upigateway.com/api/create_order'} 
                    onChange={e => setUpiGatewayUrl(e.target.value)} 
                    placeholder="https://merchant.upigateway.com/api/create_order"
                    style={{padding: '12px', border: '2px solid #E0E5F2', borderRadius: '12px', width: '100%', fontSize: '0.9rem'}}
                  />
                </div>
                <div className="form-group" style={{marginBottom: '20px'}}>
                  <label style={{fontSize: '0.9rem', fontWeight: '700', color: '#4A5568', display: 'block', marginBottom: '5px'}}>Merchant API Key</label>
                  <input 
                    type="password" 
                    value={upiGatewayId} 
                    onChange={e => setUpiGatewayId(e.target.value)} 
                    placeholder="Enter your API Key"
                    style={{padding: '12px', border: '2px solid #E0E5F2', borderRadius: '12px', width: '100%', fontSize: '0.9rem'}}
                  />
                </div>

                <button 
                  onClick={handleSaveUPIGateway}
                  disabled={isSavingDeposit} 
                  className="admin-btn-primary"
                  style={{height: '45px', backgroundColor: '#FF6B6B', width: 'auto', padding: '0 30px', fontSize: '0.9rem'}}
                >
                  {isSavingDeposit ? 'SAVING...' : 'SAVE UPI GATEWAY'}
                </button>
              </div>

              {(depositSuccessMsg || depositErrorMsg) && (
                <div style={{padding: '0 10px'}}>
                  {depositSuccessMsg && <div style={{padding: '15px', borderRadius: '10px', background: '#D1FAE5', color: '#065F46', marginBottom: '20px', fontWeight: '700'}}>{depositSuccessMsg}</div>}
                  {depositErrorMsg && <div style={{padding: '15px', borderRadius: '10px', background: '#FEE2E2', color: '#991B1B', marginBottom: '20px', fontWeight: '700'}}>{depositErrorMsg}</div>}
                </div>
              )}
            </div>
          </div>
        );
      case 'Banner Settings':
        return (
          <div className="admin-view">
            <h1>Homepage Posters</h1>
            <p className="admin-subtitle">Update the 3 sliding banners at the top of the homepage.</p>
            
            <form onSubmit={handleSaveBannerSettings} className="admin-form-container" style={{background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)'}}>
              <div style={{display: 'flex', flexDirection: 'column', gap: '30px'}}>
                {[0, 1, 2].map((idx) => (
                  <div key={idx} style={{background: '#F8F9FA', padding: '20px', borderRadius: '12px', border: '1px solid #E0E5F2'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                      <h3 style={{margin: 0, fontSize: '1rem', color: '#1B2559'}}>Banner #{idx + 1}</h3>
                      {bannerUrls[idx] && (
                        <span style={{fontSize: '0.75rem', color: '#388E3C', fontWeight: 'bold'}}>✓ Image Active</span>
                      )}
                    </div>

                    {bannerUrls[idx] && !bannerFiles[idx] && (
                      <div style={{marginBottom: '15px'}}>
                        <img src={bannerUrls[idx]} alt={`Banner ${idx+1}`} style={{width: '100%', maxHeight: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd'}} />
                      </div>
                    )}

                    {bannerFiles[idx] && (
                      <div style={{marginBottom: '10px', background: '#E3F2FD', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', color: '#1565C0'}}>
                        New file selected: <strong>{bannerFiles[idx].name}</strong>
                      </div>
                    )}

                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                        const newFiles = [...bannerFiles];
                        newFiles[idx] = e.target.files[0];
                        setBannerFiles(newFiles);
                      }}
                      style={{width: '100%'}}
                    />
                  </div>
                ))}
              </div>

              {bannerSuccess && (
                <div style={{marginTop: '20px', padding: '15px', borderRadius: '8px', background: '#D1FAE5', color: '#065F46', fontWeight: 'bold'}}>
                  {bannerSuccess}
                </div>
              )}

              <button 
                type="submit" 
                disabled={isSavingBanners} 
                className="admin-btn-primary"
                style={{marginTop: '30px', height: '55px', background: isSavingBanners ? '#CBD5E0' : '#4F46E5'}}
              >
                {isSavingBanners ? 'UPLOADING IMAGES...' : 'UPDATE ALL BANNERS'}
              </button>
            </form>
          </div>
        );
      case 'Notifications':
        return (
          <div className="admin-view">
            <h1>Broadcast Notifications</h1>
            <p className="admin-subtitle">Send alerts and messages to all app users instantly.</p>

            <div className="admin-form-container" style={{background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '30px'}}>
              <form onSubmit={handlePublishNotification}>
                <div className="form-group" style={{marginBottom: '20px'}}>
                  <label style={{fontWeight: 'bold', display: 'block', marginBottom: '8px'}}>Notification Title</label>
                  <input 
                    type="text" 
                    value={notifTitle} 
                    onChange={e => setNotifTitle(e.target.value)} 
                    placeholder="e.g. Important Update / New Game Alert" 
                    required 
                    style={{padding: '12px', border: '1px solid #E0E5F2', borderRadius: '8px', width: '100%'}}
                  />
                </div>
                <div className="form-group" style={{marginBottom: '25px'}}>
                  <label style={{fontWeight: 'bold', display: 'block', marginBottom: '8px'}}>Message Body</label>
                  <textarea 
                    value={notifMessage} 
                    onChange={e => setNotifMessage(e.target.value)} 
                    placeholder="Type your message here..." 
                    required 
                    rows={4}
                    style={{padding: '12px', border: '1px solid #E0E5F2', borderRadius: '8px', width: '100%', resize: 'none'}}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isPublishingNotif}
                  className="admin-btn-primary"
                  style={{background: '#4F46E5', width: 'auto', padding: '12px 30px'}}
                >
                  {isPublishingNotif ? 'PUBLISHING...' : 'PUBLISH NOW'}
                </button>
              </form>
            </div>

            <div style={{marginTop: '40px'}}>
              <h2 style={{fontSize: '1.2rem', marginBottom: '20px'}}>Recent Notifications</h2>
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Message</th>
                      <th>Date</th>
                      <th>Author</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminNotifications.map((n) => (
                      <tr key={n.id}>
                        <td style={{fontWeight: 'bold'}}>{n.title}</td>
                        <td style={{maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{n.message}</td>
                        <td style={{fontSize: '0.85rem'}}>{n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString() : 'Recent'}</td>
                        <td>{n.author}</td>
                        <td>
                          <button 
                            onClick={async () => {
                              if(window.confirm('Delete this notification?')) {
                                await deleteDoc(doc(db, 'notifications', n.id));
                              }
                            }}
                            style={{color: '#D32F2F', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold'}}
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {adminNotifications.length === 0 && (
                      <tr><td colSpan="5" style={{textAlign: 'center', padding: '20px'}}>No notifications sent yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      case 'Setting':
        return (
          <div className="admin-view">
            <h1>Account Settings</h1>
            
            {!isEditingCredentials ? (
              <div className="settings-display-card">
                <div className="settings-row">
                  <span className="settings-label">Username:</span>
                  <span className="settings-value">{isAdminLoggedIn.username}</span>
                </div>
                <div className="settings-row">
                  <span className="settings-label">Password:</span>
                  <span className="settings-value">••••••••</span>
                </div>
                <button 
                  className="admin-btn-primary" 
                  style={{marginTop: '25px', backgroundColor: '#0D47A1', padding: '12px 25px'}}
                  onClick={() => setIsEditingCredentials(true)}
                >
                  CHANGE CREDENTIALS
                </button>
              </div>
            ) : (
              <form className="admin-form" onSubmit={(e) => {
                handleUpdateSettings(e);
                setIsEditingCredentials(false);
              }}>
                <h3 style={{marginBottom: '15px'}}>Edit Credentials</h3>
                <div className="form-group">
                  <label>Username</label>
                  <input 
                    type="text" 
                    value={settingUsername} 
                    onChange={(e) => setSettingUsername(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input 
                    type="text" 
                    value={settingPassword} 
                    onChange={(e) => setSettingPassword(e.target.value)} 
                    required 
                  />
                </div>
                <div style={{display: 'flex', gap: '15px', marginTop: '15px'}}>
                  <button type="submit" className="admin-btn-primary" style={{backgroundColor: '#0D47A1', flex: 1, margin: 0}}>
                    SAVE CHANGES
                  </button>
                  <button type="button" className="cancel-name-btn" onClick={() => setIsEditingCredentials(false)} style={{margin: 0}}>
                    CANCEL
                  </button>
                </div>
              </form>
            )}

            {settingSuccess && (
              <div style={{ color: '#388E3C', fontSize: '1rem', fontWeight: 800, marginTop: '20px' }}>
                ✓ {settingSuccess}
              </div>
            )}

            <hr style={{margin: '40px 0', border: 'none', borderTop: '1px solid #DDD'}} />
            
            <h1>Social App Links</h1>
            {!isEditingSocial ? (
              <div className="settings-display-card">
                <div className="settings-row">
                  <span className="settings-label">WhatsApp Number:</span>
                  <span className="settings-value">{settingWhatsapp || 'Not Set'}</span>
                </div>
                <div className="settings-row">
                  <span className="settings-label">Telegram Link:</span>
                  <span className="settings-value">{settingTelegram || 'Not Set'}</span>
                </div>
                <button 
                  className="admin-btn-primary" 
                  style={{marginTop: '25px', backgroundColor: '#388E3C', padding: '12px 25px'}}
                  onClick={() => setIsEditingSocial(true)}
                >
                  CHANGE SOCIAL LINKS
                </button>
              </div>
            ) : (
              <form className="admin-form" onSubmit={handleUpdateSocialSettings}>
                <h3 style={{marginBottom: '15px'}}>Edit Social Links</h3>
                <div className="form-group">
                  <label>WhatsApp Number (Include Country Code, e.g. 919876543210)</label>
                  <input 
                    type="text" 
                    value={settingWhatsapp} 
                    onChange={(e) => setSettingWhatsapp(e.target.value)} 
                    required 
                    placeholder="e.g. 919876543210"
                  />
                </div>
                <div className="form-group">
                  <label>Telegram Link (e.g. https://t.me/yourusername)</label>
                  <input 
                    type="url" 
                    value={settingTelegram} 
                    onChange={(e) => setSettingTelegram(e.target.value)} 
                    required 
                    placeholder="https://t.me/username"
                  />
                </div>
                <div style={{display: 'flex', gap: '15px', marginTop: '15px'}}>
                  <button type="submit" className="admin-btn-primary" style={{backgroundColor: '#388E3C', flex: 1, margin: 0}}>
                    SAVE LINKS
                  </button>
                  <button type="button" className="cancel-name-btn" onClick={() => setIsEditingSocial(false)} style={{margin: 0}}>
                    CANCEL
                  </button>
                </div>
              </form>
            )}

            {socialSuccess && (
              <div style={{ color: '#388E3C', fontSize: '1rem', fontWeight: 800, marginTop: '20px' }}>
                ✓ {socialSuccess}
              </div>
            )}
          </div>
        );
      case 'Market Settings':
        return (
          <div className="admin-view">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h1>Market Settings (Recurring Games)</h1>
              <div style={{display: 'flex', gap: '10px'}}>
                <button 
                  className="publish-btn" 
                  style={{background: '#4CAF50', fontSize: '13px'}}
                  onClick={async () => {
                    if (window.confirm("This will create Market Templates for all unique games currently in your results. Continue?")) {
                      const uniqueTitles = [...new Set(games.map(g => g.title))];
                      for (const title of uniqueTitles) {
                        const existingMarket = markets.find(m => m.title === title);
                        if (!existingMarket) {
                          const latestGame = games.filter(g => g.title === title).sort((a,b) => (b.created_at?.toMillis?.() || 0) - (a.created_at?.toMillis?.() || 0))[0];
                          if (latestGame) {
                            await setDoc(doc(db, "game_markets", title), {
                              title: title,
                              openTime: latestGame.openTime,
                              closeTime: latestGame.closeTime,
                              isActive: true,
                              createdAt: serverTimestamp()
                            });
                          }
                        }
                      }
                      alert("Markets analyzed and updated!");
                    }
                  }}
                >
                  IMPORT FROM GAMES
                </button>
              </div>
            </div>
            <p className="admin-subtitle">Games added here will automatically renew every day at their opening time.</p>

            <div className="admin-form-container" style={{background: 'white', padding: '25px', borderRadius: '15px', marginBottom: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)'}}>
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!gameTitle || !openTime || !closeTime) return;
                setIsSavingMarket(true);
                try {
                  await setDoc(doc(db, "game_markets", gameTitle), {
                    title: gameTitle,
                    openTime: openTime,
                    closeTime: closeTime,
                    isActive: true,
                    createdAt: serverTimestamp()
                  });
                  setMarketSuccess('Market Saved Successfully!');
                  setGameTitle('');
                  setOpenTime('');
                  setCloseTime('');
                  setTimeout(() => setMarketSuccess(''), 3000);
                } catch (err) { alert(err.message); }
                finally { setIsSavingMarket(false); }
              }}>
                <div className="form-group" style={{marginBottom: '15px'}}>
                   <label>Game Title</label>
                   <select value={gameTitle} onChange={e => setGameTitle(e.target.value)} required>
                      <option value="">-- Select Market --</option>
                      {marketNames.map((n, i) => <option key={i} value={n}>{n}</option>)}
                   </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Open Time</label>
                    <input type="time" value={openTime} onChange={e => setOpenTime(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Close Time</label>
                    <input type="time" value={closeTime} onChange={e => setCloseTime(e.target.value)} required />
                  </div>
                </div>
                {marketSuccess && <div style={{color: '#2E7D32', fontWeight: 'bold', marginBottom: '10px'}}>✓ {marketSuccess}</div>}
                <button type="submit" className="admin-btn-primary" disabled={isSavingMarket}>
                  {isSavingMarket ? 'SAVING...' : 'SAVE RECURRING MARKET'}
                </button>
              </form>
            </div>

            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Market Title</th>
                    <th>Open Time</th>
                    <th>Close Time</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {markets.map((m) => (
                    <tr key={m.id}>
                      <td style={{fontWeight: '900'}}>{m.title}</td>
                      <td>{m.openTime}</td>
                      <td>{m.closeTime}</td>
                      <td>
                        <span style={{color: m.isActive ? '#2E7D32' : '#666', fontWeight: 'bold'}}>
                          {m.isActive ? 'RECURRING' : 'PAUSED'}
                        </span>
                      </td>
                      <td>
                         <button 
                           onClick={async () => {
                             if(window.confirm(`Delete ${m.title} from auto-renewal?`)) {
                               await deleteDoc(doc(db, "game_markets", m.id));
                             }
                           }}
                           style={{color: '#D32F2F', background: 'none', border: 'none', cursor: 'pointer'}}
                         >
                           <Trash2 size={18} />
                         </button>
                      </td>
                    </tr>
                  ))}
                  {markets.length === 0 && (
                    <tr><td colSpan="5" style={{textAlign: 'center', padding: '20px'}}>No recurring markets set yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'Deposit':
        return (
          <div className="admin-view">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h1>Deposit Requests</h1>
              <div style={{display: 'flex', gap: '10px'}}>
                <div style={{padding: '5px 15px', background: '#E3F2FD', color: '#1565C0', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.8rem'}}>
                  PENDING: {depositRequests.filter(r => r.status === 'pending').length}
                </div>
              </div>
            </div>

            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Proof</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {depositRequests.map((req) => (
                    <tr key={req.id}>
                      <td>
                        <div style={{fontWeight: 'bold'}}>{getUserInfo(req.userId)}</div>
                        <div style={{fontSize: '0.7rem', color: '#666'}}>ID: {req.userId}</div>
                      </td>
                      <td style={{fontWeight: '900', color: '#1B5E20'}}>₹ {req.amount}</td>
                      <td style={{fontSize: '0.85rem'}}>
                        {req.created_at?.toDate ? req.created_at.toDate().toLocaleString() : 'Recent'}
                      </td>
                      <td>
                        {req.utrNumber ? (
                          <div style={{
                            padding: '10px', 
                            background: '#F0F4FF', 
                            border: '1px solid #C7D2FE', 
                            borderRadius: '8px', 
                            fontSize: '0.85rem', 
                            color: '#1A237E', 
                            fontWeight: 'bold',
                            textAlign: 'center',
                            fontFamily: 'monospace'
                          }}>
                            UTR: {req.utrNumber}
                          </div>
                        ) : req.screenshotUrl ? (
                          <button 
                            onClick={() => setViewingScreenshot(req.screenshotUrl)}
                            style={{padding: '5px 10px', background: '#F5F7FF', color: '#4F46E5', border: '1px solid #C7D2FE', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold'}}
                          >
                            View Proof
                          </button>
                        ) : (
                          <span style={{color: '#999', fontSize: '0.8rem'}}>No Proof</span>
                        )}
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 10px', 
                          borderRadius: '12px', 
                          fontSize: '0.75rem', 
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                          background: req.status === 'pending' ? '#FFF8E1' : req.status === 'approved' ? '#E8F5E9' : '#FFEBEE',
                          color: req.status === 'pending' ? '#F57F17' : req.status === 'approved' ? '#2E7D32' : '#C62828'
                        }}>
                          {req.status}
                        </span>
                      </td>
                      <td>
                        {req.status === 'pending' ? (
                          <div style={{display: 'flex', gap: '8px'}}>
                            <button 
                              className="publish-btn" 
                              onClick={() => handleApproveDeposit(req)}
                              disabled={isProcessingApproval === req.id}
                              style={{padding: '6px 12px', fontSize: '0.75rem', background: '#2E7D32'}}
                            >
                              {isProcessingApproval === req.id ? '...' : 'APPROVE'}
                            </button>
                            <button 
                              className="publish-btn" 
                              onClick={() => handleRejectDeposit(req)}
                              disabled={isProcessingApproval === req.id}
                              style={{padding: '6px 12px', fontSize: '0.75rem', background: '#C62828'}}
                            >
                              REJECT
                            </button>
                          </div>
                        ) : (
                          <span style={{fontSize: '0.75rem', color: '#999'}}>
                             Done by {req.processed_by || 'Admin'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {depositRequests.length === 0 && (
                    <tr><td colSpan="6" style={{textAlign: 'center', padding: '30px', color: '#666'}}>No deposit requests found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Screenshot Viewer Modal */}
            {viewingScreenshot && (
              <div className="popup-overlay" onClick={() => setViewingScreenshot(null)} style={{position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.85)', zIndex: 3000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px'}}>
                <div style={{position: 'relative', maxWidth: '100%', maxHeight: '90%'}} onClick={e => e.stopPropagation()}>
                   <img src={viewingScreenshot} alt="Payment Proof" style={{maxWidth: '100%', maxHeight: '80vh', borderRadius: '10px', border: '3px solid white'}} />
                   <button 
                     onClick={() => setViewingScreenshot(null)}
                     style={{position: 'absolute', top: '-15px', right: '-15px', background: 'white', color: 'black', border: 'none', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold'}}
                   >
                     X
                   </button>
                   <div style={{marginTop: '15px', textAlign: 'center'}}>
                     <a href={viewingScreenshot} target="_blank" rel="noreferrer" style={{color: 'white', textDecoration: 'underline'}}>Open Image in New Tab</a>
                   </div>
                </div>
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="admin-view">
            <h1>{activeTab}</h1>
            <p>Section coming soon...</p>
          </div>
        );
    }
  };

  if (!isAdminLoggedIn) {
    return (
      <div className="admin-login-wrapper">
        <form className="admin-login-box" onSubmit={handleAdminLogin}>
          <div className="admin-login-logo">
            <Lock size={40} color="#0D47A1" />
          </div>
          <h2 style={{color: '#1B2559', textAlign: 'center', marginBottom: '1.5rem', fontWeight: 900}}>ADMIN GATEWAY</h2>
          {loginError && <div className="login-error-msg">{loginError}</div>}
          <div className="form-group">
            <input 
              type="text" 
              placeholder="Username" 
              value={loginUsername} 
              onChange={e => setLoginUsername(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <input 
              type="password" 
              placeholder="Password" 
              value={loginPassword} 
              onChange={e => setLoginPassword(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" className="admin-btn-primary" disabled={isLoggingIn} style={{width: '100%', marginTop: '1rem', backgroundColor: '#0D47A1'}}>
            {isLoggingIn ? 'AUTHENTICATING...' : 'SECURE LOGIN'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      {/* Sidebar Drawer */}
      <div 
        className={`admin-sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} 
        onClick={() => setIsSidebarOpen(false)} 
      />
      <aside className={`admin-drawer ${isSidebarOpen ? 'open' : ''}`}>
        <div className="admin-drawer-header">
          <div className="admin-profile-box">
            <div className="admin-avatar-small">A</div>
            <div className="admin-text">
              <h2 className="admin-name">{isAdminLoggedIn.username.toUpperCase()}</h2>
              <p className="admin-role">{isAdminLoggedIn.role === 'superadmin' ? 'Super Admin' : 'Admin'}</p>
            </div>
          </div>
          <button className="close-drawer" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} color="white" />
          </button>
        </div>
        <nav className="admin-nav">
          {menuItems.map((item) => (
            <button 
              key={item.id} 
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(item.id);
                setIsSidebarOpen(false);
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="admin-main">
        <header className="admin-header">
          <button className="menu-btn-admin" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={24} color="#000" />
          </button>
          <div className="admin-header-title">
            <h3>SWAMI JI ADMIN</h3>
          </div>
          <div className="admin-profile-right">
            <button className="logout-admin-btn" onClick={() => {
              sessionStorage.removeItem('adminUser');
              setIsAdminLoggedIn(null);
            }}>
              LOGOUT
            </button>
          </div>
        </header>

        <main className="admin-content">
          {renderContent()}
        </main>
      {/* Analytics Modal */}
      {viewingGameBetsData && (
        <div className="modal-overlay" onClick={() => setViewingGameBetsData(null)} style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{background: 'white', padding: '25px', borderRadius: '15px', color: '#1B2559', width: '95%', maxWidth: '800px', cursor: 'default', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', maxHeight: '85vh'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #EEE', paddingBottom: '10px', flexShrink: 0}}>
              <h2 style={{color: '#4F46E5', margin: 0, fontSize: '1.4rem'}}>{viewingGameBetsData.title} Analytics (Bets Placed)</h2>
              <button 
                onClick={() => setViewingGameBetsData(null)}
                style={{background: '#D32F2F', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'}}
              >
                Close
              </button>
            </div>
            
            {isLoadingAnalytics || !bidsAnalyticsData ? (
               <div style={{textAlign: 'center', padding: '60px', color: '#666', fontWeight: 'bold', fontSize: '1.2rem'}}>Loading Financial Data...</div>
            ) : (
               <div style={{display: 'flex', flexDirection: 'column', gap: '30px', overflowY: 'auto', paddingRight: '10px', flexGrow: 1}}>
                 
                 {/* JODI / 2-Digit Section */}
                 <div>
                   <h3 style={{margin: '0 0 15px 0', color: '#000', borderBottom: '3px solid #D32F2F', paddingBottom: '8px', display: 'inline-block'}}>Numbers (00-99) Amounts</h3>
                   {Object.keys(bidsAnalyticsData.jodi).length === 0 ? (
                      <p style={{color: '#666', fontStyle: 'italic', margin: 0, padding: '10px', background: '#f5f5f5', borderRadius: '8px'}}>No bets placed on numbers.</p>
                   ) : (
                     <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px'}}>
                       {Object.entries(bidsAnalyticsData.jodi).map(([num, amt]) => (
                          <div key={`jodi-${num}`} style={{background: '#F8F9FA', border: '1px solid #CCC', borderRadius: '8px', padding: '10px 15px', minWidth: '80px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'}}>
                            <div style={{fontSize: '1.3rem', fontWeight: '900', color: '#000'}}>{num}</div>
                            <div style={{fontSize: '0.9rem', color: '#388E3C', fontWeight: '900'}}>₹{amt}</div>
                          </div>
                       ))}
                     </div>
                   )}
                 </div>

                 {/* ANDAR SECTION */}
                 <div>
                   <h3 style={{margin: '0 0 15px 0', color: '#000', borderBottom: '3px solid #1565C0', paddingBottom: '8px', display: 'inline-block'}}>Andar Haruf (0-9) Amounts</h3>
                   {Object.keys(bidsAnalyticsData.andar).length === 0 ? (
                      <p style={{color: '#666', fontStyle: 'italic', margin: 0, padding: '10px', background: '#f5f5f5', borderRadius: '8px'}}>No bets placed on Andar.</p>
                   ) : (
                     <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px'}}>
                       {Object.entries(bidsAnalyticsData.andar).map(([num, amt]) => (
                          <div key={`andar-${num}`} style={{background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: '8px', padding: '10px 15px', minWidth: '80px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'}}>
                            <div style={{fontSize: '1.3rem', fontWeight: '900', color: '#1565C0'}}>{num}</div>
                            <div style={{fontSize: '0.9rem', color: '#388E3C', fontWeight: '900'}}>₹{amt}</div>
                          </div>
                       ))}
                     </div>
                   )}
                 </div>

                 {/* BAHAR SECTION */}
                 <div>
                   <h3 style={{margin: '0 0 15px 0', color: '#000', borderBottom: '3px solid #c2185b', paddingBottom: '8px', display: 'inline-block'}}>Bahar Haruf (0-9) Amounts</h3>
                   {Object.keys(bidsAnalyticsData.bahar).length === 0 ? (
                      <p style={{color: '#666', fontStyle: 'italic', margin: 0, padding: '10px', background: '#f5f5f5', borderRadius: '8px'}}>No bets placed on Bahar.</p>
                   ) : (
                     <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px'}}>
                       {Object.entries(bidsAnalyticsData.bahar).map(([num, amt]) => (
                          <div key={`bahar-${num}`} style={{background: '#fce4ec', border: '1px solid #f48fb1', borderRadius: '8px', padding: '10px 15px', minWidth: '80px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'}}>
                            <div style={{fontSize: '1.3rem', fontWeight: '900', color: '#c2185b'}}>{num}</div>
                            <div style={{fontSize: '0.9rem', color: '#388E3C', fontWeight: '900'}}>₹{amt}</div>
                          </div>
                       ))}
                     </div>
                   )}
                 </div>

               </div>
            )}
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default AdminPanel;
