import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Bell, 
  HelpCircle, 
  Smartphone, 
  LogOut,
  X,
  CreditCard,
  Share2,
  Calendar,
  Clock,
  Home,
  History,
  Menu,
  BarChart3,
  Download,
  PlusSquare,
  MoreVertical,
  Share
} from 'lucide-react';
import Sidebar from './Sidebar';
import AuthPopup from './AuthPopup';
import { auth, db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, getDoc, limit, where, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import '../index.css';
import logo from '../assets/logo.png';
import banner1 from '../assets/banner1.png';
import banner2 from '../assets/banner2.png';
import banner3 from '../assets/banner3.png';
import moneyBag from '../assets/money_bag.png';

const formatTime12Hour = (timeStr) => {
  if (!timeStr) return '';
  // Handle both datetime-local (2026-04-17T15:55) and time (15:55) formats
  let timePart = timeStr;
  if (timeStr.includes('T')) {
    timePart = timeStr.split('T')[1];
  }
  const parts = timePart.split(':');
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${hours}:${minutes} ${ampm}`;
  }
  return timeStr; // fallback
};

const getGameButtonState = (openStr, closeStr, createdAt) => {
  if (!openStr || !closeStr) return { text: 'PLAY NOW', color: '#1B5E20', disabled: false };

  const openTimePart = openStr.includes('T') ? openStr.split('T')[1].substring(0, 5) : openStr;
  const closeTimePart = closeStr.includes('T') ? closeStr.split('T')[1].substring(0, 5) : closeStr;

  const now = new Date();

  const parseMinutes = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const openMin = parseMinutes(openTimePart);
  const closeMin = parseMinutes(closeTimePart);

  // Apply Strict Expiration Rule: If the game has surpassed its absolute close time, it can never reopen.
  if (createdAt && createdAt.toDate) {
    const t = new Date(createdAt.toDate());
    const [cH, cM] = closeTimePart.split(':').map(Number);
    t.setHours(cH, cM, 0, 0);

    // Crosses midnight check
    if (openMin > closeMin) {
      t.setDate(t.getDate() + 1);
    }

    // If setting the hours made it earlier than the actual creation moment, 
    // it was scheduled for the next day.
    if (t < createdAt.toDate()) {
      t.setDate(t.getDate() + 1);
    }

    // Compare strictly if 'now' is fully past the computed absolute end date
    if (now > t) {
      return { text: 'TIME OUT', color: '#D32F2F', disabled: true };
    }
  }

  const nowMin = now.getHours() * 60 + now.getMinutes();

  if (openMin <= closeMin) {
    if (nowMin < openMin) return { text: 'COMING UP', color: '#FFCE3B', disabled: true };
    if (nowMin >= closeMin) return { text: 'TIME OUT', color: '#D32F2F', disabled: true };
    return { text: 'PLAY NOW', color: '#1B5E20', disabled: false };
  } else {
    // Crosses midnight relative daily cycle
    if (nowMin >= openMin || nowMin < closeMin) {
      return { text: 'PLAY NOW', color: '#1B5E20', disabled: false };
    } else {
      return { text: 'COMING UP', color: '#FFCE3B', disabled: true };
    }
  }
};

function SkeletonCard() {
  return (
    <div className="game-card skeleton">
      <div className="skeleton-title"></div>
      <div className="skeleton-middle">
        <div className="skeleton-circle"></div>
        <div className="skeleton-circle"></div>
        <div className="skeleton-btn small"></div>
        <div className="skeleton-btn"></div>
      </div>
      <div className="skeleton-bottom">
        <div className="skeleton-text"></div>
        <div className="skeleton-text"></div>
      </div>
    </div>
  );
}

function GameCard({ id, title, number1, number2, openTime, closeTime, status, created_at, isLoggedIn, onAuthRequired, onViewClick }) {
  const navigate = useNavigate();
  const btnState = getGameButtonState(openTime, closeTime, created_at);

  const handlePlayClick = () => {
    if (status !== 'closed' && !btnState.disabled) {
      if (!isLoggedIn) {
        onAuthRequired();
        return;
      }
      navigate(`/play/${id}`);
    }
  };

  return (
    <div className="game-card">
      <div className="game-card-top">
        <h3 className="market-name">{title}</h3>
      </div>
      
      <div className="game-card-middle">
        <div className="number-circles">
          <div className="circle black">{number1}</div>
          <div className="circle green">{number2}</div>
        </div>
        <div className="card-actions">
          <button className="view-chart-btn" onClick={onViewClick}>
            VIEW <BarChart3 size={14} />
          </button>
          <button 
            className="play-now-btn" 
            onClick={handlePlayClick}
            style={{ 
              backgroundColor: btnState.color, 
              color: btnState.color === '#FFCE3B' ? '#000' : '#FFF',
              cursor: btnState.disabled ? 'not-allowed' : 'pointer',
              opacity: btnState.disabled ? 0.9 : 1
            }}
          >
            {btnState.text} {!btnState.disabled && '▶'}
          </button>
        </div>
      </div>

      <div className="game-card-bottom" style={{flexWrap: 'wrap'}}>
        <div className="time-item" style={{flex: 1, textAlign: 'center'}}>
          <span>OPEN TIME : {formatTime12Hour(openTime)}</span>
        </div>
        <div className="time-item" style={{flex: 1, textAlign: 'center'}}>
          <span>CLOSE TIME : {formatTime12Hour(closeTime)}</span>
        </div>
      </div>
    </div>
  );
}



const FLOWER_CONFIG = [
  { char: '🌹', left: '5%', delay: '0s', duration: '4s' },
  { char: '🌹', left: '15%', delay: '1s', duration: '5s' },
  { char: '🌹', left: '25%', delay: '2.5s', duration: '3.5s' },
  { char: '🌹', left: '35%', delay: '0.5s', duration: '4.5s' },
  { char: '🌹', left: '45%', delay: '3s', duration: '4s' },
  { char: '🌹', left: '55%', delay: '1.5s', duration: '5s' },
  { char: '🌹', left: '65%', delay: '0.2s', duration: '3.8s' },
  { char: '🌹', left: '75%', delay: '1.2s', duration: '4.2s' },
  { char: '🌹', left: '85%', delay: '2.1s', duration: '4.8s' },
  { char: '🌹', left: '95%', delay: '0.8s', duration: '3.6s' },
];

const FlowerShower = () => (
  <div className="flower-shower-container">
    {FLOWER_CONFIG.map((flower, i) => (
      <div 
        key={i} 
        className="falling-flower" 
        style={{ 
          left: flower.left, 
          animationDelay: flower.delay,
          animationDuration: flower.duration
        }}
      >
        {flower.char}
      </div>
    ))}
  </div>
);

function HomePage() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [latestResult, setLatestResult] = useState(null);
  const [userName, setUserName] = useState('Loading...');
  const [userPhone, setUserPhone] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [banners, setBanners] = useState([banner1, banner2, banner3]);
  const [socialLinks, setSocialLinks] = useState({ whatsapp: '', telegram: '' });
  const [viewingPastResults, setViewingPastResults] = useState(null);
  const [pastResultsData, setPastResultsData] = useState([]);
  const [isFetchingPast, setIsFetchingPast] = useState(false);

  // PWA & Install States
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallInfo, setShowInstallInfo] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsStandalone(true);
      return;
    }

    // Pick up the globally-captured prompt if already available
    if (window.__pwaPrompt) {
      setDeferredPrompt(window.__pwaPrompt);
    }

    const handlePromptReady = () => {
      if (window.__pwaPrompt) setDeferredPrompt(window.__pwaPrompt);
    };

    const handleRawPrompt = (e) => {
      e.preventDefault();
      window.__pwaPrompt = e;
      setDeferredPrompt(e);
    };

    window.addEventListener('pwaPromptReady', handlePromptReady);
    window.addEventListener('beforeinstallprompt', handleRawPrompt);

    // Notification Permission Request (System Tray)
    if ("Notification" in window && Notification.permission === "default") {
      setTimeout(() => { Notification.requestPermission(); }, 3000);
    }

    return () => {
      window.removeEventListener('pwaPromptReady', handlePromptReady);
      window.removeEventListener('beforeinstallprompt', handleRawPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    // Always re-check global in case state is stale
    const prompt = deferredPrompt || window.__pwaPrompt;
    if (prompt) {
      try {
        prompt.prompt();
        const { outcome } = await prompt.userChoice;
        console.log(`PWA install outcome: ${outcome}`);
        window.__pwaPrompt = null;
        setDeferredPrompt(null);
      } catch (err) {
        setShowInstallInfo(true);
      }
    } else {
      setShowInstallInfo(true);
    }
  };

  useEffect(() => {
    const syncDailyGames = async () => {
      try {
        const now = new Date();
        const currentHHmm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const y_yyyy = yesterday.getFullYear();
        const y_mm = String(yesterday.getMonth() + 1).padStart(2, '0');
        const y_dd = String(yesterday.getDate()).padStart(2, '0');
        const yesterdayStr = `${y_yyyy}-${y_mm}-${y_dd}`;
        
        const qMarkets = query(collection(db, "game_markets"), where("isActive", "==", true));
        const marketsSnap = await getDocs(qMarkets);
        
        for (const marketDoc of marketsSnap.docs) {
          const market = marketDoc.data();
          
          // PRECISION RENEWAL: Only create today's doc if current time is >= opening time
          if (currentHHmm < market.openTime) continue;

          const safeTitle = market.title.replace(/[^a-zA-Z0-9]/g, '_');
          const gameId = `${safeTitle}_${todayStr}`;
          
          const gameRef = doc(db, "games", gameId);
          const gameSnap = await getDoc(gameRef);
          
          if (!gameSnap.exists()) {
            // Find Yesterday's result
            const y_gameId = `${safeTitle}_${yesterdayStr}`;
            const y_gameSnap = await getDoc(doc(db, "games", y_gameId));
            let prevWinningNumber = 'XX';
            
            if (y_gameSnap.exists()) {
              prevWinningNumber = y_gameSnap.data().number2 || 'XX';
            } else {
              // Fallback to latest published if yesterday was skipped
              const qLatest = query(
                collection(db, "games"),
                where("title", "==", market.title),
                where("status", "==", "completed"),
                orderBy("created_at", "desc"),
                limit(1)
              );
              const latestSnap = await getDocs(qLatest);
              if (!latestSnap.empty) {
                prevWinningNumber = latestSnap.docs[0].data().number2 || 'XX';
              }
            }

            await setDoc(gameRef, {
              title: market.title,
              openTime: market.openTime,
              closeTime: market.closeTime,
              number1: prevWinningNumber,
              number2: 'XX',
              status: 'open',
              created_at: serverTimestamp(),
              isAutoGenerated: true
            });

            // Send Live Notification
            try {
              await addDoc(collection(db, 'notifications'), {
                title: `🎮 Game is LIVE: ${market.title}`,
                message: `Bets are now open for ${market.title}. Place your bids now and win big! Good luck! 🎉`,
                createdAt: serverTimestamp(),
                type: 'live',
                gameId: gameId
              });
            } catch (notifErr) {
              console.error('Live notification failed:', notifErr);
            }
          }
        }
      } catch (err) {
        console.error("Daily Sync Error:", err);
      }
    };
    syncDailyGames();
  }, []);

  useEffect(() => {
    // Listen to real-time banner updates
    const unsub = onSnapshot(doc(db, "settings", "banners"), (docSnap) => {
      if (docSnap.exists()) {
        const urls = docSnap.data().urls;
        if (urls && urls.length === 3) {
          setBanners(urls);
        }
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let unsubscribeUser = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
        unsubscribeUser = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserName(data.name || 'User');
            setUserPhone(data.phone || '');
            setWalletBalance(data.wallet_balance || 0);
          } else {
            setUserName('User');
            setWalletBalance(0);
          }
        }, (err) => {
          console.error("Error fetching user Data", err);
          setUserName('User');
          setWalletBalance(0);
        });
      } else {
        setIsLoggedIn(false);
        setUserName('Guest');
        setWalletBalance(0);
        if (unsubscribeUser) unsubscribeUser();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  useEffect(() => {
    // Listen to real-time updates from games collection
    const q = query(collection(db, "games"), orderBy("created_at", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allGames = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate Day Strings
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Custom weight-based sorting sequence
      const customOrder = {
        'SADAR BAJAR': 1,
        'GWALIOR': 2,
        'DELHI BAZAAR': 3,
        'DELHI BAZAR': 3,
        'TAJ': 4,
        'DELHI NOON': 5,
        'INDIA BAZAAR': 6,
        'SHREE GANESH': 7,
        'FARIDABAD': 8,
        'NEW FARIDABAD': 9,
        'GHAZIABAD': 10,
        'GALI': 11,
        'DISAWAR': 12,
        'RANCHI': 13
      };

      const rank = { 'PLAY NOW': 1, 'COMING UP': 2, 'TIME OUT': 3 };

      // UI Logic: Group by title, then for each title determine number1 (Yesterday) and number2 (Today)
      const marketGroups = {};
      allGames.forEach(g => {
        const title = (g.title || '').toUpperCase().trim();
        if (!title || title === 'SADAR BAZAR') return;
        if (!marketGroups[title]) marketGroups[title] = {};
        
        // Extract date from created_at or ID
        let gDate = '';
        if (g.created_at?.toDate) {
          gDate = g.created_at.toDate().toISOString().split('T')[0];
        } else if (g.id.includes('_')) {
          gDate = g.id.split('_').pop();
        }

        // Capture absolute latest (first one seen since allGames is sorted desc)
        if (!marketGroups[title].latest) {
           marketGroups[title].latest = g;
        }

        // Capture specific today and yesterday entries for number resolution
        if (gDate === todayStr && !marketGroups[title].today) marketGroups[title].today = g;
        if (gDate === yesterdayStr && !marketGroups[title].yesterday) marketGroups[title].yesterday = g;
      });

      const finalGames = Object.keys(marketGroups).map(title => {
        const group = marketGroups[title];
        const displayGame = { ...group.latest };
        
        // AUTHENTIC NUMBERS:
        // number1 = Yesterday's number2
        // number2 = Today's number2
        displayGame.number1 = group.yesterday?.number2 || group.latest?.number1 || 'XX';
        displayGame.number2 = group.today?.number2 || 'XX';

        return displayGame;
      });

      // Find the latest result among all games
      const gamesWithResults = allGames.filter(g => g.number2 && g.number2 !== 'XX' && (g.title || '').toUpperCase().trim() !== 'SADAR BAZAR');
      gamesWithResults.sort((a, b) => {
        // Primary Sort: result_published_at (Most recent publish first)
        const pubA = a.result_published_at?.toMillis?.() || 0;
        const pubB = b.result_published_at?.toMillis?.() || 0;
        if (pubA !== pubB) return pubB - pubA;

        // Fallback 1: created_at (Date)
        const d1 = (a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at || Date.now())).toISOString().split('T')[0];
        const d2 = (b.created_at?.toDate ? b.created_at.toDate() : new Date(b.created_at || Date.now())).toISOString().split('T')[0];
        if (d1 !== d2) return d2.localeCompare(d1);

        // Fallback 2: closeTime (String time)
        return (b.closeTime || '').localeCompare(a.closeTime || '');
      });
      setLatestResult(gamesWithResults[0] || null);

      const getDayWeight = (createdAt) => {
        if (!createdAt) return 2;
        const d = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
        const isSameDay = (d1Str, d2Str) => d1Str === d2Str;

        const dStr = d.toISOString().split('T')[0];
        if (isSameDay(dStr, todayStr)) return 0;
        if (isSameDay(dStr, yesterdayStr)) return 1;
        return 2;
      };

      finalGames.sort((a, b) => {
        const dayA = getDayWeight(a.created_at);
        const dayB = getDayWeight(b.created_at);
        if (dayA !== dayB) return dayA - dayB;

        const stateA = getGameButtonState(a.openTime, a.closeTime, a.created_at).text;
        const stateB = getGameButtonState(b.openTime, b.closeTime, b.created_at).text;
        const rankDiff = (rank[stateA] || 4) - (rank[stateB] || 4);
        if (rankDiff !== 0) return rankDiff;

        const titleA = a.title?.toUpperCase() || '';
        const titleB = b.title?.toUpperCase() || '';
        const weightA = customOrder[titleA] || 999;
        const weightB = customOrder[titleB] || 999;
        if (weightA !== weightB) return weightA - weightB;

        return a.title.localeCompare(b.title);
      });

      setGames(finalGames);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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

    const handleStorage = () => {
      setHasUnread(false); 
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      unsub();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    const unsubSocial = onSnapshot(doc(db, "settings", "social"), (docSnap) => {
      if (docSnap.exists()) {
        setSocialLinks(docSnap.data());
      }
    });
    return () => unsubSocial();
  }, []);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Swami Ji Matka',
          text: 'Play Swami Ji Matka for the fastest results and payments.',
          url: 'https://swamijimatka.com'
        });
      } catch (err) {
        console.error("Error sharing", err);
      }
    } else {
      alert("Sharing is not supported on this device/browser.");
    }
  };

  const handleFetchPastResults = async (title) => {
    setViewingPastResults(title);
    setIsFetchingPast(true);
    setPastResultsData([]); // Clear old data
    try {
      // Primary query for results of this market
      const q = query(
        collection(db, "games"),
        where("title", "==", title),
        orderBy("created_at", "desc"),
        limit(20) // Fetch extra to filter out open games on client side
      );
      
      const snap = await getDocs(q);
      const data = snap.docs
        .map(doc => {
          const d = doc.data();
          let displayDate = 'Recent';
          
          if (d.created_at?.toDate) {
            displayDate = d.created_at.toDate().toLocaleDateString('en-IN', {day:'numeric', month:'short', year: 'numeric'});
          } else {
            // Fallback: Extract date from ID (e.g. GALI_2026-04-20)
            const parts = doc.id.split('_');
            if (parts.length > 1) {
              const dateStr = parts[parts.length - 1]; // "2026-04-20"
              const parsedDate = new Date(dateStr);
              if (!isNaN(parsedDate)) {
                displayDate = parsedDate.toLocaleDateString('en-IN', {day:'numeric', month:'short', year: 'numeric'});
              }
            }
          }

          return { 
            id: doc.id, 
            ...d,
            displayDate 
          };
        })
        .filter(game => game.number2 !== 'XX' && game.number2 !== undefined) // Only show games with results
        .slice(0, 10); // Take final 10

      setPastResultsData(data);
    } catch (err) {
      console.error("Error fetching past results:", err);
      // Fallback query if index is missing (simplest query)
      try {
        const fallQ = query(collection(db, "games"), where("title", "==", title), limit(15));
        const fallSnap = await getDocs(fallQ);
        const fallData = fallSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data(), displayDate: doc.id.split('_').pop() }))
          .filter(g => g.number2 !== 'XX')
          .sort((a,b) => b.id.localeCompare(a.id))
          .slice(0, 10);
        setPastResultsData(fallData);
      } catch (innerErr) {
        console.error("Critical History Failure:", innerErr);
      }
    } finally {
      setIsFetchingPast(false);
    }
  };
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 3000); // Change banner every 3 seconds

    return () => clearInterval(timer);
  }, [banners.length]);

  return (
    <div className="home-container">
      {showAuthPopup && <AuthPopup onClose={() => setShowAuthPopup(false)} onNavigate={navigate} />}
      
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        userName={userName} 
        userPhone={userPhone} 
        isLoggedIn={isLoggedIn}
      />
      
      {/* Top Header (OPTIMIZED) */}
      <header className="home-header">
        <div className="header-left">
          <button className="menu-btn" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={20} color="#000000" />
          </button>
          <img src={logo} alt="Logo" className="header-logo-img" />
        </div>
        
        <div className="header-center">
          <span className="brand-name-hindi">स्वामी जी मटका</span>
        </div>

        <div className="header-right">
          <div className="wallet-badge" onClick={() => navigate('/funds')} style={{ cursor: 'pointer' }}>
            <CreditCard size={14} />
            <span>₹ {walletBalance}</span>
          </div>
          <button className="notification-btn" onClick={() => navigate('/notifications')} style={{ position: 'relative' }}>
            <Bell size={18} />
            {hasUnread && <span className="notification-badge"></span>}
          </button>
        </div>
      </header>

      {/* Auto-Sliding Banner */}
      <section className="banner-section">
        <div className="banner-slider">
          {banners.map((img, index) => (
            <img 
              key={index}
              src={img} 
              alt={`Banner ${index + 1}`} 
              className={`slider-img ${index === currentBanner ? 'active' : ''}`} 
            />
          ))}
        </div>
        <div className="banner-dots">
          {banners.map((_, index) => (
            <span 
              key={index}
              className={`dot ${index === currentBanner ? 'active' : ''}`}
            ></span>
          ))}
        </div>
      </section>

      {/* Quick Actions Grid */}
      <section className="quick-actions">
        <div className="action-row titles">
          <div className="action-title">पैसा डालने के लिए</div>
          <div className="action-title">किसी भी समस्या के लिए</div>
        </div>
        <div className="action-row">
          <button className="action-pill yellow" onClick={() => isLoggedIn ? navigate('/funds') : setShowAuthPopup(true)}>
            <span className="pill-content">₹ पैसा डालें</span>
          </button>
          <button 
            className="action-pill green" 
            onClick={() => {
              if (socialLinks.whatsapp) {
                window.location.href = `https://wa.me/${socialLinks.whatsapp.replace(/\D/g, '')}`;
              }
            }}
          >
            <div className="pill-content">
              <WhatsAppSmallIcon /> WHATSAPP
            </div>
          </button>
        </div>
        <div className="action-row">
          <button className="action-pill red" onClick={() => isLoggedIn ? navigate('/funds') : setShowAuthPopup(true)}>
            <div className="pill-content">
              <CreditCard size={20} /> WITHDRAWAL
            </div>
          </button>
          <button 
            className="action-pill blue"
            onClick={() => {
              if (socialLinks.telegram) {
                window.location.href = socialLinks.telegram;
              }
            }}
          >
            <div className="pill-content">
              <TelegramIcon /> LIVE SUPPORT
            </div>
          </button>
        </div>
      </section>

      {/* Live Result Block */}
      <div className="live-result-block">
        <FlowerShower />
        <img src={moneyBag} alt="Left Icon" className="live-logo" />
        <div className="live-info">
          <div className="live-title">Result</div>
          {latestResult ? (
            <>
              <div className="live-game-name">{latestResult.title}</div>
              <div className="live-number">{latestResult.number2}</div>
            </>
          ) : (
            <>
              <div className="live-game-name">WAITING...</div>
              <div className="live-number">XX</div>
            </>
          )}
        </div>
        <img src={moneyBag} alt="Right Icon" className="live-logo" />
      </div>

      {/* Game List */}
      <section className="game-list">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : games.length === 0 ? (
          <div className="no-data-card">
            <Clock size={40} color="#FF6600" />
            <p>No active markets available right now.</p>
            <span>Please check back later!</span>
          </div>
        ) : (
          games.map((game) => (
            <GameCard 
              key={game.id} 
              {...game} 
              isLoggedIn={isLoggedIn} 
              onAuthRequired={() => setShowAuthPopup(true)}
              onViewClick={() => handleFetchPastResults(game.title)} 
            />
          ))
        )}
      </section>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <div 
          className="nav-item" 
          onClick={() => navigate('/my-bids')}
        >
          <History size={20} />
          <span>My Bids</span>
        </div>
        <div 
          className="nav-item" 
          onClick={() => isLoggedIn ? navigate('/funds') : setShowAuthPopup(true)}
        >
          <div className="funds-icon">₹</div>
          <span>Funds</span>
        </div>
        <div className="nav-item active main">
          <div className="home-btn-circle">
            <Home color="white" fill="white" size={24} />
          </div>
        </div>
        <div 
          className="nav-item" 
          onClick={handleShare}
        >
          <Share2 size={20} />
          <span>Share</span>
        </div>
        <a
          className="nav-item"
          href="/SwamiJi_Matka.apk"
          download="SwamiJi_Matka.apk"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <Smartphone size={20} />
          <span>App</span>
        </a>
      </nav>

      {/* ANDROID-ONLY INSTALL MODAL */}
      {showInstallInfo && (
        <div 
          className="popup-overlay" 
          onClick={() => setShowInstallInfo(false)} 
          style={{
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'rgba(0,0,0,0.8)', 
            zIndex: 3000, 
            display: 'flex', 
            alignItems: 'flex-end', 
            justifyContent: 'center'
          }}
        >
          <div 
            className="popup-content" 
            onClick={e => e.stopPropagation()} 
            style={{
              background: 'white', 
              borderTopLeftRadius: '24px', 
              borderTopRightRadius: '24px', 
              width: '100%', 
              maxWidth: '500px', 
              padding: '30px 20px', 
              position: 'relative'
            }}
          >
            <button 
              onClick={() => setShowInstallInfo(false)} 
              style={{
                position: 'absolute', 
                right: '20px', 
                top: '20px', 
                background: '#f5f5f5', 
                border: 'none', 
                borderRadius: '50%', 
                padding: '5px', 
                cursor: 'pointer'
              }}
            >
              <X size={20} color="#333" />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <div style={{
                width: '60px', 
                height: '60px', 
                background: '#E8F5E9', 
                borderRadius: '18px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 15px'
              }}>
                <Download size={32} color="#2E7D32" />
              </div>
              <h2 style={{ fontSize: '1.4rem', color: '#1a1a1a', margin: '0 0 8px 0' }}>Install on Android</h2>
              <p style={{ color: '#666', fontSize: '0.95rem', margin: 0 }}>Follow these steps for the best experience.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{
                display: 'flex', 
                gap: '15px', 
                alignItems: 'flex-start', 
                padding: '15px', 
                background: '#F0FFF4', 
                borderRadius: '12px', 
                border: '1px solid #C6F6D5'
              }}>
                <div style={{
                  background: '#2E7D32', 
                  color: 'white', 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '12px', 
                  fontWeight: 'bold', 
                  flexShrink: 0
                }}>1</div>
                <div>
                  <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#1B5E20' }}>Direct Install</p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#2E7D32' }}>A system popup should appear. Click <strong>"Install"</strong>.</p>
                </div>
              </div>

              <div style={{
                display: 'flex', 
                gap: '15px', 
                alignItems: 'flex-start', 
                padding: '15px', 
                background: '#FFF5F5', 
                borderRadius: '12px', 
                border: '1px solid #FED7D7'
              }}>
                <div style={{
                  background: '#C53030', 
                  color: 'white', 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '12px', 
                  fontWeight: 'bold', 
                  flexShrink: 0
                }}>2</div>
                <div>
                  <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#9B2C2C' }}>Problem? Manual Reinstall</p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#C53030' }}>Tap the Chrome Menu (<MoreVertical size={14} style={{ verticalAlign: 'middle' }} />) and select <strong>"Install App"</strong> to reinstall.</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowInstallInfo(false)}
              style={{
                width: '100%', 
                marginTop: '25px', 
                padding: '15px', 
                background: '#2E7D32', 
                color: 'white', 
                border: 'none', 
                borderRadius: '12px', 
                fontWeight: 'bold', 
                cursor: 'pointer', 
                fontSize: '1rem'
              }}
            >
              Start Installation
            </button>
          </div>
        </div>
      )}
      {/* Past Results Modal (FULL SCREEN) */}
      {viewingPastResults && (
        <div className="popup-overlay" onClick={() => setViewingPastResults(null)} style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'white', zIndex: 2000, display: 'flex', flexDirection: 'column'}}>
          {/* Header */}
          <div style={{background: 'linear-gradient(135deg, #1A237E 0%, #0D47A1 100%)', padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '15px', color: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.2)'}}>
            <button onClick={() => setViewingPastResults(null)} style={{background: 'none', border: 'none', display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '5px'}}>
              <X size={24} color="white" />
            </button>
            <div>
              <h2 style={{margin: 0, fontSize: '1.2rem', fontWeight: 'bold'}}>Chart: {viewingPastResults}</h2>
              <p style={{margin: 0, fontSize: '0.8rem', opacity: 0.8}}>Showing Last 10 Results</p>
            </div>
          </div>
          
          <div style={{overflowY: 'auto', padding: '20px', flex: 1, background: '#F8F9FA'}}>
            {isFetchingPast ? (
              <div style={{textAlign: 'center', padding: '50px 20px'}}>
                <div style={{margin: '0 auto 15px', width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #1A237E', borderRadius: '50%', animation: 'spin 1s linear infinite'}}></div>
                <p style={{color: '#666', fontWeight: 'bold'}}>Generating Chart...</p>
              </div>
            ) : pastResultsData.length === 0 ? (
              <div style={{textAlign: 'center', padding: '50px 20px', color: '#999'}}>
                <Calendar size={48} style={{opacity: 0.3, marginBottom: '15px'}} />
                <p style={{fontWeight: 'bold', fontSize: '1.1rem'}}>No History Available</p>
                <span>Results for this game haven't been published yet.</span>
              </div>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', padding: '10px 15px', background: '#EEE', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.8rem', color: '#666', textTransform: 'uppercase'}}>
                  <span>Date / तारीख</span>
                  <span>Result / रिजल्ट</span>
                </div>
                {pastResultsData.map((res, i) => (
                  <div key={res.id || i} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: 'white', borderRadius: '12px', border: '1px solid #E0E4EC', boxShadow: '0 2px 5px rgba(0,0,0,0.03)'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                      <Calendar size={18} color="#1A237E" style={{opacity: 0.8}} />
                      <span style={{color: '#1B2559', fontWeight: '800', fontSize: '1rem'}}>{res.displayDate}</span>
                    </div>
                    <div style={{width: '45px', height: '45px', borderRadius: '50%', background: 'linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.2rem', boxShadow: '0 3px 6px rgba(46,125,50,0.3)', border: '2px solid white'}}>
                      {res.number2 || 'XX'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.37.74-.57 2.91-1.27 4.86-2.11 5.85-2.53 2.8-.1.58-.15.82-.15.05 0 .18.01.26.08.07.06.09.14.1.2.01.07.02.21.01.35z" />
  </svg>
);

const WhatsAppSmallIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.148-.67-1.611-.918-2.208-.242-.588-.487-.508-.67-.517-.172-.008-.37-.01-.567-.01-.197 0-.518.074-.79.37-.272.296-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-4.821 4.754a8.117 8.117 0 01-4.077-1.096l-.293-.174-3.04.797.81-2.96-.192-.306a8.137 8.137 0 01-1.246-4.322c0-4.49 3.655-8.146 8.147-8.146 2.176 0 4.223.847 5.761 2.387 1.539 1.54 2.385 3.587 2.385 5.759 0 4.49-3.656 8.147-8.147 8.147m0-19.622C7.759 0 3.843 3.916 3.843 8.799c0 1.558.406 3.08 1.179 4.42L2.34 19.303l6.236-1.636a8.736 8.736 0 004.073 1.132C17.53 18.799 21.45 14.883 21.45 10c0-2.326-.905-4.513-2.548-6.157A8.67 8.67 0 0012.651 1.278z" />
  </svg>
);

export default HomePage;
