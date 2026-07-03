'use client'

import React, { useState, useEffect, useRef } from 'react'

// Safe Mathematical Expression Parser (Recursive Descent)
class MathParser {
  private tokens: string[] = []
  private index = 0
  private isDegree = true

  constructor(isDegree: boolean) {
    this.isDegree = isDegree
  }

  private tokenize(expr: string) {
    this.tokens = []
    this.index = 0
    // Match numbers, constants, functions, operators, parentheses
    const regex = /\d+(\.\d+)?|[a-zA-Z]+|[+\-*/%^()]|π|e/g
    let match
    while ((match = regex.exec(expr)) !== null) {
      this.tokens.push(match[0])
    }
  }

  private peek(): string | null {
    return this.index < this.tokens.length ? this.tokens[this.index] : null
  }

  private next(): string | null {
    return this.index < this.tokens.length ? this.tokens[this.index++] : null
  }

  public parse(expr: string): number {
    this.tokenize(expr)
    if (this.tokens.length === 0) return 0
    const val = this.parseExpression()
    if (this.index < this.tokens.length) {
      throw new Error(`Unexpected symbol: "${this.peek()}"`)
    }
    return val
  }

  private parseExpression(): number {
    let val = this.parseTerm()
    while (true) {
      const op = this.peek()
      if (op === '+' || op === '-') {
        this.next()
        const rhs = this.parseTerm()
        val = op === '+' ? val + rhs : val - rhs
      } else {
        break
      }
    }
    return val
  }

  private parseTerm(): number {
    let val = this.parseFactor()
    while (true) {
      const op = this.peek()
      if (op === '*' || op === '/' || op === '%') {
        this.next()
        const rhs = this.parseFactor()
        if (op === '/') {
          if (rhs === 0) throw new Error('Division by zero')
          val = val / rhs
        } else if (op === '%') {
          val = val % rhs
        } else {
          val = val * rhs
        }
      } else {
        break
      }
    }
    return val
  }

  private parseFactor(): number {
    let val = this.parsePrimary()
    const op = this.peek()
    if (op === '^') {
      this.next()
      const rhs = this.parseFactor() // right-associative for power
      val = Math.pow(val, rhs)
    }
    return val
  }

  private parsePrimary(): number {
    const token = this.peek()
    if (token === null) throw new Error('Expression ended abruptly')

    if (token === '+') {
      this.next()
      return this.parsePrimary()
    }
    if (token === '-') {
      this.next()
      return -this.parsePrimary()
    }

    if (token === '(') {
      this.next()
      const val = this.parseExpression()
      const close = this.next()
      if (close !== ')') {
        throw new Error("Mismatched '(' - missing closing parenthesis")
      }
      return val
    }

    // Numbers
    if (/^\d+(\.\d+)?$/.test(token)) {
      this.next()
      return parseFloat(token)
    }

    // Constants
    if (token.toLowerCase() === 'π' || token.toLowerCase() === 'pi') {
      this.next()
      return Math.PI
    }
    if (token === 'e') {
      this.next()
      return Math.E
    }

    // Scientific Functions
    if (/^(sin|cos|tan|log|ln|sqrt)$/i.test(token)) {
      const funcName = this.next()!.toLowerCase()
      const openParen = this.peek()
      if (openParen !== '(') {
        throw new Error(`Expected '(' after function '${funcName}'`)
      }
      this.next() // consume '('
      const arg = this.parseExpression()
      const closeParen = this.next()
      if (closeParen !== ')') {
        throw new Error(`Missing closing parenthesis in '${funcName}' function`)
      }

      if (funcName === 'sin') {
        return Math.sin(this.isDegree ? (arg * Math.PI) / 180 : arg)
      }
      if (funcName === 'cos') {
        // Adjust for exact values on bounds
        const rad = this.isDegree ? (arg * Math.PI) / 180 : arg
        const cosVal = Math.cos(rad)
        return Math.abs(cosVal) < 1e-15 ? 0 : cosVal
      }
      if (funcName === 'tan') {
        const rad = this.isDegree ? (arg * Math.PI) / 180 : arg
        // Check for undefined tan bounds
        if (Math.abs(Math.cos(rad)) < 1e-15) {
          throw new Error('Tangent value is undefined')
        }
        return Math.tan(rad)
      }
      if (funcName === 'log') {
        if (arg <= 0) throw new Error('Logarithm input must be positive')
        return Math.log10(arg)
      }
      if (funcName === 'ln') {
        if (arg <= 0) throw new Error('Natural logarithm input must be positive')
        return Math.log(arg)
      }
      if (funcName === 'sqrt') {
        if (arg < 0) throw new Error('Cannot compute square root of negative value')
        return Math.sqrt(arg)
      }
    }

    throw new Error(`Invalid symbol: "${token}"`)
  }
}

