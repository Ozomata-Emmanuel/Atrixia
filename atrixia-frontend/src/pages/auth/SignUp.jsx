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
  const { signup } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const newErrors = {};
    if (!formData.fullName) newErrors.fullName = 'Full name is required';
    else if (formData.fullName.length < 2) newErrors.fullName = 'Name must be at least 2 characters';
    
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsLoading(true);
    setTimeout(() => {
      signup(formData.email, formData.password);
      navigate('/verify-email');
      setIsLoading(false);
    }, 800);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] flex items-center justify-center py-20 bg-[#f8f8f8] overflow-hidden">
      {/* Grid Background */}
      <AnimatedGridBackground/>
      <div className="absolute top-10 left-10 flex items-center text-3xl">
        <img onClick={() => navigate(-1)} src="/logo.png" alt="" className='w-20 h-20 cursor-pointer mb-5'/>trixia
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        <div className="bg-white/80 backdrop-blur-xs p-8 rounded-2xl shadow-xl border border-gray-100/50">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-[#1a1a1a] font-serif-brand">
              Create Account
            </h2>
            <p className="text-[#666666] mt-2 text-sm">
              Join Atrixia and start shopping smarter
            </p>
          </div>

          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl mb-4 text-sm">
              {errors.general}
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
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009FB8] transition ${
                    errors.fullName ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="John Doe"
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
                  type="text"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009FB8] transition ${
                    errors.email ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="you@example.com"
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
                    className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009FB8] transition ${
                      errors.password ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="Min 8 characters"
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
                    className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009FB8] transition ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="Confirm password"
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
              className="w-full bg-[#1a1a1a] text-white py-3 rounded-xl font-semibold hover:bg-[#333333] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
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
  );
};

export default SignUp;