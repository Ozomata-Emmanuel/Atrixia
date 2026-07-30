// pages/auth/ForgotPassword.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiArrowLeft } from 'react-icons/fi';
import AnimatedGridBackground from '../../components/AnimatedGridBackground';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center md:py-20 bg-[#f8f8f8] overflow-hidden">
      <AnimatedGridBackground/>
      
      <div className="absolute top-4 left-4 z-20 flex items-center text-2xl font-semibold">
        <img 
          onClick={() => navigate("/")} 
          src="/logo.png" 
          alt="Logo" 
          className="w-12 h-12 cursor-pointer mb-2" 
        />
        trixia
      </div>

      <div className="relative z-10 w-full h-screen md:h-fit max-w-md md:px-4 px-0">
        <div className="md:bg-white/30 h-full backdrop-blur-xs md:p-6 p-8 md:rounded-2xl shadow-xl border border-gray-100/50 flex items-center">
          <div className="w-full mb-30 md:mb-0">
            <Link to="/signin" className="text-[#666666] hover:text-[#009FB8] transition inline-flex items-center gap-1 mb-6 text-sm">
              <FiArrowLeft /> Back to Sign In
            </Link>

            <h2 className="text-3xl font-bold text-[#1a1a1a] font-serif-brand mb-2">
              Reset Password
            </h2>
            <p className="text-[#666666] mb-6 text-sm">
              Enter your email and we'll send you a reset link
            </p>

            {submitted ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl">
                <p className="font-semibold">Check your email!</p>
                <p className="text-sm mt-1">We've sent a password reset link to {email}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[#333333] mb-1.5">Email</label>
                  <div className="relative">
                    <FiMail className="absolute left-3.5 top-3.5 text-[#999999]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009FB8] transition"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#1a1a1a] text-white py-3 rounded-xl font-semibold hover:bg-[#333333] transition"
                >
                  Send Reset Link
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;