import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  User, 
  Plus, 
  CheckCircle2, 
  X,
  Edit2,
  AlertCircle
} from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const BankDetailsPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [kycData, setKycData] = useState({
    phonepe: '',
    gpay: '',
    paytm: '',
    bhim: '',
    status: 'incomplete'
  });

  // Modal State
  const [modal, setModal] = useState({ isOpen: false, type: '', value: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      if (!u) {
        navigate('/login');
        return;
      }
      setUser(u);
      
      const unsubscribeDoc = onSnapshot(doc(db, "bank_details", u.uid), (docSnap) => {
        if (docSnap.exists()) {
          setKycData(docSnap.data());
        }
        setLoading(false);
      });
      
      return () => unsubscribeDoc();
    });
    
    return () => unsubscribeAuth();
  }, [navigate]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      // Logic for Status: If any field is filled, or if you want ALL filled? 
      // User said "incomplete and complete only". I'll mark COMPLETE if at least one is filled for now, 
      // or maybe there is a 'status' field controlled by admin. 
      // Let's stick to the UI: Status depends on whether they have filled their info.
      const hasAny = modal.value.trim() !== '' || kycData.phonepe || kycData.gpay || kycData.paytm || kycData.bhim;
      
      const newData = {
        ...kycData,
        [modal.type]: modal.value,
        status: hasAny ? 'complete' : 'incomplete',
        updated_at: new Date()
      };

      await setDoc(doc(db, "bank_details", user.uid), newData);
      setModal({ isOpen: false, type: '', value: '' });
    } catch (err) {
      console.error("Save Error:", err);
      alert("Failed to save details. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const services = [
    { id: 'phonepe', label: 'PhonePe', color: '#5f259f' },
    { id: 'gpay', label: 'Google Pay', color: '#4285F4' },
    { id: 'paytm', label: 'Paytm', color: '#00BAF2' },
    { id: 'bhim', label: 'BHIM UPI', color: '#e57e24' }
  ];

  if (loading) {
    return (
      <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAFA'}}>
        <div className="spinner"></div>
      </div>
    );
  }

  const isComplete = kycData.status === 'complete';

  return (
    <div className="kyc-container">
      {/* Top Header */}
      <div style={{background: '#FFC107', padding: '15px', display: 'flex', alignItems: 'center', gap: '15px'}}>
        <button onClick={() => navigate('/home')} style={{background: 'white', border: 'none', borderRadius: '5px', padding: '5px', display: 'flex'}}>
          <ChevronLeft size={20} color="#000" />
        </button>
        <h1 style={{fontSize: '1.2rem', margin: 0, fontWeight: '900', color: '#000'}}>UPI KYC</h1>
      </div>

      <div className="kyc-note">
        Note: Fill details carefully. We are not responsible for wrong details.
      </div>

      {/* Main Header Box */}
      <div style={{
        background: '#D32F2F', 
        margin: '15px', 
        padding: '18px', 
        borderRadius: '10px', 
        color: 'white', 
        display: 'flex', 
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 4px 15px rgba(211, 47, 47, 0.3)'
      }}>
        <div style={{background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '50%'}}>
          <User size={24} />
        </div>
        <span style={{fontWeight: '900', fontSize: '1.1rem'}}>UPI DETAILS</span>
      </div>

      {/* Status Badge Section */}
      <div style={{textAlign: 'center', marginBottom: '20px'}}>
        <div style={{
          display: 'inline-block',
          border: `2px solid ${isComplete ? '#2E7D32' : '#D32F2F'}`,
          padding: '5px 15px',
          borderRadius: '5px',
          color: isComplete ? '#2E7D32' : '#D32F2F',
          fontWeight: '900',
          fontSize: '0.8rem'
        }}>
          STATUS: {isComplete ? 'COMPLETE' : 'INCOMPLETE'}
        </div>
        <div style={{marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '0.9rem', fontWeight: '800', color: '#D32F2F'}}>
          <span>👁 View</span>
          <span>📝 Edit</span>
        </div>
      </div>

      {/* Services List */}
      <div className="kyc-list">
        {services.map((s) => (
          <div key={s.id} className="kyc-service-item">
            <div className="service-logo-box">
              <div style={{
                width: '36px', 
                height: '36px', 
                background: s.color, 
                borderRadius: '8px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '0.7rem'
              }}>
                {s.label.substring(0,2)}
              </div>
              <div>
                <div className="service-label">{s.label}</div>
                {kycData[s.id] && (
                  <div style={{fontSize: '0.8rem', color: '#666', marginTop: '2px'}}>
                    {kycData[s.id]}
                  </div>
                )}
              </div>
            </div>
            
            <button 
              className="add-upi-btn"
              onClick={() => setModal({ isOpen: true, type: s.id, value: kycData[s.id] || '' })}
            >
              {kycData[s.id] ? <Edit2 size={16} /> : <Plus size={18} />}
            </button>
          </div>
        ))}
      </div>

      {/* Bottom Floating Nav Adjustment */}
      <div style={{padding: '20px', textAlign: 'center'}}>
        <p style={{fontSize: '0.8rem', color: '#999'}}>Secure encrypted storage for your payment details.</p>
      </div>

      {/* UPI Editor Modal */}
      {modal.isOpen && (
        <div className="upi-modal-overlay" onClick={() => setModal({ ...modal, isOpen: false })}>
          <div className="upi-modal-content" onClick={e => e.stopPropagation()}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h3 style={{textTransform: 'uppercase', color: '#333'}}>Update {modal.type} ID</h3>
              <button onClick={() => setModal({ ...modal, isOpen: false })} style={{background: 'none', border: 'none'}}><X /></button>
            </div>
            
            <div style={{marginBottom: '20px'}}>
              <label style={{display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '8px'}}>Enter UPI ID/Mobile Number</label>
              <input 
                type="text" 
                autoFocus
                value={modal.value}
                onChange={e => setModal({ ...modal, value: e.target.value })}
                placeholder="e.g. 9876543210@ybl"
                style={{
                  width: '100%', 
                  padding: '15px', 
                  borderRadius: '12px', 
                  border: '1px solid #DDD',
                  fontSize: '1rem',
                  outline: 'none'
                }}
              />
            </div>

            <button 
              onClick={handleSave}
              disabled={isSaving}
              style={{
                width: '100%', 
                padding: '15px', 
                borderRadius: '12px', 
                border: 'none', 
                background: '#FF6600', 
                color: 'white', 
                fontWeight: '900',
                fontSize: '1rem'
              }}
            >
              {isSaving ? 'SAVING...' : 'SAVE DETAILS'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankDetailsPage;
