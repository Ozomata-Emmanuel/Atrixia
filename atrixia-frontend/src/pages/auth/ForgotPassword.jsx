// pages/auth/ForgotPassword.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMail, FiArrowLeft } from 'react-icons/fi';
import AnimatedGridBackground from '../../components/AnimatedGridBackground';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] flex items-center justify-center py-20 bg-linear-to-br from-gray-50 to-gray-100">
      <AnimatedGridBackground />
      <div className="absolute top-10 left-10 flex items-center text-3xl">
        <img onClick={() => navigate(-1)} src="/logo.png" alt="" className='w-20 h-20 cursor-pointer mb-5'/>trixia
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
          <Link to="/signin" className="text-gray-600 hover:text-[#009FB8] transition inline-flex items-center gap-1 mb-6">
            <FiArrowLeft /> Back to Sign In
          </Link>

          <h2 className="text-3xl font-bold text-[#2D2D2D] mb-2">
            Reset Password
          </h2>
          <p className="text-gray-600 mb-6">
            Enter your email and we'll send you a reset link
          </p>

          {submitted ? (
            <div className="bg-green-50 text-green-700 p-4 rounded-lg">
              <p className="font-semibold">Check your email!</p>
              <p className="text-sm mt-1">We've sent a password reset link to {email}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009FB8] focus:border-transparent"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#009FB8] text-white py-2 rounded-lg font-semibold hover:bg-[#008A9F] transition"
              >
                Send Reset Link
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;