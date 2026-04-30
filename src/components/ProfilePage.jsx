import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Smartphone, 
  Lock, 
  Wallet, 
  ChevronLeft,
  Settings,
  Paintbrush,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { updatePassword, onAuthStateChanged } from 'firebase/auth';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // Theme state
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('sidebar-theme') || 'classic');

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (!u) {
        navigate('/login');
        return;
      }
      setUser(u);
      
      const unsubDoc = onSnapshot(doc(db, "users", u.uid), (docSnap) => {
        if (docSnap.exists()) {
          setProfileData(docSnap.data());
        }
        setLoading(false);
      });
      
      return () => unsubDoc();
    });
    
    return () => unsubAuth();
  }, [navigate]);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });

    if (newPassword.length < 6) {
      setMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setIsUpdating(true);
    try {
      await updatePassword(auth.currentUser, newPassword);
      setMsg({ type: 'success', text: 'Password updated successfully!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        setMsg({ type: 'error', text: 'Critical Error: Please logout and login again to change your password for security reasons.' });
      } else {
        setMsg({ type: 'error', text: err.message });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleThemeChange = (theme) => {
    setCurrentTheme(theme);
    localStorage.setItem('sidebar-theme', theme);
    // Dispatch event to notify Sidebar (if open) or just rely on next open
    window.dispatchEvent(new Event('storage')); 
  };

  if (loading) {
    return (
      <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F7FE'}}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {/* Header */}
      <div className="profile-header-bg">
        <div style={{padding: '20px', display: 'flex', alignItems: 'center', gap: '15px'}}>
          <button onClick={() => navigate('/home')} style={{background: 'rgba(255,255,255,0.3)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'}}>
            <ChevronLeft color="white" />
          </button>
          <h1 style={{color: 'white', fontSize: '1.2rem', margin: 0}}>User Profile</h1>
        </div>
      </div>

      <div style={{padding: '0 20px'}}>
        <div className="profile-card">
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '10px'}}>
            <div style={{width: '80px', height: '80px', background: '#FFB800', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px', color: 'white'}}>
              <User size={40} />
            </div>
            <h2 style={{margin: 0, textTransform: 'capitalize', color: '#1B2559'}}>{profileData?.name}</h2>
            <p style={{margin: '5px 0', color: '#A3AED0', fontWeight: '600'}}>{profileData?.phone}</p>
          </div>

          <div className="profile-section-title">
            <Settings size={18} color="#4F46E5" /> ACCOUNT DETAILS
          </div>
          
          <div className="profile-info-row">
            <span className="profile-info-label">Wallet Balance</span>
            <span className="profile-info-value" style={{color: '#05CD99'}}>₹ {profileData?.wallet_balance?.toFixed(2)}</span>
          </div>
          <div className="profile-info-row">
            <span className="profile-info-label">Status</span>
            <span className="profile-info-value" style={{textTransform: 'uppercase', color: profileData?.status === 'active' ? '#05CD99' : '#FFB800'}}>
              {profileData?.status || 'Pending'}
            </span>
          </div>

          <div className="profile-section-title">
            <Lock size={18} color="#FF6600" /> CHANGE PASSWORD
          </div>

          <form onSubmit={handlePasswordUpdate}>
            <div style={{marginBottom: '15px'}}>
              <label style={{fontSize: '0.8rem', color: '#A3AED0', marginBottom: '5px', display: 'block'}}>New Password</label>
              <input 
                type="password" 
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                style={{width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E0E5F2', background: '#F4F7FE'}}
              />
            </div>
            <div style={{marginBottom: '15px'}}>
              <label style={{fontSize: '0.8rem', color: '#A3AED0', marginBottom: '5px', display: 'block'}}>Confirm Password</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                style={{width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E0E5F2', background: '#F4F7FE'}}
              />
            </div>

            {msg.text && (
              <div style={{
                padding: '12px', 
                borderRadius: '10px', 
                fontSize: '0.85rem', 
                marginBottom: '15px',
                background: msg.type === 'success' ? '#EBFDF5' : '#FFF5F5',
                color: msg.type === 'success' ? '#059669' : '#DC2626',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {msg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                {msg.text}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isUpdating}
              style={{width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: '#FF6600', color: '#FFF', fontWeight: 'bold', cursor: 'pointer'}}
            >
              {isUpdating ? 'UPDATING...' : 'UPDATE PASSWORD'}
            </button>
          </form>

          <div className="profile-section-title">
            <Paintbrush size={18} color="#FFB800" /> SIDEBAR THEME
          </div>
          
          <div className="theme-selector">
            <div 
              className={`theme-option ${currentTheme === 'classic' ? 'active' : ''}`}
              onClick={() => handleThemeChange('classic')}
            >
              CLASSIC
            </div>
            <div 
              className={`theme-option ${currentTheme === 'theme-home' ? 'active' : ''}`}
              onClick={() => handleThemeChange('theme-home')}
            >
              HOME THEME
            </div>
          </div>
          <p style={{fontSize: '0.75rem', color: '#A3AED0', marginTop: '10px', textAlign: 'center'}}>
            Switch between the standard White theme or the Homepage Black & Gold look.
          </p>

        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
