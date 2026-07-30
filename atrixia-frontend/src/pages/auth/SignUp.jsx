// pages/auth/SignUp.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser } from 'react-icons/fi';
import AnimatedGridBackground from '../../components/AnimatedGridBackground';

const SignUp = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [backendError, setBackendError] = useState('');
  const { signup } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const newErrors = {};
    
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    else if (formData.fullName.trim().length < 2) newErrors.fullName = 'Name must be at least 2 characters';
    else if (typeof formData.fullName !== 'string') newErrors.fullName = 'Invalid name format';
    
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBackendError('');
    
    if (!validate()) return;
    
    setIsLoading(true);
    
    try {
      const result = await signup({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password
      });
      
      if (result.success) {
        sessionStorage.setItem('verificationEmail', formData.email.trim());
        navigate('/verify-email');
      } else {
        if (result.message?.toLowerCase().includes('already exists')) {
          setBackendError('An account with this email already exists. Please sign in instead.');
        } else if (result.message?.toLowerCase().includes('invalid email')) {
          setErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
        } else if (result.message?.toLowerCase().includes('password')) {
          setErrors(prev => ({ ...prev, password: result.message }));
        } else {
          setBackendError(result.message || 'Signup failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('[SignUp] Signup error:', error);
      setBackendError('Unable to connect to server. Please check your internet connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors({ ...errors, [name]: '' });
    if (backendError) setBackendError('');
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center md:py-20 bg-[#f8f8f8] overflow-hidden">
      <AnimatedGridBackground/>
      
      <div className="absolute top-4 left-4 z-20 flex items-center text-2xl font-semibold">
        <img 
          onClick={() => navigate(-1)} 
          src="/logo.png" 
          alt="Logo" 
          className="w-12 h-12 cursor-pointer mb-2" 
        />
        trixia
      </div>

      <div className="relative z-10 w-full h-screen md:h-fit max-w-md md:px-4 px-0">
        <div className="md:bg-white/30 pb-20 md:pb-0 mt-10 md:mt-0 h-full backdrop-blur-xs md:p-6 p-8 md:rounded-2xl shadow-xl border border-gray-100/50 flex items-center">
          <div className="w-full">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-[#1a1a1a] font-serif-brand">
                Create Account
              </h2>
              <p className="text-[#666666] mt-2 text-sm">
                Join Atrixia and start shopping smarter
              </p>
            </div>

            {backendError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl mb-4 text-sm">
                {backendError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#333333] mb-1.5">Full Name</label>
                <div className={`relative transition-all ${errors.fullName ? 'ring-1 ring-red-500 rounded-xl' : ''}`}>
                  <FiUser className="absolute left-3.5 top-3.5 text-[#999999]" />
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 bg-white/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009FB8] transition ${
                      errors.fullName ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="John Doe"
                    disabled={isLoading}
                    autoComplete="name"
                  />
                </div>
                {errors.fullName && (
                  <p className="text-red-500 text-xs mt-1.5">{errors.fullName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#333333] mb-1.5">Email</label>
                <div className={`relative transition-all ${errors.email ? 'ring-1 ring-red-500 rounded-xl' : ''}`}>
                  <FiMail className="absolute left-3.5 top-3.5 text-[#999999]" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 bg-white/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009FB8] transition ${
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#333333] mb-1.5">Password</label>
                  <div className={`relative transition-all ${errors.password ? 'ring-1 ring-red-500 rounded-xl' : ''}`}>
                    <FiLock className="absolute left-3.5 top-3.5 text-[#999999]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`w-full pl-10 pr-12 py-3 bg-white/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009FB8] transition ${
                        errors.password ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="Min 8 characters"
                      disabled={isLoading}
                      autoComplete="new-password"
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

                <div>
                  <label className="block text-sm font-medium text-[#333333] mb-1.5">Confirm Password</label>
                  <div className={`relative transition-all ${errors.confirmPassword ? 'ring-1 ring-red-500 rounded-xl' : ''}`}>
                    <FiLock className="absolute left-3.5 top-3.5 text-[#999999]" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`w-full pl-10 pr-12 py-3 bg-white/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009FB8] transition ${
                        errors.confirmPassword ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="Confirm password"
                      disabled={isLoading}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-3.5 text-[#999999] hover:text-[#666666] transition"
                    >
                      {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1.5">{errors.confirmPassword}</p>
                  )}
                </div>
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
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            <p className="text-center text-sm text-[#666666] mt-6">
              Already have an account?{' '}
              <Link to="/signin" className="text-[#009FB8] font-semibold hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;