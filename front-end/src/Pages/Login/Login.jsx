import React, { useState } from 'react';
import { User, Mail, Lock,} from 'lucide-react';
import { GoogleLogin} from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext.jsx'
import { useNavigate } from 'react-router-dom'


export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [focusedField, setFocusedField] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
    try {
      const { user } = await login(formData.name, formData.password);
      const role = (user?.role || '').toLowerCase();
      if (role === 'coordinator') {
        navigate('/dashboard/coordinator', { replace: true });
      } else if (role === 'faculty') {
        navigate('/dashboard/faculty', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Note: Faculty/Coordinator should authenticate via backend flow.

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Welcome Section */}
      <div className="w-1/2 relative overflow-hidden flex items-center justify-center" style={{background: 'linear-gradient(135deg, var(--color-moss-olive) 0%, var(--color-moss-sage) 50%, var(--color-moss-lime) 100%)'}}>
        {/* Decorative geometric shapes */}
        <div className="absolute inset-0">
          {/* Diamond shapes */}
          <div className="absolute top-20 left-20 w-16 h-16 bg-white/10 transform rotate-45 rounded-lg animate-rotate-very-slow"></div>
          <div className="absolute top-40 right-32 w-12 h-12 bg-white/10 transform rotate-45 rounded-lg animate-drift-slower"></div>
          <div className="absolute bottom-32 left-16 w-20 h-20 bg-white/10 transform rotate-45 rounded-lg animate-float-slow"></div>
          <div className="absolute bottom-20 right-20 w-8 h-8 bg-white/10 transform rotate-45 rounded-lg animate-drift-slower"></div>

          {/* Circles */}
          <div className="absolute top-32 right-16 w-32 h-32 bg-white/10 rounded-full animate-float-slow"></div>
          <div className="absolute bottom-40 left-32 w-24 h-24 bg-white/10 rounded-full animate-drift-slower"></div>
          <div className="absolute top-60 left-40 w-16 h-16 bg-white/10 rounded-full animate-float-slow"></div>
          {/* Extra shapes */}
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-10 h-10 bg-white/10 transform rotate-45 rounded-lg animate-drift-slower"></div>
          <div className="absolute top-1/3 left-10 w-8 h-8 bg-white/10 rounded-full animate-float-slow"></div>
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-14 h-14 bg-white/10 rounded-full animate-drift-slower"></div>
          <div className="absolute top-24 right-10 w-6 h-6 bg-white/10 transform rotate-45 rounded-lg animate-rotate-very-slow"></div>
          <div className="absolute bottom-24 right-36 w-12 h-12 bg-white/10 rounded-full animate-float-slow"></div>
          <div className="absolute top-1/2 left-24 w-9 h-9 bg-white/5 transform rotate-45 rounded-lg animate-drift-slower"></div>
        </div>

        {/* Content */}
        <div className="flex flex-col justify-center items-center p-16 relative z-10 text-center">
          <h1 className="text-5xl font-bold text-white mb-8 leading-tight">
            Welcome Back!
          </h1>
          <p className="text-xl text-white/90 leading-relaxed max-w-md">
            To keep connected with us please login with your personal info
          </p>
        </div>
      </div>

      {/* Right Side - Form Section */}
      <div className="w-1/2 bg-gray-50 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2" style={{color: '#636B2F'}}>
                Login In
              </h2>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {error}
                </div>
              )}
              {/* Name Input */}
              <div className="relative">
                <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-200 ${
                  focusedField === 'name' ? 'text-[#636B2F]' : 'text-gray-400'
                }`} />
                <input
                  type="text"
                  placeholder="Username"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField('')}
                  className="w-full pl-12 pr-4 py-4 bg-gray-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#636B2F]/20 focus:bg-white transition-all duration-200 text-gray-700 placeholder-gray-500"
                />
              </div>

              {/* Email Input */}
              <div className="relative">
                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-200 ${
                  focusedField === 'email' ? 'text-[#636B2F]' : 'text-gray-400'
                }`} />
                <input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField('')}
                  className="w-full pl-12 pr-4 py-4 bg-gray-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#636B2F]/20 focus:bg-white transition-all duration-200 text-gray-700 placeholder-gray-500"
                />
              </div>

              {/* Password Input */}
              <div className="relative">
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-200 ${
                  focusedField === 'password' ? 'text-[#636B2F]' : 'text-gray-400'
                }`} />
                <input
                  type="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField('')}
                  className="w-full pl-12 pr-4 py-4 bg-gray-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#636B2F]/20 focus:bg-white transition-all duration-200 text-gray-700 placeholder-gray-500"
                />
              </div>

              {/* Social Login Text */}
              <div className="text-center py-4">
                <p className="text-gray-400 text-sm">
                  or use google account to sign in
                </p>
              </div>

              {/* Social Icons */}
              <div className="flex justify-center mb-6">
                <GoogleLogin
                  onSuccess={async (credentialResponse) => {
                    try {
                      const credential = credentialResponse?.credential;
                      if (!credential) {
                        throw new Error('No Google credential received');
                      }
                      const { user } = await loginWithGoogle(credential);
                      if (user?.role === 'Coordinator') {
                        navigate('/dashboard/coordinator', { replace: true });
                      } else if (user?.role === 'Faculty') {
                        navigate('/dashboard/faculty', { replace: true });
                      } else {
                        navigate('/dashboard', { replace: true });
                      }
                    } catch (err) {
                      setError(err.message || 'Google login failed. Please try again.');
                    }
                  }}
                  onError={() => {
                    setError('Google login failed. Please try again.');
                  }}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full text-white font-semibold py-4 px-6 rounded-full transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                style={{
                  background: 'linear-gradient(135deg, var(--color-moss-olive) 0%, var(--color-moss-sage) 50%, var(--color-moss-lime) 100%)',
                  boxShadow: '0 4px 15px rgba(61, 65, 39, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, var(--color-moss-deep) 0%, var(--color-moss-sage) 50%, var(--color-moss-lime) 100%)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, var(--color-moss-olive) 0%, var(--color-moss-sage) 50%, var(--color-moss-lime) 100%)';
                }}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></div>
                    Loging in...
                  </div>
                ) : (
                  'LOG IN'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}