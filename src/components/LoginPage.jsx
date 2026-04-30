import React, { useState, useEffect } from 'react';
import { Smartphone, Lock, Eye, EyeOff } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import logo from '../assets/logo.png';
import '../auth.css';

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate('/home');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Virtual email logic: phone@swamiji.com
      const virtualEmail = `${phone}@swamiji.com`;
      await signInWithEmailAndPassword(auth, virtualEmail, password);
      console.log('Login successful');
      navigate('/home');
    } catch (err) {
      console.error('Login Error:', err.code, err.message);
      if (err.code === 'auth/configuration-not-found') {
        setError('CRITICAL: Email/Password login is not enabled in your Firebase Console. Please go to Authentication > Sign-in Method and enable Email/Password.');
      } else {
        setError('Invalid phone number or password');
      }
    } finally {
      setLoading(false);
    }
  };

  // SVG for WhatsApp Logo
  const WhatsAppIcon = () => (
    <svg 
      viewBox="0 0 24 24" 
      width="24" 
      height="24" 
      fill="currentColor" 
      style={{ color: '#25D366' }}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.148-.67-1.611-.918-2.208-.242-.588-.487-.508-.67-.517-.172-.008-.37-.01-.567-.01-.197 0-.518.074-.79.37-.272.296-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-4.821 4.754a8.117 8.117 0 01-4.077-1.096l-.293-.174-3.04.797.81-2.96-.192-.306a8.137 8.137 0 01-1.246-4.322c0-4.49 3.655-8.146 8.147-8.146 2.176 0 4.223.847 5.761 2.387 1.539 1.54 2.385 3.587 2.385 5.759 0 4.49-3.656 8.147-8.147 8.147m0-19.622C7.759 0 3.843 3.916 3.843 8.799c0 1.558.406 3.08 1.179 4.42L2.34 19.303l6.236-1.636a8.736 8.736 0 004.073 1.132C17.53 18.799 21.45 14.883 21.45 10c0-2.326-.905-4.513-2.548-6.157A8.67 8.67 0 0012.651 1.278z" />
    </svg>
  );

  return (
    <div className="login-container">
      <div className="logo-section">
        <div className="logo-box">
          <img src={logo} alt="Swami Ji Matka Logo" />
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form className="registration-form" onSubmit={handleLogin}>
        <div className="input-group">
          <span className="input-icon">
            <Smartphone size={20} />
          </span>
          <input 
            type="tel" 
            placeholder="Mobile Number" 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required 
          />
        </div>

        <div className="input-group">
          <span className="input-icon">
            <Lock size={20} />
          </span>
          <input 
            type={showPassword ? "text" : "password"} 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
          />
          <button 
            type="button" 
            className="toggle-password" 
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <div className="forgot-password">
          <a href="#" className="whatsapp-help">
            <WhatsAppIcon />
            <span>FORGOT PASSWORD? CONTACT ADMIN</span>
          </a>
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Logging in...' : 'Login Now'}
        </button>
      </form>

      <div className="auth-footer">
        <p>Don't have an account? <Link to="/register">Register Now</Link></p>
      </div>
    </div>
  );
}

export default LoginPage;
