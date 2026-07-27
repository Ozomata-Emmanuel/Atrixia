// pages/auth/VerifyEmail.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiMail, FiCheckCircle, FiArrowRight } from 'react-icons/fi';

const VerifyEmail = () => {
  const [resendCount, setResendCount] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const [timer, setTimer] = useState(30);

  useEffect(() => {
    if (!canResend && timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (timer === 0) {
      setCanResend(true);
    }
  }, [canResend, timer]);

  const handleResend = () => {
    if (canResend) {
      setResendCount(prev => prev + 1);
      setCanResend(false);
      setTimer(30);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] flex items-center justify-center py-20 bg-[#f8f8f8] overflow-hidden">
      {/* Grid Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -left-15 -top-15 animate-[moveGrid_25s_linear_infinite]"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(40, 100px)",
            gridAutoRows: "100px",
          }}
        >
          {Array.from({ length: 1200 }).map((_, i) => (
            <div
              key={i}
              style={{
                backgroundColor:
                  Math.random() > 0.5
                    ? `hsla(${Math.random() * 360}, 80%, 60%, 0.15)`
                    : "transparent",
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-gray-100/50 text-center">
          <div className="w-20 h-20 bg-[#009FB8]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiMail className="text-4xl text-[#009FB8]" />
          </div>

          <h2 className="text-3xl font-bold text-[#1a1a1a] font-serif-brand mb-2">
            Check Your Email
          </h2>
          <p className="text-[#666666] mb-6">
            We've sent a verification link to your email address. Please click the link to verify your account.
          </p>

          <div className="bg-[#f5f5f5] rounded-xl p-4 mb-6">
            <p className="text-sm text-[#666666]">
              Didn't receive the email? Check your spam folder or
              <button
                onClick={handleResend}
                disabled={!canResend}
                className={`ml-1 font-medium transition ${
                  canResend ? 'text-[#009FB8] hover:underline' : 'text-[#999999] cursor-not-allowed'
                }`}
              >
                {canResend ? 'resend' : `Resend in ${timer}s`}
              </button>
            </p>
            {resendCount > 0 && (
              <p className="text-xs text-[#666666] mt-2">
                Verification email resent {resendCount} time{resendCount > 1 ? 's' : ''}
              </p>
            )}
          </div>

          <Link
            to="/signin"
            className="inline-flex items-center gap-2 text-[#1a1a1a] font-medium hover:text-[#009FB8] transition"
          >
            Back to Sign In <FiArrowRight />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;