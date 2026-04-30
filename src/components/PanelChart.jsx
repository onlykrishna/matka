import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu, Bell, CreditCard } from 'lucide-react';
import logo from '../assets/logo.png';

function PanelChart() {
  const navigate = useNavigate();
  const [marketNames, setMarketNames] = useState([]);
  const [gamesLookup, setGamesLookup] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [walletBalance, setWalletBalance] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setIsLoggedIn(true);
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setWalletBalance(userData.wallet_balance || 0);
          setUserName(userData.name || 'User');
          setUserPhone(userData.phone || currentUser.phoneNumber || '');
        }
      } else {
        setIsLoggedIn(false);
        setWalletBalance(0);
      }
    });

    return () => unsubscribeAuth();
  }, []);
  
  // Default to current month
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Fetch Market Names
  useEffect(() => {
    const q = query(collection(db, "market_names"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let names = snapshot.docs.map(doc => doc.data().name);
      names = names.filter(n => (n || '').toUpperCase().trim() !== 'SADAR BAZAR');
      setMarketNames(names);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Games for the given month
  useEffect(() => {
    const fetchGames = async () => {
      setLoading(true);
      try {
        const [yearStr, monthStr] = selectedMonth.split('-');
        const year = parseInt(yearStr, 10);
        const monthIndex = parseInt(monthStr, 10) - 1;

        // Firebase range
        const startOfMonth = new Date(year, monthIndex, 1);
        const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

        const gamesRef = collection(db, "games");
        const q = query(
          gamesRef, 
          where('created_at', '>=', startOfMonth),
          where('created_at', '<=', endOfMonth)
        );

        const snap = await getDocs(q);
        
        // Build Lookup: lookup[dateString][marketName] = resultNumber
        const lookup = {};
        
        snap.forEach(doc => {
          const data = doc.data();
          if (data.status === 'completed' && data.created_at && data.created_at.toDate) {
            const gameDate = data.created_at.toDate();
            // dateString example: "01", "09", "15"
            const dateKey = String(gameDate.getDate()).padStart(2, '0');
            
            if (!lookup[dateKey]) {
              lookup[dateKey] = {};
            }
            // For multiple games on same day, we assume 1 result per day per market. 
            // In case of overlap, the last written overwrites it.
            lookup[dateKey][data.title] = data.number2;
          }
        });
        
        setGamesLookup(lookup);
      } catch (err) {
        console.error("Error fetching games for Panel Chart:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [selectedMonth]);

  // Calculations for rendering the Table
  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const monthName = new Date(year, monthIndex).toLocaleString('default', { month: 'long' });

  const datesArray = [];
  for (let i = 1; i <= daysInMonth; i++) {
    datesArray.push(String(i).padStart(2, '0'));
  }

  // Formatting Market Header for table compactness
  const formatHeader = (name) => {
    return name.split(' ').join('\n');
  };

  return (
    <div className="layout">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        userName={userName} 
        userPhone={userPhone} 
        isLoggedIn={isLoggedIn}
      />
      
      <div className="main-content">
        <header className="home-header">
          <div className="header-left">
            <button className="menu-btn" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} color="#000000" />
            </button>
            <img src={logo} alt="Logo" className="header-logo-img" />
          </div>
          <div className="header-right">
            <div className="wallet-badge">
              <CreditCard size={16} />
              <span>₹ {walletBalance}</span>
            </div>
            <button className="notification-btn"><Bell size={20} /></button>
          </div>
        </header>

        <div className="panel-chart-container">
          <h2 className="panel-chart-title">
            {monthName.toUpperCase()} {year} - PANEL CHART
          </h2>

          <div className="panel-chart-filter">
             <label style={{fontWeight: 900, color: '#D32F2F', marginRight: '10px'}}>SELECT MONTH:</label>
             <input 
               type="month" 
               value={selectedMonth} 
               onChange={(e) => setSelectedMonth(e.target.value)} 
               className="panel-month-input"
             />
          </div>

          <div className="panel-table-wrapper">
            {loading ? (
              <div style={{textAlign: 'center', padding: '40px', color: '#666', fontWeight: 'bold'}}>
                Loading Chart...
              </div>
            ) : marketNames.length === 0 ? (
              <div style={{textAlign: 'center', padding: '40px', color: '#666', fontWeight: 'bold'}}>
                No Markets Available.
              </div>
            ) : (
              <table className="panel-chart-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    {marketNames.map((m, i) => (
                      <th key={i} style={{whiteSpace: 'pre-wrap'}}>{formatHeader(m)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {datesArray.map((dateNum) => (
                    <tr key={dateNum}>
                      <td className="panel-date-col"><strong>{dateNum}</strong></td>
                      {marketNames.map((marketName, i) => {
                        const result = gamesLookup[dateNum] && gamesLookup[dateNum][marketName];
                        return (
                          <td key={i}>
                            {result ? result : '--'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PanelChart;
