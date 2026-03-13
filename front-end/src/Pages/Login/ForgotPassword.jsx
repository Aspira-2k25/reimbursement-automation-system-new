import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { passwordAPI } from '../../services/api';
import apshahLogo from '../../assets/images/Apshah_logo.png';
// import websiteLogo from '../../assets/images/Website_logo.png';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState('');

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      setIsLoading(false);
      return;
    }

    try {
      await passwordAPI.forgotPassword(email.trim());
      setSuccess(true);
    } catch (err) {
      setError(err.error || err.message || 'Failed to send reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Branding Section */}
      <motion.div className="w-full lg:w-1/2 relative overflow-hidden flex items-center justify-center min-h-[40vh] lg:min-h-screen" style={{ background: 'linear-gradient(135deg, #3B945E 0%, #57BA98 50%, #65CCB8 100%)' }} {...fadeInUp}>
        {/* College Branding Top Left */}
        <div className="absolute top-6 left-6 z-20 flex items-center gap-3">
          <img src={apshahLogo} alt="A.P. Shah Institute of Technology Logo" className="h-10 w-10 sm:h-12 sm:w-12 object-contain rounded-sm" />
          <span className="font-bold text-white text-sm sm:text-base tracking-wide drop-shadow-md max-w-[200px] leading-tight">
            PCT's A. P. Shah Institute of Technology
          </span>
        </div>

        {/* Decorative geometric shapes */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-16 h-16 bg-white/10 transform rotate-45 rounded-lg animate-rotate-very-slow"></div>
          <div className="absolute top-40 right-32 w-12 h-12 bg-white/10 transform rotate-45 rounded-lg animate-drift-slower"></div>
          <div className="absolute bottom-32 left-16 w-20 h-20 bg-white/10 transform rotate-45 rounded-lg animate-float-slow"></div>
          <div className="absolute bottom-20 right-20 w-8 h-8 bg-white/10 transform rotate-45 rounded-lg animate-drift-slower"></div>
          <div className="absolute top-32 right-16 w-32 h-32 bg-white/10 rounded-full animate-float-slow"></div>
          <div className="absolute bottom-40 left-32 w-24 h-24 bg-white/10 rounded-full animate-drift-slower"></div>
        </div>

        {/* Content */}
        <motion.div className="flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16 relative z-10 text-center" {...fadeInUp}>
          {/* <img src={websiteLogo} alt="Reimbursement Portal Logo" className="h-24 w-24 sm:h-28 sm:w-28 lg:h-32 lg:w-32 object-contain drop-shadow-lg mb-6 lg:mb-8" /> */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 lg:mb-8 leading-tight">
            Forgot Password?
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-white/90 leading-relaxed max-w-md px-4">
            No worries! Enter your email and we'll send you a reset link.
          </p>
        </motion.div>
      </motion.div>

      {/* Right Side - Form Section */}
      <motion.div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8 min-h-[60vh] lg:min-h-screen" style={{ background: '#F2F2F2' }} {...fadeInUp}>
        <div className="w-full max-w-md px-4 sm:px-0">
          <motion.div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-6 sm:p-8" {...fadeInUp}>
            {/* Back to Login */}
            <Link to="/login" className="inline-flex items-center text-sm text-gray-500 hover:text-[#3B945E] transition-colors mb-6">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Login
            </Link>

            {success ? (
              /* Success State */
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold mb-3" style={{ color: '#182628' }}>Check Your Email</h2>
                <p className="text-gray-600 mb-6">
                  If an account exists with <strong>{email}</strong>, we've sent a password reset link. Please check your inbox and spam folder.
                </p>
                <Link
                  to="/login"
                  className="inline-block w-full text-white font-semibold py-3 px-6 rounded-full text-center transition-all duration-200"
                  style={{ background: 'linear-gradient(135deg, #3B945E 0%, #57BA98 50%, #65CCB8 100%)' }}
                >
                  Return to Login
                </Link>
              </div>
            ) : (
              /* Form State */
              <>
                <div className="text-center mb-6 sm:mb-8 flex flex-col items-center">
                  {/* <img src={websiteLogo} alt="Reimbursement System Logo" className="h-20 w-20 sm:h-24 sm:w-24 mb-5 object-contain drop-shadow-md" /> */}
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: '#182628' }}>Reset Password</h2>
                  <p className="text-gray-500 text-sm">Enter your registered email to receive a reset link</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                  {error && (
                    <div className="text-xs sm:text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                      {error}
                    </div>
                  )}

                  {/* Email Input */}
                  <div className="relative">
                    <Mail className={`absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-200 ${focusedField === 'email' ? 'text-[#3B945E]' : 'text-gray-400'}`} />
                    <input
                      type="email"
                      placeholder="Enter your email address"
                      name="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField('')}
                      className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 bg-gray-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B945E]/20 focus:bg-white transition-all duration-200 text-sm sm:text-base text-gray-700 placeholder-gray-500"
                      required
                    />
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
                        Sending...
                      </div>
                    ) : (
                      'Send Reset Link'
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
