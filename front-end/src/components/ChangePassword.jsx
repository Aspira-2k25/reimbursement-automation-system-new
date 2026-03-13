import React, { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, KeyRound, Mail, CheckCircle } from 'lucide-react';
import { passwordAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function ChangePassword() {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    otp: ''
  });
  const [showPassword, setShowPassword] = useState({ old: false, new: false, confirm: false });
  const [isLoading, setIsLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const timerRef = useRef(null);

  // OTP countdown timer
  useEffect(() => {
    if (otpCountdown > 0) {
      timerRef.current = setTimeout(() => setOtpCountdown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [otpCountdown]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleSendOtp = async () => {
    setOtpSending(true);
    setError('');
    try {
      await passwordAPI.sendOtp();
      setOtpSent(true);
      setOtpCountdown(300); // 5 minutes = 300 seconds
      toast.success('OTP sent to your registered email');
    } catch (err) {
      setError(err.error || err.message || 'Failed to send OTP');
      toast.error(err.error || 'Failed to send OTP');
    } finally {
      setOtpSending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Client-side validation
    if (!formData.oldPassword) {
      setError('Please enter your current password');
      setIsLoading(false);
      return;
    }
    if (formData.newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New password and confirm password do not match');
      setIsLoading(false);
      return;
    }
    if (!formData.otp || formData.otp.length !== 6) {
      setError('Please enter the 6-digit OTP');
      setIsLoading(false);
      return;
    }

    try {
      await passwordAPI.changePassword(
        formData.oldPassword,
        formData.newPassword,
        formData.confirmPassword,
        formData.otp
      );
      setSuccess(true);
      toast.success('Password changed successfully!');
      // Reset form
      setFormData({ oldPassword: '', newPassword: '', confirmPassword: '', otp: '' });
      setOtpSent(false);
      setOtpCountdown(0);
    } catch (err) {
      const message = err.error || err.message || 'Failed to change password';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCountdown = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto p-4 sm:p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-gray-800">Password Changed!</h2>
          <p className="text-gray-600 mb-6">Your password has been updated successfully. Use your new password the next time you log in.</p>
          <button
            onClick={() => setSuccess(false)}
            className="text-sm text-[#3B945E] hover:underline"
          >
            Change password again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3B945E, #65CCB8)' }}>
            <KeyRound className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Change Password</h2>
            <p className="text-sm text-gray-500">Update your account password securely</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {/* Old Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPassword.old ? "text" : "password"}
                placeholder="Enter current password"
                value={formData.oldPassword}
                onChange={(e) => handleChange('oldPassword', e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B945E]/20 focus:border-[#3B945E] transition-all text-sm"
                required
              />
              <button type="button" onClick={() => setShowPassword(prev => ({ ...prev, old: !prev.old }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#3B945E] transition-colors">
                {showPassword.old ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPassword.new ? "text" : "password"}
                placeholder="Enter new password (min 8 characters)"
                value={formData.newPassword}
                onChange={(e) => handleChange('newPassword', e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B945E]/20 focus:border-[#3B945E] transition-all text-sm"
                required
                minLength={8}
              />
              <button type="button" onClick={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#3B945E] transition-colors">
                {showPassword.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPassword.confirm ? "text" : "password"}
                placeholder="Re-enter new password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B945E]/20 focus:border-[#3B945E] transition-all text-sm"
                required
                minLength={8}
              />
              <button type="button" onClick={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#3B945E] transition-colors">
                {showPassword.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* OTP Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">OTP Verification</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={formData.otp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    handleChange('otp', val);
                  }}
                  className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B945E]/20 focus:border-[#3B945E] transition-all text-sm tracking-widest font-mono"
                  maxLength={6}
                  inputMode="numeric"
                  required
                />
              </div>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={otpSending || otpCountdown > 0}
                className="px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: otpCountdown > 0 ? '#e5e7eb' : 'linear-gradient(135deg, #3B945E, #65CCB8)',
                  color: otpCountdown > 0 ? '#6b7280' : 'white'
                }}
              >
                {otpSending ? (
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Sending
                  </div>
                ) : otpCountdown > 0 ? (
                  `Resend (${formatCountdown(otpCountdown)})`
                ) : otpSent ? (
                  'Resend OTP'
                ) : (
                  'Send OTP'
                )}
              </button>
            </div>
            {otpSent && otpCountdown > 0 && (
              <p className="text-xs text-green-600 mt-1">OTP sent to your registered email. Valid for {formatCountdown(otpCountdown)}.</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !otpSent}
            className="w-full text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none text-sm mt-2"
            style={{
              background: 'linear-gradient(135deg, #3B945E 0%, #57BA98 50%, #65CCB8 100%)',
              boxShadow: '0 4px 15px rgba(59, 148, 94, 0.2)'
            }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></div>
                Changing Password...
              </div>
            ) : (
              'Change Password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
