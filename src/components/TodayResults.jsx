import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

function TodayResults() {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTodayResults = async () => {
      try {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

        const gamesRef = collection(db, "games");
        const q = query(
          gamesRef, 
          where('status', '==', 'completed'),
          where('created_at', '>=', startOfDay),
          where('created_at', '<=', endOfDay)
        );

        const snap = await getDocs(q);
        const gamesData = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Sort by time (closest to now first)
        gamesData.sort((a, b) => b.created_at.toMillis() - a.created_at.toMillis());

        setGames(gamesData);
      } catch (err) {
        console.error("Error fetching today's results:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTodayResults();
  }, []);

  return (
    <div className="home-container" style={{paddingBottom: '20px'}}>
      {/* Header specifically styled like MyBids but with ArrowLeft for mobile routing */}
      <header className="play-header" style={{marginBottom: '20px'}}>
        <button className="back-btn" onClick={() => navigate('/home')}>
          <ArrowLeft size={24} color="white" />
        </button>
        <div className="header-info" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
          <LayoutDashboard size={20} color="white" />
          <h1>Today's Results</h1>
        </div>
      </header>

      <div className="game-list">
        {loading ? (
          <div style={{textAlign: 'center', padding: '40px', color: '#666', fontWeight: 'bold'}}>
             Loading Results...
          </div>
        ) : games.length === 0 ? (
          <div style={{textAlign: 'center', padding: '40px', color: '#666', fontWeight: 'bold'}}>
             No games have completed today yet.
          </div>
        ) : (
          games.map((game) => (
            <div key={game.id} className="game-card">
              <div className="game-card-top" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h3 className="market-name">{game.title}</h3>
                <span style={{fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '12px'}}>
                   {game.created_at?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
              
              <div className="game-card-middle" style={{marginTop: '10px', justifyContent: 'center'}}>
                <div className="number-circles" style={{gap: '15px'}}>
                  <div className="circle black" style={{width: '60px', height: '60px', fontSize: '1.5rem'}}>
                    {game.number1 || '--'}
                  </div>
                  <div className="circle green" style={{width: '60px', height: '60px', fontSize: '1.5rem'}}>
                    {game.number2 || '--'}
                  </div>
                </div>
              </div>
              
              <div className="game-card-bottom" style={{marginTop: '15px', display: 'flex', justifyContent: 'center'}}>
                <div className="time-display" style={{color: 'white', fontWeight: '900', fontSize: '1rem'}}>
                   RESULT PUBLISHED
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default TodayResults;
