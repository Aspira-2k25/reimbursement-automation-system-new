import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { authAPI } from '../../services/api';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token } = useParams();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [focusedField, setFocusedField] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      await authAPI.resetPassword(token, formData.password);
      setSuccess('Password has been reset successfully. Redirecting to login...');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    } catch (err) {
      setError(err.error || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8" style={{ background: '#F2F2F2' }}>
      <div className="w-full max-w-md px-4 sm:px-0">
        <motion.div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-6 sm:p-8" {...fadeInUp}>
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: '#182628' }}>
              Set New Password
            </h2>
            <p className="text-gray-500 text-sm">Please enter your new password below.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {error && (
              <div className="text-xs sm:text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}
            {success && (
              <div className="text-xs sm:text-sm text-green-600 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                {success}
              </div>
            )}

            <div className="relative">
              <Lock className={`absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-200 ${focusedField === 'password' ? 'text-[#3B945E]' : 'text-gray-400'}`} />
              <input
                type="password"
                placeholder="New Password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField('')}
                className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 bg-gray-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B945E]/20 focus:bg-white transition-all duration-200 text-sm sm:text-base text-gray-700 placeholder-gray-500"
                required
              />
            </div>

            <div className="relative">
              <Lock className={`absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-200 ${focusedField === 'confirmPassword' ? 'text-[#3B945E]' : 'text-gray-400'}`} />
              <input
                type="password"
                placeholder="Confirm New Password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => setFocusedField('')}
                className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 bg-gray-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B945E]/20 focus:bg-white transition-all duration-200 text-sm sm:text-base text-gray-700 placeholder-gray-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || success}
              className="w-full text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-full transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none text-sm sm:text-base"
              style={{
                background: 'linear-gradient(135deg, #3B945E 0%, #57BA98 50%, #65CCB8 100%)',
                boxShadow: '0 4px 15px rgba(59, 148, 94, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'linear-gradient(135deg, #182628 0%, #3B945E 50%, #57BA98 100%)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'linear-gradient(135deg, #3B945E 0%, #57BA98 50%, #65CCB8 100%)';
              }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></div>
                  Resetting...
                </div>
              ) : (
                'RESET PASSWORD'
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
