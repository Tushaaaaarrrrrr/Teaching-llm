'use client'

import React from 'react'

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-white text-black font-sans flex flex-col items-center justify-center p-6 md:p-12 overflow-y-auto">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@800&display=swap');
        body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; background-color: white !important; }
      `}} />

      <div className="w-full max-w-4xl flex flex-col items-center text-center py-10">
        {/* SVG Illustration */}
        <div className="w-full max-h-[40vh] flex items-center justify-center mb-10 md:mb-16">
          <svg fill="none" viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg" className="max-w-full h-full w-auto drop-shadow-sm">
            <g stroke="black" strokeWidth="2">
              <path d="M150 50v50m0 0l-20 20h40l-20-20z"></path>
              <path d="M220 50v50m0 0l-20 20h40l-20-20z"></path>
              <path d="M290 50v50m0 0l-20 20h40l-20-20z"></path>
            </g>
            <g transform="translate(600, 50)">
              <rect fill="white" height="50" stroke="black" strokeWidth="2" width="80" x="0" y="50"></rect>
              <line stroke="black" strokeWidth="2" x1="40" x2="40" y1="0" y2="50"></line>
              <circle cx="30" cy="75" r="8" stroke="black" strokeWidth="2"></circle>
              <circle cx="50" cy="75" r="8" stroke="black" strokeWidth="2"></circle>
            </g>
            <g fill="white" stroke="black" strokeWidth="3">
              <rect height="60" rx="10" width="150" x="250" y="380"></rect>
              <rect height="160" rx="30" width="60" x="300" y="220"></rect>
              <circle cx="330" cy="250" fill="none" r="12"></circle>
              <circle cx="330" cy="340" fill="none" r="12"></circle>
              <path d="M330 220 L480 120" strokeLinecap="round" strokeWidth="20"></path>
              <g transform="translate(480, 120)">
                <circle cx="0" cy="0" r="15"></circle>
                <path d="M0 0 v60 m-30 0 h60 m-60 0 v30 m60 0 v-30" strokeWidth="5"></path>
              </g>
            </g>
            <g transform="translate(420, 320)">
              <circle cx="30" cy="20" fill="white" r="20" stroke="black" strokeWidth="2"></circle>
              <path d="M30 40 Q60 40 60 140 H0 Q0 40 30 40" fill="white" stroke="black" strokeWidth="2"></path>
              <path d="M30 80 L-20 100" stroke="black" strokeWidth="2"></path>
              <rect fill="white" height="20" stroke="black" strokeWidth="2" width="30" x="-40" y="90"></rect>
            </g>
            <g transform="translate(600, 400)">
              <rect fill="white" height="70" stroke="black" strokeWidth="2" width="120" x="0" y="20"></rect>
              <path d="M20 20 v-40 M60 20 v-40 M100 20 v-40" stroke="black" strokeWidth="2"></path>
              <circle cx="60" cy="55" r="10" stroke="black" strokeWidth="2"></circle>
            </g>
            <g stroke="black" strokeWidth="2">
              <circle cx="150" cy="420" r="20"></circle>
              <circle cx="120" cy="450" r="15"></circle>
              <circle cx="530" cy="350" r="15"></circle>
            </g>
          </svg>
        </div>

        {/* Textual Content */}
        <h1 className="text-3xl md:text-5xl lg:text-7xl font-extrabold text-black uppercase tracking-tight leading-tight mb-4 px-4">
          SYSTEM IS UNDER MAINTENANCE
        </h1>
        
        <p className="text-gray-600 max-w-2xl text-lg md:text-xl font-medium mb-12 px-6 leading-relaxed opacity-90">
          We're currently performing some scheduled maintenance to improve your experience. 
          We'll be back shortly!
        </p>

        {/* Bulletproof Contact Button */}
        <div className="flex justify-center pb-12">
          <a 
            href="mailto:support@alphaiitian.in"
            style={{
              backgroundColor: '#000000',
              color: '#ffffff',
              padding: '16px 48px',
              borderRadius: '9999px',
              fontWeight: 'bold',
              fontSize: '14px',
              letterSpacing: '0.2em',
              textDecoration: 'none',
              textTransform: 'uppercase',
              display: 'inline-block',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.2s ease-in-out'
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#333333'; e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#000000'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            CONTACT DEVELOPER
          </a>
        </div>
      </div>
    </div>
  )
}
