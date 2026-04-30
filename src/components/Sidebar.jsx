import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Home, 
  User, 
  CreditCard, 
  Wallet, 
  History, 
  Trophy, 
  BarChart3, 
  LayoutDashboard, 
  Bell, 
  HelpCircle, 
  Smartphone, 
  LogOut,
  X,
  LogIn,
  UserPlus
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

function Sidebar({ isOpen, onClose, userName, userPhone, isLoggedIn }) {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(localStorage.getItem('sidebar-theme') || 'classic');
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    // Listen for new notifications to show red dot
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const latest = snapshot.docs[0].data();
        const lastRead = localStorage.getItem('lastReadNotification') || 0;
        const latestTime = latest.createdAt?.toMillis?.() || Date.now();
        if (latestTime > Number(lastRead)) {
          setHasUnread(true);
        }
      }
    });

    const handleStorageChange = () => {
      setTheme(localStorage.getItem('sidebar-theme') || 'classic');
      setHasUnread(false); // Reset dot when they open notifications
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const loggedInMenu = [
    { icon: <Home size={22} />, label: 'Home', active: true, action: () => navigate('/home') },
    { icon: <User size={22} />, label: 'Profile', action: () => navigate('/profile') },
    { icon: <Wallet size={22} />, label: 'Wallet', action: () => navigate('/funds') },
    { icon: <History size={22} />, label: 'Bid History', action: () => navigate('/my-bids') },
    { icon: <Trophy size={22} />, label: 'Win History', action: () => navigate('/win-history') },
    { icon: <BarChart3 size={22} />, label: 'Game Rates' },
    { icon: <BarChart3 size={22} />, label: 'Panel Chart', action: () => navigate('/panel-chart') },
    { icon: <LayoutDashboard size={22} />, label: 'Results', action: () => navigate('/today-results') },
    { icon: <HelpCircle size={22} />, label: 'How to Play', action: () => navigate('/how-to-play') },
    { icon: <Bell size={22} />, badge: hasUnread, label: 'Notifications', action: () => { setHasUnread(false); navigate('/notifications'); } },
    { icon: <HelpCircle size={22} />, label: 'Live Support' },
    { 
      icon: <LogOut size={22} />, 
      label: 'Logout', 
      isLogout: true,
      action: async () => {
        try {
          await signOut(auth);
          navigate('/login');
        } catch (error) {
          console.error("Logout failed:", error);
        }
      }
    },
  ];

  const guestMenu = [
    { icon: <LogIn size={22} />, label: 'Login', action: () => navigate('/login') },
    { icon: <UserPlus size={22} />, label: 'Register', action: () => navigate('/register') }
  ];

  const menuItems = isLoggedIn ? loggedInMenu : guestMenu;

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${isOpen ? 'open' : ''} ${theme}`}>
        <div className="sidebar-header">
          {isLoggedIn ? (
            <div className="profile-info">
              <div className="avatar">
                <User size={34} color="#FF6600" />
              </div>
              <div className="user-text">
                <h2 className="username" style={{textTransform: 'capitalize'}}>{userName}</h2>
                <p className="user-id">{userPhone}</p>
              </div>
            </div>
          ) : (
            <div className="profile-info">
              <div className="avatar">
                <User size={34} color="#999" />
              </div>
              <div className="user-text">
                <h2 className="username">Guest User</h2>
                <p className="user-id">Please Login / Register</p>
              </div>
            </div>
          )}
          <button className="close-sidebar" onClick={onClose}>
            <X size={20} color="white" />
          </button>
        </div>
        <div className="sidebar-nav">
          {menuItems.map((item, index) => (
            <div 
              key={index} 
              className={`sidebar-item ${item.active ? 'active' : ''} ${item.isLogout ? 'logout' : ''}`}
              onClick={() => {
                if (item.action) item.action();
                onClose();
              }}
            >
              <span className="item-icon">{item.icon}</span>
              <span className="item-label">{item.label}</span>
              {item.badge && <span className="notification-dot" />}
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
