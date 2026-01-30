import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Users, Clock, BarChart3 } from 'lucide-react';

// Simple 3D Avatar Component using Canvas
const Avatar3D = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Simple animated avatar
    const drawAvatar = (time) => {
      ctx.clearRect(0, 0, width, height);

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#e0f7f4');
      gradient.addColorStop(1, '#b3e5db');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const bobbing = Math.sin(time * 0.003) * 5;

      // Head
      ctx.fillStyle = '#f4a460';
      ctx.beginPath();
      ctx.arc(centerX, centerY - 20 + bobbing, 35, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(centerX - 12, centerY - 25 + bobbing, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(centerX + 12, centerY - 25 + bobbing, 5, 0, Math.PI * 2);
      ctx.fill();

      // Smile
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY - 15 + bobbing, 12, 0, Math.PI);
      ctx.stroke();

      // Body
      ctx.fillStyle = '#14b8a6';
      ctx.fillRect(centerX - 25, centerY + 15 + bobbing, 50, 50);

      // Arms
      ctx.fillStyle = '#f4a460';
      ctx.fillRect(centerX - 35, centerY + 20 + bobbing, 15, 40);
      ctx.fillRect(centerX + 20, centerY + 20 + bobbing, 15, 40);

      requestAnimationFrame(drawAvatar);
    };

    drawAvatar(0);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={400}
      className="w-full max-w-xs mx-auto rounded-2xl shadow-lg"
    />
  );
};

