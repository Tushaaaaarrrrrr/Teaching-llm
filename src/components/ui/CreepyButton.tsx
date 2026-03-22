'use client'

import React, { useRef, useState, useEffect } from "react";

interface CreepyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  loading?: boolean;
  isAwake?: boolean;
}

type Coords = {
  x: number;
  y: number;
};

export function CreepyButton({
  children,
  className,
  onClick,
  loading,
  disabled,
  isAwake = true,
  ...props
}: CreepyButtonProps) {
  const eyesRef = useRef<HTMLSpanElement>(null);
  const [eyeCoords, setEyeCoords] = useState<Coords>({ x: 0, y: 0 });

  const translateX = -50 + eyeCoords.x * 50;
  const translateY = -50 + eyeCoords.y * 50;
  
  const eyeStyle: React.CSSProperties = {
    transform: `translate(${translateX}%, ${translateY}%)`,
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (disabled || loading) return;
      if (!isAwake) {
        setEyeCoords({ x: 0, y: 0 });
        return;
      }
      
      if (!eyesRef.current) return;
      const eyesRect = eyesRef.current.getBoundingClientRect();
      const eyesCenter: Coords = {
        x: eyesRect.left + eyesRect.width / 2,
        y: eyesRect.top + eyesRect.height / 2,
      };
      
      const cursor: Coords = {
        x: e.clientX,
        y: e.clientY,
      };

      const dx = cursor.x - eyesCenter.x;
      const dy = cursor.y - eyesCenter.y;
      const angle = Math.atan2(-dy, dx) + Math.PI / 2;

      const visionRangeX = 150;
      const visionRangeY = 100;
      const distance = Math.min(Math.hypot(dx, dy), 200);
      
      const x = (Math.sin(angle) * distance) / visionRangeX;
      const y = (Math.cos(angle) * distance) / visionRangeY;
      
      setEyeCoords({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [disabled, loading, isAwake]);

  return (
    <>
      <style>
        {`
          :root {
            --cb-hue: 240deg;
            --cb-gray1: #ffffff;
            --cb-black: #000000;
            --cb-primary3: rgba(54,54,232,0.2);
            --cb-primary5: #3636e8;
            --cb-primary6: #2525cc;
            --cb-trans-dur: 0.3s;
          }

          .creepy-btn {
            background-color: var(--cb-black);
            border-radius: 50px;
            color: var(--cb-gray1);
            cursor: pointer;
            width: 100%;
            padding: 0;
            border: 0;
            outline: 0.1875em solid transparent;
            transition: outline 0.1s linear;
            -webkit-tap-highlight-color: transparent;
            font-family: inherit;
            font-size: 15px;
            font-weight: 600;
            position: relative;
            display: inline-block;
            overflow: visible;
          }

          .creepy-btn:disabled {
            cursor: not-allowed;
            opacity: 0.7;
          }

          .creepy-btn__cover {
            background-color: var(--cb-primary5);
            box-shadow: 0 0 0 2px var(--cb-black) inset;
            padding: 14px;
            border-radius: inherit;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            position: relative;
            z-index: 1;
            transform-origin: 20px 50%;
            transition:
              background-color var(--cb-trans-dur),
              transform var(--cb-trans-dur) cubic-bezier(0.65, 0, 0.35, 1);
            inset: 0;
          }

          .creepy-btn__eyes {
            position: absolute;
            display: flex;
            align-items: center;
            gap: 4px;
            right: 24px;
            top: 50%;
            transform: translateY(-50%);
            height: 12px;
            z-index: 2;
            pointer-events: none; 
          }

          .creepy-btn__eye {
            animation: cb-eye-blink 3s infinite;
            background-color: var(--cb-gray1);
            border-radius: 50%;
            overflow: hidden;
            width: 12px;
            height: 12px;
            position: relative;
            display: block;
          }

          .creepy-btn__pupil {
            background-color: var(--cb-black);
            border-radius: 50%;
            display: block;
            position: absolute;
            width: 6px;
            height: 6px;
            top: 50%;
            left: 50%;
          }

          .creepy-btn:focus-visible {
            outline: 3px solid var(--cb-primary3);
          }

          .creepy-btn:not(:disabled):hover .creepy-btn__cover {
            background-color: var(--cb-primary6);
            transform: rotate(-6deg);
            transition-timing-function: cubic-bezier(0.65, 0, 0.35, 1.65);
          }

          .creepy-btn:not(:disabled):active .creepy-btn__cover {
            transform: rotate(0);
            transition-timing-function: cubic-bezier(0.65, 0, 0.35, 1);
          }

          @keyframes cb-eye-blink {
            0%, 92%, 100% {
              animation-timing-function: cubic-bezier(0.32, 0, 0.67, 0);
              height: 12px;
            }
            96% {
              animation-timing-function: cubic-bezier(0.33, 1, 0.68, 1);
              height: 0;
            }
          }

          .creepy-btn .spinner {
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      <button
        className={`creepy-btn ${className || ""}`}
        type={props.type || "button"}
        onClick={onClick}
        disabled={disabled || loading}
        {...props}
      >
        <span className="creepy-btn__eyes" ref={eyesRef} style={{ opacity: isAwake ? 1 : 0, transition: 'opacity 0.3s ease' }}>
          <span className="creepy-btn__eye">
            <span className="creepy-btn__pupil" style={eyeStyle}></span>
          </span>
          <span className="creepy-btn__eye">
            <span className="creepy-btn__pupil" style={eyeStyle}></span>
          </span>
        </span>
        <span className="creepy-btn__cover">
          {loading ? (
            <>
              <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1"/>
              </svg>
              Signing In...
            </>
          ) : children}
        </span>
      </button>
    </>
  );
}

export default CreepyButton;
