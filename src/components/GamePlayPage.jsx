import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { db, auth } from '../firebase';
import { doc, getDoc, runTransaction, serverTimestamp, collection } from 'firebase/firestore';

function GamePlayPage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('JODI');
  const [jodiAmounts, setJodiAmounts] = useState({});
  const [andarAmounts, setAndarAmounts] = useState({});
  const [baharAmounts, setBaharAmounts] = useState({});
  const [crossingDigits, setCrossingDigits] = useState('');
  const [crossingAmount, setCrossingAmount] = useState('');
  const [crossingBets, setCrossingBets] = useState([]);
  const [copyPasteDigits, setCopyPasteDigits] = useState('');
  const [copyPasteAmount, setCopyPasteAmount] = useState('');
  const [paltiOption, setPaltiOption] = useState('with'); // 'with' or 'without'
  const [copyPasteBets, setCopyPasteBets] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [gameData, setGameData] = useState(null);
  const [timeLeft, setTimeLeft] = useState('00:00:00');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchGameData = async () => {
      if (!gameId) return;
      try {
        const gameRef = doc(db, 'games', gameId);
        const gameSnap = await getDoc(gameRef);
        if (gameSnap.exists()) {
          setGameData(gameSnap.data());
        } else {
          setGameData({ title: 'GAME NOT FOUND' });
        }
      } catch (err) {
        console.error(err);
        setGameData({ title: 'ERROR' });
      }
    };
    fetchGameData();
  }, [gameId]);

  useEffect(() => {
    if (!gameData || !gameData.closeTime || !gameData.openTime) return;

    const calculateTimeLeft = () => {
      const now = new Date();
      const openStr = gameData.openTime;
      const closeStr = gameData.closeTime;
      const createdAt = gameData.created_at;

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
        // Fallback if no createdAt (unlikely)
        const [cH, cM] = closeTimePart.split(':').map(Number);
        targetDate.setHours(cH, cM, 0, 0);
        if (targetDate < now && openMin > closeMin) {
          targetDate.setDate(targetDate.getDate() + 1);
        }
      }

      const diff = targetDate - now;

      if (diff <= 0) {
        setTimeLeft('00:00:00');
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      const display = [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
      setTimeLeft(display);
    };

    calculateTimeLeft(); // Run once immediately
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [gameData]);

  useEffect(() => {
    // Calculate total amount whenever any input changes
    const jodiSum = Object.values(jodiAmounts).reduce((a, b) => a + (parseInt(b) || 0), 0);
    const andarSum = Object.values(andarAmounts).reduce((a, b) => a + (parseInt(b) || 0), 0);
    const baharSum = Object.values(baharAmounts).reduce((a, b) => a + (parseInt(b) || 0), 0);
    const crossingSum = crossingBets.reduce((a, b) => a + (parseInt(b.amount) || 0), 0);
    const cpSum = copyPasteBets.reduce((a, b) => a + (parseInt(b.amount) || 0), 0);
    setTotalAmount(jodiSum + andarSum + baharSum + crossingSum + cpSum);
  }, [jodiAmounts, andarAmounts, baharAmounts, crossingBets, copyPasteBets]);

  const handleInputChange = (setter, id, value) => {
    if (value !== '' && parseInt(value) < 0) return;
    if (value !== '' && parseInt(value) > 0 && parseInt(value) < 5) {
      // We don't block typing but we'll validate on play
    }
    setter(prev => ({ ...prev, [id]: value }));
  };

  const addCrossingBets = () => {
    if (!crossingDigits || !crossingAmount) return;
    
    // Split digits and generate unique 2-digit combinations
    const digits = [...new Set(crossingDigits.split(''))];
    const newBets = [];
    
    for (const d1 of digits) {
      for (const d2 of digits) {
        const combo = `${d1}${d2}`;
        // Only add if not already in the list
        if (!crossingBets.some(b => b.number === combo)) {
          newBets.push({ number: combo, amount: crossingAmount });
        }
      }
    }
    
    if (parseInt(crossingAmount) < 5) {
      alert('Minimum bet amount is ₹5');
      return;
    }
    
    if (newBets.length > 0) {
      setCrossingBets([...crossingBets, ...newBets]);
      setCrossingAmount('');
      setCrossingDigits('');
    }
  };

  const removeCrossingBet = (index) => {
    setCrossingBets(crossingBets.filter((_, i) => i !== index));
  };

  const addCopyPasteBets = () => {
    if (!copyPasteDigits || !copyPasteAmount) return;
    
    const newBets = [];
    const mainNum = copyPasteDigits;
    
    // Add original number
    if (!copyPasteBets.some(b => b.number === mainNum)) {
      newBets.push({ number: mainNum, amount: copyPasteAmount });
    }
    
    // Add Palti (reverse) if selected and different
    if (paltiOption === 'with' && mainNum.length === 2) {
      const reversed = mainNum.split('').reverse().join('');
      if (reversed !== mainNum && !copyPasteBets.some(b => b.number === reversed)) {
        newBets.push({ number: reversed, amount: copyPasteAmount });
      }
    }
    
    if (parseInt(copyPasteAmount) < 5) {
      alert('Minimum bet amount is ₹5');
      return;
    }
    
    if (newBets.length > 0) {
      setCopyPasteBets([...copyPasteBets, ...newBets]);
      setCopyPasteDigits('');
      setCopyPasteAmount('');
    }
  };

  const removeCopyPasteBet = (index) => {
    setCopyPasteBets(copyPasteBets.filter((_, i) => i !== index));
  };

  const handlePlay = async () => {
    if (timeLeft === '00:00:00') {
      alert('Time is up for the contest');
      return;
    }

    if (totalAmount === 0) {
      alert('Please place at least one bet');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      alert('Please login to place bets');
      navigate('/login');
      return;
    }

    // Secondary validation for ₹5 min on all bets
    const invalidItems = [];
    Object.entries(jodiAmounts).forEach(([num, amt]) => {
      if (amt && parseInt(amt) < 5) invalidItems.push(`Jodi ${num}`);
    });
    Object.entries(andarAmounts).forEach(([num, amt]) => {
      if (amt && parseInt(amt) < 5) invalidItems.push(`Andar ${num}`);
    });
    Object.entries(baharAmounts).forEach(([num, amt]) => {
      if (amt && parseInt(amt) < 5) invalidItems.push(`Bahar ${num}`);
    });

    if (invalidItems.length > 0) {
      alert(`The following bets are below ₹5: ${invalidItems.slice(0, 3).join(', ')}${invalidItems.length > 3 ? '...' : ''}`);
      return;
    }

    setLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await transaction.get(userRef);
        
        if (!userSnap.exists()) throw 'User profile not found';
        
        const currentBalance = userSnap.data().wallet_balance || 0;
        if (currentBalance < totalAmount) {
          throw 'Insufficient balance. Please add funds to place this bet.';
        }

        // Gather all items
        const betItems = [];
        Object.entries(jodiAmounts).forEach(([num, amt]) => {
          if (amt) betItems.push({ type: 'JODI', number: num, amount: parseInt(amt) });
        });
        Object.entries(andarAmounts).forEach(([num, amt]) => {
          if (amt) betItems.push({ type: 'ANDAR', number: num, amount: parseInt(amt) });
        });
        Object.entries(baharAmounts).forEach(([num, amt]) => {
          if (amt) betItems.push({ type: 'BAHAR', number: num, amount: parseInt(amt) });
        });
        crossingBets.forEach(b => betItems.push({ type: 'CROSSING', number: b.number, amount: parseInt(b.amount) }));
        copyPasteBets.forEach(b => betItems.push({ type: 'COPY PASTE', number: b.number, amount: parseInt(b.amount) }));

        // 1. Deduct from wallet
        transaction.update(userRef, {
          wallet_balance: currentBalance - totalAmount
        });

        // 2. Create bet record
        const betRef = doc(collection(db, 'bets'));
        transaction.set(betRef, {
          uid: user.uid,
          gameId: gameId,
          gameTitle: gameData?.title || 'Unknown Game',
          totalAmount: totalAmount,
          items: betItems,
          status: 'pending',
          createdAt: serverTimestamp()
        });
      });

      alert('✓ Bet placed successfully!');
      navigate('/my-bids');
    } catch (err) {
      console.error(err);
      alert(typeof err === 'string' ? err : 'Transaction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderGrid = (count, start, setter, amountsMap, prefix) => {
    const rows = [];
    const numCols = 10;
    const numRows = Math.ceil(count / numCols);

    for (let r = 0; r < numRows; r++) {
      const numbers = [];
      const inputs = [];

      for (let c = 0; c < numCols; c++) {
        const i = r * numCols + c;
        if (i >= count) break;

        const num = (start + i) % 100;
        const displayNum = num.toString().padStart(2, '0');

        numbers.push(
          <div key={`num-${displayNum}`} className="jodi-row-num">
            {displayNum}
          </div>
        );

        inputs.push(
          <div key={`input-${displayNum}`} className="jodi-input-box">
            <input 
              type="number" 
              placeholder="" 
              min="0"
              value={amountsMap[displayNum] || ''}
              onChange={(e) => handleInputChange(setter, displayNum, e.target.value)}
            />
          </div>
        );
      }

      rows.push(
        <div key={`row-${r}`} className="jodi-row-group">
          <div className="jodi-numbers-row">
            {numbers}
          </div>
          <div className="jodi-inputs-row">
            {inputs}
          </div>
        </div>
      );
    }
    return rows;
  };

  const renderHarufGrid = (setter, amountsMap, prefix) => {
    const numbers = [];
    const inputs = [];

    for (let i = 0; i < 10; i++) {
      numbers.push(
        <div key={`num-${i}`} className="jodi-row-num">
          {i}
        </div>
      );

      inputs.push(
        <div key={`input-${i}`} className="jodi-input-box">
          <input 
            type="number" 
            placeholder="" 
            min="0"
            value={amountsMap[i] || ''}
            onChange={(e) => handleInputChange(setter, i, e.target.value)}
          />
        </div>
      );
    }

    return (
      <div className="jodi-row-group">
        <div className="jodi-numbers-row">
          {numbers}
        </div>
        <div className="jodi-inputs-row">
          {inputs}
        </div>
      </div>
    );
  };

  return (
    <div className="game-play-container">
      {/* Header */}
      <header className="play-header">
        <button className="back-btn" onClick={() => navigate('/home')}>
          <ArrowLeft size={24} color="white" />
        </button>
        <div className="header-info">
          <h1>{gameData?.title || 'LOADING...'}</h1>
          <p className="countdown">गेम का लास्ट टाइम : {timeLeft}</p>
        </div>
      </header>


      {/* Tabs */}
      <div className="play-tabs-container">
        <div className="play-tabs">
          <button 
            className={`play-tab ${activeTab === 'JODI' ? 'active' : ''}`}
            onClick={() => setActiveTab('JODI')}
          >
            JODI
          </button>
          <button 
            className={`play-tab ${activeTab === 'CROSSING' ? 'active' : ''}`}
            onClick={() => setActiveTab('CROSSING')}
          >
            CROSSING
          </button>
          <button 
            className={`play-tab ${activeTab === 'COPY PASTE' ? 'active' : ''}`}
            onClick={() => setActiveTab('COPY PASTE')}
          >
            COPY PASTE
          </button>
        </div>
      </div>

      <div className="play-content">
        {activeTab === 'JODI' && (
          <>
            {/* Jodi Grid (01 to 00) */}
            <div className="jodi-section">
              <div className="jodi-grid-container">
                {renderGrid(100, 1, setJodiAmounts, jodiAmounts, 'j')}
              </div>
            </div>

            {/* Andar Haruf Section */}
            <div className="haruf-section">
              <h2 className="section-title">Andar Haruf ( अंदर )</h2>
              <div className="jodi-grid-container">
                {renderHarufGrid(setAndarAmounts, andarAmounts, 'a')}
              </div>
            </div>

            {/* Bahar Haruf Section */}
            <div className="haruf-section">
              <h2 className="section-title">Bahar Haruf ( बहार )</h2>
              <div className="jodi-grid-container">
                {renderHarufGrid(setBaharAmounts, baharAmounts, 'b')}
              </div>
            </div>
          </>
        )}

        {activeTab === 'CROSSING' && (
          <div className="crossing-section">
            <div className="game-input-group">
              <label>Enter Digit</label>
              <input 
                type="text" 
                placeholder="Enter digits (e.g. 123)" 
                value={crossingDigits}
                onChange={(e) => setCrossingDigits(e.target.value.replace(/[^0-9]/g, ''))}
              />
            </div>
            <div className="game-input-group">
              <label>Enter Amount</label>
              <input 
                type="number" 
                placeholder="Enter amount (Min ₹5)" 
                min="0"
                value={crossingAmount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || parseInt(val) >= 0) {
                    setCrossingAmount(val);
                  }
                }}
              />
            </div>
            <button className="add-btn" onClick={addCrossingBets}>
              ADD
            </button>

            {crossingBets.length > 0 && (
              <div className="bets-table-container">
                <table className="bets-table">
                  <thead>
                    <tr>
                      <th>NUMBER</th>
                      <th>AMOUNT</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crossingBets.map((bet, index) => (
                      <tr key={index}>
                        <td>{bet.number}</td>
                        <td className="amount">₹ {bet.amount}</td>
                        <td>
                          <button 
                            className="delete-btn" 
                            onClick={() => removeCrossingBet(index)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'COPY PASTE' && (
          <div className="copy-paste-section">
            <div className="game-input-group">
              <label>Enter Digit</label>
              <input 
                type="text" 
                placeholder="Paste digits here..." 
                value={copyPasteDigits}
                onChange={(e) => setCopyPasteDigits(e.target.value.replace(/[^0-9]/g, ''))}
              />
            </div>
            <div className="game-input-group">
              <label>Enter Amount</label>
              <input 
                type="number" 
                placeholder="Enter amount (Min ₹5)" 
                min="0"
                value={copyPasteAmount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || parseInt(val) >= 0) {
                    setCopyPasteAmount(val);
                  }
                }}
              />
            </div>

            <div className="options-grid">
              <div 
                className={`option-box ${paltiOption === 'with' ? 'active' : ''}`}
                onClick={() => setPaltiOption('with')}
              >
                <div className="radio-circle">
                  {paltiOption === 'with' && <div className="radio-inner" />}
                </div>
                <span>पलटी के साथ</span>
              </div>
              <div 
                className={`option-box ${paltiOption === 'without' ? 'active' : ''}`}
                onClick={() => setPaltiOption('without')}
              >
                <div className="radio-circle">
                  {paltiOption === 'without' && <div className="radio-inner" />}
                </div>
                <span>बिना पलटी के</span>
              </div>
            </div>

            <button className="add-btn" onClick={addCopyPasteBets}>
              ADD
            </button>

            {copyPasteBets.length > 0 && (
              <div className="bets-table-container">
                <table className="bets-table">
                  <thead>
                    <tr>
                      <th>NUMBER</th>
                      <th>AMOUNT</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {copyPasteBets.map((bet, index) => (
                      <tr key={index}>
                        <td>{bet.number}</td>
                        <td className="amount">₹ {bet.amount}</td>
                        <td>
                          <button 
                            className="delete-btn" 
                            onClick={() => removeCopyPasteBet(index)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="play-footer">
        <div className="total-amount">
          <span className="rupee">₹</span> {totalAmount}
        </div>
        <button 
          className="play-submit-btn" 
          onClick={handlePlay}
          disabled={loading}
        >
          {loading ? '...' : 'PLAY'}
        </button>
      </footer>
    </div>
  );
}

export default GamePlayPage;
