// pages/auth/SignIn.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiMail, FiLock, FiEye, FiEyeOff, FiCheckCircle } from 'react-icons/fi';
import AnimatedGridBackground from '../../components/AnimatedGridBackground';

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [backendError, setBackendError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check for verified email success message
  useEffect(() => {
    const verified = searchParams.get('verified');
    if (verified === 'true') {
      setSuccessMessage('Email verified successfully! Please sign in.');
    }
  }, [searchParams]);

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBackendError('');
    setSuccessMessage('');
    
    if (!validate()) return;
    
    setIsLoading(true);
    
    try {
      const result = await login(email, password);

      console.log(result)
      
      if (result.success) {
        navigate('/ai');
        console.log(result)
      } else {
        // Handle specific backend error messages
        if (result.message?.toLowerCase().includes('not verified')) {
          setBackendError('Please verify your email first. Check your inbox for the verification code.');
          // Option to navigate to verify page
          setTimeout(() => {
            navigate(`/verify-email?email=${encodeURIComponent(email)}`);
          }, 2000);
        } else if (result.message?.toLowerCase().includes('invalid credentials')) {
          setBackendError('Invalid email or password. Please try again.');
        } else if (result.message?.toLowerCase().includes('not found')) {
          setBackendError('No account found with this email. Please sign up first.');
        } else {
          setBackendError(result.message || 'Login failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('[SignIn] Login error:', error);
      setBackendError('Unable to connect to server. Please check your internet connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // Clear individual field errors when user types
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (errors.email) setErrors({ ...errors, email: '' });
    if (backendError) setBackendError('');
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (errors.password) setErrors({ ...errors, password: '' });
    if (backendError) setBackendError('');
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center py-20 bg-[#f8f8f8] overflow-hidden">
      {/* Grid Background */}
      <AnimatedGridBackground/>
      <div className="absolute top-6 left-6 flex items-center text-2xl font-semibold">
        <img onClick={() => navigate(-1)} src="/logo.png" alt="" className='w-15 h-15 cursor-pointer mb-2'/>trixia
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-gray-100/50">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-[#1a1a1a] font-serif-brand">
              Welcome Back
            </h2>
            <p className="text-[#666666] mt-2 text-sm">
              Sign in to continue shopping smarter
            </p>
          </div>

          {/* Success Message (e.g., after email verification) */}
          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl mb-4 text-sm flex items-start gap-2">
              <FiCheckCircle className="text-emerald-500 mt-0.5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Backend Error */}
          {backendError && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl mb-4 text-sm">
              {backendError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#333333] mb-1.5">Email</label>
              <div className={`relative transition-all ${errors.email ? 'ring-1 ring-red-500 rounded-xl' : ''}`}>
                <FiMail className="absolute left-3.5 top-3.5 text-[#999999]" />
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009FB8] transition ${
                    errors.email ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="you@example.com"
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-xs mt-1.5">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#333333] mb-1.5">Password</label>
              <div className={`relative transition-all ${errors.password ? 'ring-1 ring-red-500 rounded-xl' : ''}`}>
                <FiLock className="absolute left-3.5 top-3.5 text-[#999999]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009FB8] transition ${
                    errors.password ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="Enter your password"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-[#999999] hover:text-[#666666] transition"
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1.5">{errors.password}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-[#666666] cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#009FB8] focus:ring-[#009FB8]" />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-sm text-[#009FB8] hover:underline font-medium">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#1a1a1a] text-white py-3 rounded-xl font-semibold hover:bg-[#333333] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-[#666666] mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-[#009FB8] font-semibold hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignIn;