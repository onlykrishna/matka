import React, { useState, useEffect } from 'react';
import { User, Smartphone, Lock, Eye, EyeOff } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import logo from '../assets/logo.png';
import '../auth.css';

function RegistrationPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (phone.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const virtualEmail = `${phone}@swamiji.com`;
      const userCredential = await createUserWithEmailAndPassword(auth, virtualEmail, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: name,
        phone: phone,
        wallet_balance: 0,
        role: 'user',
        status: 'pending',
        created_at: serverTimestamp()
      });

      navigate('/home');
    } catch (err) {
      console.error('Registration Error:', err.code, err.message);
      if (err.code === 'auth/configuration-not-found') {
        setError('CRITICAL: Email/Password login is not enabled in your Firebase Console. Please go to Authentication > Sign-in Method and enable Email/Password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This phone number is already registered');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registration-container">
      <div className="logo-section">
        <div className="logo-box">
          <img src={logo} alt="Swami Ji Matka Logo" />
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form className="registration-form" onSubmit={handleRegister}>
        <div className="input-group">
          <span className="input-icon">
            <User size={20} />
          </span>
          <input 
            type="text" 
            placeholder="Full Name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required 
          />
        </div>

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

        <div className="input-group">
          <span className="input-icon">
            <Lock size={20} />
          </span>
          <input 
            type={showConfirmPassword ? "text" : "password"} 
            placeholder="Confirm Password" 
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required 
          />
          <button 
            type="button" 
            className="toggle-password" 
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Registering...' : 'Register Now'}
        </button>
      </form>

      <div className="auth-footer">
        <p>Already have an account? <Link to="/login">Login Now</Link></p>
      </div>
    </div>
  );
}

export default RegistrationPage;
