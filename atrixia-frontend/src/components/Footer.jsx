import React from 'react';
import { Link } from 'react-router-dom';
import { FiGithub, FiTwitter, FiLinkedin } from 'react-icons/fi';

const Footer = () => {
  return (
    // Added overflow-hidden and w-full to contain background glows
    <footer className="relative w-full overflow-hidden bg-linear-to-br from-gray-50 via-white to-gray-50 border-t border-gray-200/30">
      {/* Glassmorphic background overlay clipped to bounds */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#009FB8]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#009FB8]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Gradient Divider */}
        <div className="h-px bg-linear-to-r from-transparent via-gray-300 to-transparent mb-12" />

        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <h3 className="text-2xl font-serif-brand font-bold text-[#1a1a1a] mb-3">
              Atrix<span className="text-[#009FB8]">ia</span>
            </h3>
            <p className="text-[#666666] text-sm leading-relaxed mb-6">
              Your AI-powered shopping assistant that helps you make smarter product decisions with personalized recommendations and intelligent filtering.
            </p>
            <div className="flex gap-3">
              {[
                { icon: FiGithub, href: '#', label: 'GitHub' },
                { icon: FiTwitter, href: '#', label: 'Twitter' },
                { icon: FiLinkedin, href: '#', label: 'LinkedIn' },
              ].map((social, idx) => {
                const Icon = social.icon;
                return (
                  <a
                    key={idx}
                    href={social.href}
                    title={social.label}
                    className="w-10 h-10 rounded-xl bg-white/70 backdrop-blur-sm border border-gray-200/50 flex items-center justify-center text-[#999999] hover:text-[#009FB8] hover:border-[#009FB8]/30 hover:shadow-md transition"
                  >
                    <Icon className="text-lg" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-[#1a1a1a] mb-4 text-sm uppercase tracking-wider">Navigation</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Home', path: '/' },
                { label: 'How It Works', path: '/how-it-works' },
                { label: 'AI Assistant', path: '/ai' },
              ].map((link, idx) => (
                <li key={idx}>
                  <Link
                    to={link.path}
                    className="text-[#666666] hover:text-[#009FB8] transition text-sm font-medium"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-[#1a1a1a] mb-4 text-sm uppercase tracking-wider">Support</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'FAQ', path: '/faq' },
                { label: 'Contact', path: '/contact' },
                { label: 'Privacy Policy', path: '/privacy' },
              ].map((link, idx) => (
                <li key={idx}>
                  <Link
                    to={link.path}
                    className="text-[#666666] hover:text-[#009FB8] transition text-sm font-medium"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-[#1a1a1a] mb-4 text-sm uppercase tracking-wider">Legal</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Terms', path: '/terms' },
                { label: 'Privacy', path: '/privacy' },
                { label: 'Cookies', path: '/cookies' },
              ].map((link, idx) => (
                <li key={idx}>
                  <Link
                    to={link.path}
                    className="text-[#666666] hover:text-[#009FB8] transition text-sm font-medium"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Divider */}
        <div className="h-px bg-linear-to-r from-transparent via-gray-300 to-transparent mb-8" />

        {/* Copyright */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <p className="text-sm text-[#999999] font-medium">
            &copy; {new Date().getFullYear()} Atrixia. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="text-xs text-[#999999] hover:text-[#009FB8] transition">
              Privacy Policy
            </Link>
            <div className="w-1 h-1 bg-[#ddd] rounded-full" />
            <Link to="/terms" className="text-xs text-[#999999] hover:text-[#009FB8] transition">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        footer {
          animation: fade-in-up 0.6s ease-out;
        }
      `}</style>
    </footer>
  );
};

export default Footer;