export default function LandingPage() {
  const [isHovered, setIsHovered] = useState(null);
  const navigate = useNavigate();

  // Theme palette (Modernity in Full Bloom)
  const theme = {
    dark: '#182628',      // headings / strong text
    mint: '#65CCB8',      // light accent
    sea: '#57BA98',       // secondary accent
    green: '#3B945E',     // primary accent
    light: '#F2F2F2'      // light background
  };

  // Keep a simple fadeInUp for in-view sections

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    transition: { duration: 0.6 },
    viewport: { once: true }
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(to bottom, ${theme.light}, ${theme.mint}20%, ${theme.light})`
      }}
    >
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="w-full mx-auto px-6 md:px-12 lg:px-24 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg shadow-sm"
              style={{
                backgroundImage: `linear-gradient(135deg, ${theme.mint}, ${theme.green})`
              }}
            >
              <div className="h-3 w-3 sm:h-4 sm:w-4 rounded-sm bg-white/20"></div>
            </div>
            <span className="font-semibold" style={{ color: theme.dark }}>Reimbursement Portal</span>
          </div>
          <a
            href="/login"
            className="px-6 py-2 text-white rounded-lg hover:shadow-lg transition-shadow text-sm font-medium"
            style={{
              backgroundImage: `linear-gradient(90deg, ${theme.green}, ${theme.sea})`
            }}
            onClick={(e) => {
              e.preventDefault();
              navigate('/login');
            }}
          >
            Login
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="w-full mx-auto px-6 md:px-12 lg:px-24 py-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <motion.div {...fadeInUp}>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight" style={{ color: theme.dark }}>
            Automate Your Reimbursement <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(90deg, ${theme.green}, ${theme.mint})` }}>Workflow</span>
          </h1>
          <p className="text-lg mb-8 leading-relaxed" style={{ color: '#4b5563' }}>
            Eliminate paperwork, track requests in real-time, and streamline approvals. Our platform digitizes the entire process for students, faculty, HODs, and administrators.
          </p>
          <div className="flex gap-4">
            <button
              className="px-8 py-3 text-white rounded-lg hover:shadow-xl transition-all font-medium flex items-center gap-2"
              style={{ backgroundImage: `linear-gradient(90deg, ${theme.green}, ${theme.sea})` }}
              onClick={() => navigate('/login')}
            >
              Submit Request <ChevronRight size={18} />
            </button>
            <button
              className="px-8 py-3 border-2 rounded-lg transition-all font-medium"
              style={{ borderColor: '#e5e7eb', color: '#374151' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.green; e.currentTarget.style.color = theme.green; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#374151'; }}
            >
              Learn More
            </button>
          </div>
        </motion.div>

        <motion.div
          {...fadeInUp}
          className="relative flex justify-center"
        >
          <Avatar3D />
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="w-full mx-auto px-6 md:px-12 lg:px-24 py-20">
        <motion.div {...fadeInUp} className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4" style={{ color: theme.dark }}>How It Works</h2>
          <p className="text-lg" style={{ color: '#4b5563' }}>A simple, transparent process for everyone.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { num: '1', title: 'Submit Claim', desc: 'Digitally fill forms and upload all your supporting documents and receipts.' },
            { num: '2', title: 'Automated Routing', desc: 'Requests are automatically sent through the multi-level approval chain: Coordinator, HOD, and Principal.' },
            { num: '3', title: 'Process & Disburse', desc: 'Once fully authorized, the Accounts department processes the payment for final disbursement.' }
          ].map((step, i) => (
            <motion.div
              key={i}
              {...fadeInUp}
              onHoverStart={() => setIsHovered(i)}
              onHoverEnd={() => setIsHovered(null)}
              className="relative"
            >
              <div
                className={`p-8 rounded-xl border-2 transition-all duration-300 h-full ${isHovered === i ? '' : ''}`}
                style={{
                  borderColor: isHovered === i ? theme.green : '#e5e7eb',
                  backgroundColor: isHovered === i ? `${theme.mint}20` : '#ffffff',
                  boxShadow: isHovered === i ? '0 10px 25px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundImage: `linear-gradient(135deg, ${theme.mint}, ${theme.green})` }}
                >
                  <span className="text-white font-bold text-lg">{step.num}</span>
                </div>
                <h3 className="text-xl font-semibold mb-2" style={{ color: theme.dark }}>{step.title}</h3>
                <p style={{ color: '#4b5563' }}>{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full mx-auto px-4 sm:px-6 md:px-12 lg:px-24 py-12 sm:py-16 lg:py-20">
        <motion.div
          {...fadeInUp}
          className="rounded-xl sm:rounded-2xl p-6 sm:p-8 lg:p-12 text-center text-white"
          style={{ backgroundImage: `linear-gradient(90deg, ${theme.green}, ${theme.sea})` }}
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">Ready to Digitize Your Institution's Workflow?</h2>
          <p className="text-sm sm:text-base lg:text-lg mb-6 sm:mb-8 opacity-90 max-w-2xl mx-auto">Move away from manual paperwork and embrace a transparent, efficient, and automated system.</p>
          <button
            className="px-6 sm:px-8 py-2.5 sm:py-3 bg-white rounded-lg hover:shadow-xl transition-all font-semibold text-sm sm:text-base"
            style={{ color: theme.green }}
            onClick={() => navigate('/login')}
          >
            Get Started Now
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-20">
        <div className="w-full mx-auto px-6 md:px-12 lg:px-24 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundImage: `linear-gradient(135deg, ${theme.mint}, ${theme.green})` }}
                >
                  <span className="text-white font-bold text-sm">RP</span>
                </div>
                <span className="font-semibold" style={{ color: theme.dark }}>Reimbursement Portal</span>
              </div>
              <p className="text-sm" style={{ color: '#6b7280' }}>Digitizing reimbursements for A.P. Shah Institute of Technology.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="transition" style={{ color: '#6b7280' }} onMouseEnter={(e)=> e.currentTarget.style.color = theme.green} onMouseLeave={(e)=> e.currentTarget.style.color = '#6b7280'}>Features</a></li>
                <li><a href="#" className="transition" style={{ color: '#6b7280' }} onMouseEnter={(e)=> e.currentTarget.style.color = theme.green} onMouseLeave={(e)=> e.currentTarget.style.color = '#6b7280'}>How it works</a></li>
                <li><a href="#" className="transition" style={{ color: '#6b7280' }} onMouseEnter={(e)=> e.currentTarget.style.color = theme.green} onMouseLeave={(e)=> e.currentTarget.style.color = '#6b7280'}>Login</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="transition" style={{ color: '#6b7280' }} onMouseEnter={(e)=> e.currentTarget.style.color = theme.green} onMouseLeave={(e)=> e.currentTarget.style.color = '#6b7280'}>Help Center</a></li>
                <li><a href="#" className="transition" style={{ color: '#6b7280' }} onMouseEnter={(e)=> e.currentTarget.style.color = theme.green} onMouseLeave={(e)=> e.currentTarget.style.color = '#6b7280'}>Documentation</a></li>
                <li><a href="#" className="transition" style={{ color: '#6b7280' }} onMouseEnter={(e)=> e.currentTarget.style.color = theme.green} onMouseLeave={(e)=> e.currentTarget.style.color = '#6b7280'}>Contact Admin</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-8">
            <p className="text-center text-sm" style={{ color: '#6b7280' }}>Developed by <b>Nirmala Patole</b>, <b>Alok Sahoo</b>, <b>Apoorva Puranik</b> , and <b>Vaibhavi Naik</b> From <b>TE-IT-B</b></p>
          </div>
        </div>
      </footer>
    </div>
  );
}