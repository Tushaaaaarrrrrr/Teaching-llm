'use client'

import React, { useEffect } from 'react'
import Image from 'next/image'

export default function MaintenancePage() {
  const config = {
    text: "SYSTEM IS UNDER MAINTENANCE"
  };

  return (
    <div style={{
      margin: 0,
      padding: 0,
      backgroundColor: '#ffffff',
      color: '#000000',
      fontFamily: "'Inter', sans-serif",
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      textAlign: 'center',
    }}>
      {/* Import the Google Font using a standard hidden link or global CSS is preferred in Next.js, 
          but for this standalone page we can use a style tag or the provided Inter font if already in the project. */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@900&display=swap');
        
        .maintenance-heading {
            font-size: 3.5rem;
            font-weight: 900;
            line-height: 1;
            letter-spacing: -0.05em;
            margin: 0;
            text-transform: uppercase;
        }

        @media (max-width: 768px) {
            .maintenance-heading {
                font-size: 2.25rem;
            }
        }
      `}} />

      <main style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        maxWidth: '800px',
        padding: '40px',
      }}>
        <div style={{ width: '100%', marginBottom: '48px' }}>
          <Image 
              src="/maintenance-illustration.jpg" 
              alt="Maintenance Illustration" 
              width={800}
              height={600}
              priority
              style={{ width: '100%', height: 'auto' }}
          />
        </div>
        <h1 className="maintenance-heading">
          {config.text}
        </h1>
      </main>
    </div>
  )
}
