import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { passwordAPI } from '../../services/api';
import apshahLogo from '../../assets/images/Apshah_logo.png';
import websiteLogo from '../../assets/images/Website_logo.png';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState({ new: false, confirm: false });
  const [focusedField, setFocusedField] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenInvalid, setTokenInvalid] = useState(false);

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  useEffect(() => {
    if (!token) {
      setTokenInvalid(true);
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      await passwordAPI.resetPassword(token, formData.newPassword, formData.confirmPassword);
      setSuccess(true);
    } catch (err) {
      setError(err.error || err.message || 'Failed to reset password. The link may be invalid or expired.');
    } finally {
      setIsLoading(false);
    }
  };

  // Invalid/missing token state
  if (tokenInvalid) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F2F2F2' }}>
        <motion.div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 text-center" {...fadeInUp}>
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-gray-800">Invalid Reset Link</h2>
          <p className="text-gray-600 mb-6">This password reset link is invalid or missing. Please request a new one.</p>
          <Link
            to="/forgot-password"
            className="inline-block w-full text-white font-semibold py-3 px-6 rounded-full text-center transition-all duration-200 mb-3"
            style={{ background: 'linear-gradient(135deg, #3B945E 0%, #57BA98 50%, #65CCB8 100%)' }}
          >
            Request New Reset Link
          </Link>
          <Link to="/login" className="text-sm text-gray-500 hover:text-[#3B945E] transition-colors">
            Back to Login
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Branding */}
      <motion.div className="w-full lg:w-1/2 relative overflow-hidden flex items-center justify-center min-h-[40vh] lg:min-h-screen" style={{ background: 'linear-gradient(135deg, #3B945E 0%, #57BA98 50%, #65CCB8 100%)' }} {...fadeInUp}>
        <div className="absolute top-6 left-6 z-20 flex items-center gap-3">
          <img src={apshahLogo} alt="A.P. Shah Institute of Technology Logo" className="h-10 w-10 sm:h-12 sm:w-12 object-contain rounded-sm" />
          <span className="font-bold text-white text-sm sm:text-base tracking-wide drop-shadow-md max-w-[200px] leading-tight">
            PCT's A. P. Shah Institute of Technology
          </span>
        </div>

        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-16 h-16 bg-white/10 transform rotate-45 rounded-lg animate-rotate-very-slow"></div>
          <div className="absolute top-40 right-32 w-12 h-12 bg-white/10 transform rotate-45 rounded-lg animate-drift-slower"></div>
          <div className="absolute bottom-32 left-16 w-20 h-20 bg-white/10 transform rotate-45 rounded-lg animate-float-slow"></div>
          <div className="absolute top-32 right-16 w-32 h-32 bg-white/10 rounded-full animate-float-slow"></div>
          <div className="absolute bottom-40 left-32 w-24 h-24 bg-white/10 rounded-full animate-drift-slower"></div>
        </div>

        <motion.div className="flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16 relative z-10 text-center" {...fadeInUp}>
          <img src={websiteLogo} alt="Reimbursement Portal Logo" className="h-24 w-24 sm:h-28 sm:w-28 lg:h-32 lg:w-32 object-contain drop-shadow-lg mb-6 lg:mb-8" />
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 lg:mb-8 leading-tight">
            Set New Password
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-white/90 leading-relaxed max-w-md px-4">
            Choose a strong password to secure your account
          </p>
        </motion.div>
      </motion.div>

      {/* Right Side - Form */}
      <motion.div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8 min-h-[60vh] lg:min-h-screen" style={{ background: '#F2F2F2' }} {...fadeInUp}>
        <div className="w-full max-w-md px-4 sm:px-0">
          <motion.div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-6 sm:p-8" {...fadeInUp}>
            {success ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold mb-3" style={{ color: '#182628' }}>Password Reset!</h2>
                <p className="text-gray-600 mb-6">Your password has been reset successfully. You can now log in with your new password.</p>
                <Link
                  to="/login"
                  className="inline-block w-full text-white font-semibold py-3 px-6 rounded-full text-center transition-all duration-200"
                  style={{ background: 'linear-gradient(135deg, #3B945E 0%, #57BA98 50%, #65CCB8 100%)' }}
                >
                  Go to Login
                </Link>
              </div>
            ) : (
              <>
                <div className="text-center mb-6 sm:mb-8 flex flex-col items-center">
                  <img src={websiteLogo} alt="Reimbursement System Logo" className="h-20 w-20 sm:h-24 sm:w-24 mb-5 object-contain drop-shadow-md" />
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: '#182628' }}>New Password</h2>
                  <p className="text-gray-500 text-sm">Enter and confirm your new password</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                  {error && (
                    <div className="text-xs sm:text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                      {error}
                    </div>
                  )}

                  {/* New Password */}
                  <div className="relative">
                    <Lock className={`absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-200 ${focusedField === 'newPassword' ? 'text-[#3B945E]' : 'text-gray-400'}`} />
                    <input
                      type={showPassword.new ? "text" : "password"}
                      placeholder="New Password"
                      value={formData.newPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                      onFocus={() => setFocusedField('newPassword')}
                      onBlur={() => setFocusedField('')}
                      className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-3 sm:py-4 bg-gray-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B945E]/20 focus:bg-white transition-all duration-200 text-sm sm:text-base text-gray-700 placeholder-gray-500"
                      required
                      minLength={6}
                    />
                    <button type="button" onClick={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))} className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#3B945E] transition-colors duration-200 focus:outline-none">
                      {showPassword.new ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>
                  </div>

                  {/* Confirm Password */}
                  <div className="relative">
                    <Lock className={`absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-200 ${focusedField === 'confirmPassword' ? 'text-[#3B945E]' : 'text-gray-400'}`} />
                    <input
                      type={showPassword.confirm ? "text" : "password"}
                      placeholder="Confirm Password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      onFocus={() => setFocusedField('confirmPassword')}
                      onBlur={() => setFocusedField('')}
                      className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-3 sm:py-4 bg-gray-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B945E]/20 focus:bg-white transition-all duration-200 text-sm sm:text-base text-gray-700 placeholder-gray-500"
                      required
                      minLength={6}
                    />
                    <button type="button" onClick={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))} className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#3B945E] transition-colors duration-200 focus:outline-none">
                      {showPassword.confirm ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-full transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none text-sm sm:text-base"
                    style={{
                      background: 'linear-gradient(135deg, #3B945E 0%, #57BA98 50%, #65CCB8 100%)',
                      boxShadow: '0 4px 15px rgba(59, 148, 94, 0.3)'
                    }}
                    onMouseEnter={(e) => { e.target.style.background = 'linear-gradient(135deg, #182628 0%, #3B945E 50%, #57BA98 100%)'; }}
                    onMouseLeave={(e) => { e.target.style.background = 'linear-gradient(135deg, #3B945E 0%, #57BA98 50%, #65CCB8 100%)'; }}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></div>
                        Resetting...
                      </div>
                    ) : (
                      'Reset Password'
                    )}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
