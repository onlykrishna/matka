import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, History } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

const getItemWinDetails = (item, winningNumber) => {
  if (!winningNumber || winningNumber === 'XX') return null;
  
  if (['JODI', 'CROSSING', 'COPY PASTE'].includes(item.type)) {
    if (item.number === winningNumber) return { amount: item.amount * 95, multiplier: '95X' };
  } else if (item.type === 'ANDAR') {
    if (item.number === winningNumber.charAt(0)) return { amount: item.amount * 9.5, multiplier: '9.5X' };
  } else if (item.type === 'BAHAR') {
    if (item.number === winningNumber.charAt(1)) return { amount: item.amount * 9.5, multiplier: '9.5X' };
  }
  return null;
};

function MyBids() {
  const navigate = useNavigate();
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const q = query(
      collection(db, 'bets'),
      where('uid', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bidsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      bidsData.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });

      setBids(bidsData);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("Error fetching bids:", err);
      setError("Unable to load bids. Please make sure you have a stable internet connection.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, navigate]);

  return (
    <div className="my-bids-container">
      <header className="play-header">
        <button className="back-btn" onClick={() => navigate('/home')}>
          <ArrowLeft size={24} color="white" />
        </button>
        <div className="header-info">
          <h1>My Bids</h1>
        </div>
      </header>

      <div className="bids-content">
        {loading ? (
          <div className="loading-state">Loading your bids...</div>
        ) : error ? (
          <div className="error-state">
            <p>{error}</p>
            <button className="play-now-btn" onClick={() => window.location.reload()}>RETRY</button>
          </div>
        ) : bids.length === 0 ? (
          <div className="empty-state">
            <History size={48} color="#CCC" />
            <p>You haven't placed any bids yet.</p>
            <button className="play-now-btn" onClick={() => navigate('/home')}>PLAY NOW</button>
          </div>
        ) : (
          <div className="bids-list">
            {bids.map((bid) => (
              <div key={bid.id} className={`bid-card ${bid.status === 'win' ? 'bid-winner-highlight' : ''}`}>
                <div className="bid-card-header" style={{alignItems: 'center'}}>
                  <span className="game-name">{bid.gameTitle}</span>
                  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end'}}>
                     <span className={`status-badge ${bid.status}`}>
                        {bid.status === 'win' ? `WON ₹${bid.wonAmount}` : bid.status.toUpperCase()}
                     </span>
                     {(bid.status === 'win' || bid.status === 'loss') && bid.winningNumber && (
                        <span style={{fontSize: '0.75rem', color: '#666', marginTop: '4px', fontWeight: 'bold'}}>
                          Result: {bid.winningNumber}
                        </span>
                     )}
                  </div>
                </div>
                <div className="bid-card-body">
                  <div className="bid-date">
                    {bid.createdAt?.toDate?.() ? bid.createdAt.toDate().toLocaleString() : 'Recent'}
                  </div>
                  <div className="items-summary">
                    {bid.items.map((item, idx) => {
                       const itemWin = bid.status === 'win' ? getItemWinDetails(item, bid.winningNumber) : null;
                       return (
                          <div key={idx} className="bid-item-row">
                            <span className="item-type">{item.type}</span>
                            <span className="item-num">{item.number}</span>
                            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end'}}>
                               <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                 <span className="item-amount">₹{item.amount}</span>
                                 {itemWin && <span style={{fontSize: '0.7rem', color: '#FF6600', fontWeight: '800'}}>({itemWin.multiplier})</span>}
                               </div>
                               {itemWin && <span style={{fontSize: '0.8rem', color: '#4CAF50', fontWeight: 'bold'}}>+₹{itemWin.amount}</span>}
                            </div>
                          </div>
                       );
                    })}
                  </div>
                </div>
                <div className="bid-card-footer">
                  <span className="total-label">Total Amount:</span>
                  <span className="total-val">₹{bid.totalAmount}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyBids;
