import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { authAPI } from '../services/api';

export default function ChangePassword() {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    otp: ''
  });
  
  const [step, setStep] = useState(1); // 1: Request OTP, 2: Verify & Change Password
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRequestOTP = async () => {
    if (!formData.oldPassword || !formData.newPassword || !formData.confirmPassword) {
      toast.error("Please fill all password fields before requesting OTP.");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.requestChangePasswordOtp();
      toast.success("OTP sent to your email!");
      setStep(2);
    } catch (error) {
      toast.error(error.error || "Failed to send OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!formData.otp) {
      toast.error("Please enter the OTP.");
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.verifyChangePassword(
        formData.oldPassword,
        formData.newPassword,
        formData.otp
      );
      toast.success("Password changed successfully!");
      // Reset form
      setFormData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
        otp: ''
      });
      setStep(1);
    } catch (error) {
      toast.error(error.error || "Failed; invalid OTP or old password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-8 pt-6 border-t border-slate-200">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold">Change Password</h2>
        <p className="text-slate-600 mt-1 text-sm sm:text-base">
          Update your account password securely using email verification.
        </p>
      </div>

      <form className="grid grid-cols-1 gap-3 sm:gap-4 max-w-lg" onSubmit={step === 2 ? handleChangePassword : (e) => e.preventDefault()}>
        <label className="grid gap-1">
          <span className="text-sm text-slate-600">Old Password</span>
          <input 
            type="password"
            className="input w-full p-2 border rounded" 
            value={formData.oldPassword} 
            onChange={(e) => handleInputChange('oldPassword', e.target.value)} 
            disabled={step === 2}
            required 
          />
        </label>
        
        <label className="grid gap-1">
          <span className="text-sm text-slate-600">New Password</span>
          <input 
            type="password"
            className="input w-full p-2 border rounded" 
            value={formData.newPassword} 
            onChange={(e) => handleInputChange('newPassword', e.target.value)} 
            disabled={step === 2}
            required 
          />
        </label>
        
        <label className="grid gap-1">
          <span className="text-sm text-slate-600">Re-enter New Password</span>
          <input 
            type="password"
            className="input w-full p-2 border rounded" 
            value={formData.confirmPassword} 
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)} 
            disabled={step === 2}
            required 
          />
        </label>

        {step === 2 && (
          <label className="grid gap-1">
            <span className="text-sm text-slate-600">OTP (Sent to email)</span>
            <input 
              type="text"
              className="input w-full p-2 border rounded text-center tracking-widest font-mono" 
              value={formData.otp} 
              onChange={(e) => handleInputChange('otp', e.target.value)} 
              placeholder="------"
              maxLength={6}
              required 
            />
          </label>
        )}

        <div className="flex items-center justify-end gap-2 sm:gap-3 mt-2 sm:mt-4">
          {step === 1 ? (
             <button
               type="button"
               onClick={handleRequestOTP}
               className="btn btn-primary w-full sm:w-auto bg-[#3B945E] text-white px-4 py-2 rounded hover:bg-[#2c6e45] transition-colors"
               disabled={isLoading}
             >
               {isLoading ? "Requesting..." : "Send OTP to Email"}
             </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn btn-outline border-slate-300 text-slate-700 px-4 py-2 rounded hover:bg-slate-50 transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary bg-[#3B945E] text-white px-4 py-2 rounded hover:bg-[#2c6e45] transition-colors"
                disabled={isLoading}
              >
                {isLoading ? "Verifying..." : "Change Password"}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