interface CalculatorProps {
  open: boolean
  onClose: () => void
}

interface HistoryItem {
  expr: string
  res: string
}

export default function Calculator({ open, onClose }: CalculatorProps) {
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [size, setSize] = useState({ width: 340, height: 490 })
  const [expression, setExpression] = useState('')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [isDegree, setIsDegree] = useState(true)
  const [isPro, setIsPro] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, startPos: { x: 0, y: 0 } })
  const resizeRef = useRef({ isResizing: false, startX: 0, startY: 0, startSize: { width: 0, height: 0 } })
  const modalRef = useRef<HTMLDivElement>(null)

  // Position in upper right corner on initial load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const initialX = window.innerWidth - (isPro ? 520 : 380)
      const initialY = 80
      setPosition({ x: Math.max(10, initialX), y: Math.max(10, initialY) })
    }
  }, [open])

  if (!open) return null

  // Evaluate Expression
  const handleEvaluate = () => {
    if (!expression.trim()) return
    try {
      setError('')
      const parser = new MathParser(isDegree)
      const calculated = parser.parse(expression)
      
      // Fix floating point errors (e.g. 0.1 + 0.2 = 0.3)
      const formatted = Number(calculated.toFixed(10)).toString()
      setResult(formatted)
      
      // Save to history
      setHistory(prev => [{ expr: expression, res: formatted }, ...prev.slice(0, 19)])
      
      // Update expression to result for continuous calculation
      setExpression(formatted)
    } catch (err: any) {
      setError(err.message || 'Math Error')
      setResult('')
    }
  }

  const handleKeyPress = (value: string) => {
    setError('')
    if (value === 'C') {
      setExpression('')
      setResult('')
      setError('')
    } else if (value === '⌫') {
      setExpression(prev => prev.slice(0, -1))
    } else if (value === '=') {
      handleEvaluate()
    } else if (value === 'sin' || value === 'cos' || value === 'tan' || value === 'log' || value === 'ln' || value === 'sqrt') {
      setExpression(prev => prev + value + '(')
    } else {
      setExpression(prev => prev + value)
    }
  }

  // Mouse Drag handlers
  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startPos: { x: position.x, y: position.y }
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // Touch Drag handlers
  const handleHeaderTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    dragRef.current = {
      isDragging: true,
      startX: touch.clientX,
      startY: touch.clientY,
      startPos: { x: position.x, y: position.y }
    }
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)
  }

  // Mouse Resize handlers
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    resizeRef.current = {
      isResizing: true,
      startX: e.clientX,
      startY: e.clientY,
      startSize: { width: size.width, height: size.height }
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // Touch Resize handlers
  const handleResizeTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation()
    const touch = e.touches[0]
    resizeRef.current = {
      isResizing: true,
      startX: touch.clientX,
      startY: touch.clientY,
      startSize: { width: size.width, height: size.height }
    }
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (dragRef.current.isDragging) {
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      
      const newX = Math.max(0, Math.min(window.innerWidth - size.width, dragRef.current.startPos.x + dx))
      const newY = Math.max(0, Math.min(window.innerHeight - size.height, dragRef.current.startPos.y + dy))
      
      setPosition({ x: newX, y: newY })
    }
    
    if (resizeRef.current.isResizing) {
      const dx = e.clientX - resizeRef.current.startX
      const dy = e.clientY - resizeRef.current.startY
      
      const minW = isPro ? 480 : 320
      const newW = Math.max(minW, Math.min(900, resizeRef.current.startSize.width + dx))
      const newH = Math.max(400, Math.min(900, resizeRef.current.startSize.height + dy))
      
      setSize({ width: newW, height: newH })
    }
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (dragRef.current.isDragging) {
      e.preventDefault() // prevent page scrolling while dragging calculator
      const touch = e.touches[0]
      const dx = touch.clientX - dragRef.current.startX
      const dy = touch.clientY - dragRef.current.startY
      
      const newX = Math.max(0, Math.min(window.innerWidth - size.width, dragRef.current.startPos.x + dx))
      const newY = Math.max(0, Math.min(window.innerHeight - size.height, dragRef.current.startPos.y + dy))
      
      setPosition({ x: newX, y: newY })
    }
    
    if (resizeRef.current.isResizing) {
      e.preventDefault()
      const touch = e.touches[0]
      const dx = touch.clientX - resizeRef.current.startX
      const dy = touch.clientY - resizeRef.current.startY
      
      const minW = isPro ? 480 : 320
      const newW = Math.max(minW, Math.min(900, resizeRef.current.startSize.width + dx))
      const newH = Math.max(400, Math.min(900, resizeRef.current.startSize.height + dy))
      
      setSize({ width: newW, height: newH })
    }
  }

  const handleMouseUp = () => {
    dragRef.current.isDragging = false
    resizeRef.current.isResizing = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  const handleTouchEnd = () => {
    dragRef.current.isDragging = false
    resizeRef.current.isResizing = false
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', handleTouchEnd)
  }

  // Toggle Pro Mode and automatically resize calculator appropriately
  const togglePro = () => {
    setIsPro(prev => {
      const next = !prev
      setSize(s => ({
        width: next ? Math.min(800, s.width + 160) : Math.max(320, s.width - 160),
        height: s.height
      }))
      return next
    })
  }

  // Button styles helper
  const getBtnStyle = (colorType?: 'op' | 'eval' | 'clear' | 'normal'): React.CSSProperties => {
    const base: React.CSSProperties = {
      border: 'none',
      borderRadius: '12px',
      fontSize: '15px',
      fontWeight: '700',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.15s ease',
      fontFamily: 'inherit',
      userSelect: 'none',
      height: '46px',
    }

    if (colorType === 'eval') {
      return {
        ...base,
        background: 'var(--primary)',
        color: '#fff',
        boxShadow: '0 4px 10px rgba(54,54,232,0.25)',
      }
    }
    if (colorType === 'clear') {
      return {
        ...base,
        background: 'var(--danger-light)',
        color: 'var(--danger)',
        boxShadow: '3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light)',
      }
    }
    if (colorType === 'op') {
      return {
        ...base,
        background: 'var(--primary-light)',
        color: 'var(--primary)',
        boxShadow: '3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light)',
      }
    }

    // Normal buttons
    return {
      ...base,
      background: 'var(--surface)',
      color: 'var(--text-primary)',
      boxShadow: '3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light)',
    }
  }

  return (
    <div
      ref={modalRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex: 2000,
        background: 'var(--surface)',
        borderRadius: '24px',
        boxShadow: '10px 10px 30px rgba(0,0,0,0.12), -10px -10px 30px var(--neu-light)',
        border: '1px solid rgba(255,255,255,0.8)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Draggable Title Header Bar */}
      <div
        onMouseDown={handleHeaderMouseDown}
        onTouchStart={handleHeaderTouchStart}
        style={{
          padding: '12px 18px',
          background: 'var(--surface-2)',
          borderBottom: '1px solid var(--neu-dark)',
          cursor: 'move',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '0.03em' }}>
            {isPro ? 'PRO CALCULATOR' : 'CALCULATOR'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
          {/* Deg/Rad Selector */}
          <button
            onClick={() => setIsDegree(!isDegree)}
            style={{
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              border: 'none',
              borderRadius: '20px',
              padding: '3px 8px',
              fontSize: '10px',
              fontWeight: 800,
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            {isDegree ? 'DEG' : 'RAD'}
          </button>
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Screen Area */}
      <div
        style={{
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          background: 'var(--surface)',
        }}
      >
        {/* Expression and Result Box */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '16px',
            background: 'var(--surface)',
            boxShadow: 'inset 3px 3px 6px var(--neu-dark), inset -3px -3px 6px var(--neu-light)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: '4px',
          }}
        >
          {/* Expression line */}
          <div style={{ minHeight: '16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
            {expression || ' '}
          </div>
          {/* Interactive Input display */}
          <input
            type="text"
            value={expression}
            onChange={(e) => {
              setExpression(e.target.value)
              setError('')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleEvaluate()
            }}
            placeholder="0"
            style={{
              border: 'none',
              background: 'none',
              outline: 'none',
              textAlign: 'right',
              fontSize: '22px',
              fontWeight: '800',
              color: 'var(--text-primary)',
              width: '100%',
              fontFamily: 'inherit',
              padding: 0,
            }}
          />
          {/* Result line */}
          {result && (
            <div style={{ textAlign: 'right', fontSize: '15px', fontWeight: '800', color: 'var(--success)' }}>
              = {result}
            </div>
          )}
          {/* Error Message */}
          {error && (
            <div style={{ textAlign: 'right', fontSize: '11px', fontWeight: '700', color: 'var(--danger)' }}>
              {error}
            </div>
          )}
        </div>

        {/* Action Toggle Strip */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
          <button
            onClick={togglePro}
            style={{
              background: isPro ? 'var(--primary)' : 'var(--surface)',
              color: isPro ? '#fff' : 'var(--primary)',
              border: 'none',
              borderRadius: '12px',
              padding: '6px 14px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: isPro ? 'none' : '2px 2px 5px var(--neu-dark), -2px -2px 5px var(--neu-light)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            🌟 PRO TOOLS
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{
              background: showHistory ? 'var(--primary-light)' : 'var(--surface)',
              color: 'var(--text-secondary)',
              border: 'none',
              borderRadius: '12px',
              padding: '6px 14px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '2px 2px 5px var(--neu-dark), -2px -2px 5px var(--neu-light)',
            }}
          >
            📋 HISTORY ({history.length})
          </button>
        </div>
      </div>

      {/* Main Inner Body: Grids & History Panel */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        
        {/* Buttons Panels Grid */}
        <div style={{ flex: 1, display: 'flex', padding: '16px', gap: '16px', overflowY: 'auto' }}>
          
          {/* Pro Panel (Scientific tools) */}
          {isPro && (
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', animation: 'fadeIn 0.2s ease-in' }}>
              <button onClick={() => handleKeyPress('sin')} style={getBtnStyle('op')}>sin</button>
              <button onClick={() => handleKeyPress('cos')} style={getBtnStyle('op')}>cos</button>
              <button onClick={() => handleKeyPress('tan')} style={getBtnStyle('op')}>tan</button>
              <button onClick={() => handleKeyPress('ln')} style={getBtnStyle('op')}>ln</button>
              <button onClick={() => handleKeyPress('log')} style={getBtnStyle('op')}>log</button>
              <button onClick={() => handleKeyPress('sqrt')} style={getBtnStyle('op')}>√</button>
              <button onClick={() => handleKeyPress('^')} style={getBtnStyle('op')}>xʸ</button>
              <button onClick={() => handleKeyPress('π')} style={getBtnStyle('op')}>π</button>
              <button onClick={() => handleKeyPress('e')} style={getBtnStyle('op')}>e</button>
            </div>
          )}

          {/* Standard Panel */}
          <div style={{ flex: 1.3, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            <button onClick={() => handleKeyPress('C')} style={getBtnStyle('clear')}>C</button>
            <button onClick={() => handleKeyPress('(')} style={getBtnStyle('op')}>(</button>
            <button onClick={() => handleKeyPress(')')} style={getBtnStyle('op')}>)</button>
            <button onClick={() => handleKeyPress('/')} style={getBtnStyle('op')}>/</button>

            <button onClick={() => handleKeyPress('7')} style={getBtnStyle()}>7</button>
            <button onClick={() => handleKeyPress('8')} style={getBtnStyle()}>8</button>
            <button onClick={() => handleKeyPress('9')} style={getBtnStyle()}>9</button>
            <button onClick={() => handleKeyPress('*')} style={getBtnStyle('op')}>*</button>

            <button onClick={() => handleKeyPress('4')} style={getBtnStyle()}>4</button>
            <button onClick={() => handleKeyPress('5')} style={getBtnStyle()}>5</button>
            <button onClick={() => handleKeyPress('6')} style={getBtnStyle()}>6</button>
            <button onClick={() => handleKeyPress('-')} style={getBtnStyle('op')}>-</button>

            <button onClick={() => handleKeyPress('1')} style={getBtnStyle()}>1</button>
            <button onClick={() => handleKeyPress('2')} style={getBtnStyle()}>2</button>
            <button onClick={() => handleKeyPress('3')} style={getBtnStyle()}>3</button>
            <button onClick={() => handleKeyPress('+')} style={getBtnStyle('op')}>+</button>

            <button onClick={() => handleKeyPress('0')} style={getBtnStyle()}>0</button>
            <button onClick={() => handleKeyPress('.')} style={getBtnStyle()}>.</button>
            <button onClick={() => handleKeyPress('⌫')} style={getBtnStyle()}>⌫</button>
            <button onClick={() => handleKeyPress('=')} style={getBtnStyle('eval')}>=</button>
          </div>
        </div>

        {/* Floating Side Drawer: History Logs */}
        {showHistory && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'var(--surface)',
              borderTop: '1px solid var(--neu-dark)',
              zIndex: 10,
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              animation: 'slideUp 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)' }}>RECENT CALCULATIONS</span>
              <button
                onClick={() => setHistory([])}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--danger)',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Clear History
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {history.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                  No calculations yet.
                </div>
              ) : (
                history.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setExpression(item.expr)
                      setResult(item.res)
                      setShowHistory(false)
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: 'var(--surface)',
                      boxShadow: '2px 2px 5px var(--neu-dark), -2px -2px 5px var(--neu-light)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      alignItems: 'stretch',
                      textAlign: 'right',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{item.expr}</span>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary)' }}>= {item.res}</span>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowHistory(false)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '12px',
                border: 'none',
                background: 'var(--text-primary)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Back to Keys
            </button>
          </div>
        )}
      </div>

      {/* Resize Handle Drag Area at bottom-right corner */}
      <div
        onMouseDown={handleResizeMouseDown}
        onTouchStart={handleResizeTouchStart}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: '18px',
          height: '18px',
          cursor: 'se-resize',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          padding: '2px',
          zIndex: 100,
        }}
      >
        {/* Tiny triangular diagonal resize stripes */}
        <svg width="10" height="10" viewBox="0 0 10 10">
          <line x1="10" y1="0" x2="0" y2="10" stroke="var(--text-muted)" strokeWidth="1.5" />
          <line x1="10" y1="4" x2="4" y2="10" stroke="var(--text-muted)" strokeWidth="1.5" />
          <line x1="10" y1="7" x2="7" y2="10" stroke="var(--text-muted)" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Animation/Keyframes helper in JS for simple standalone styling */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
    </div>
  )
}
