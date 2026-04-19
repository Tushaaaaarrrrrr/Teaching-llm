import React from 'react';

export function RichTextDisplay({ text }: { text: string | undefined | null }) {
  if (!text) return null;

  // Split text by code blocks (e.g. ```language\n code \n```)
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div style={{ wordBreak: 'break-word' }}>
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const match = part.match(/^```(\w+)?\n([\s\S]*?)```$/) || part.match(/^```(\w+)?([\s\S]*?)```$/);
          
          if (match) {
            const lang = match[1] || '';
            const code = match[2] || '';
            return (
              <pre key={index} style={{
                background: '#1e1e3a',
                color: '#fff',
                padding: '16px',
                borderRadius: '12px',
                overflowX: 'auto',
                fontFamily: 'monospace',
                fontSize: '14px',
                marginTop: '12px',
                marginBottom: '12px',
                position: 'relative'
              }}>
                {lang && (
                  <div style={{ position: 'absolute', top: 0, right: '16px', background: '#3636e8', fontSize: '10px', padding: '4px 8px', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', fontWeight: 800, textTransform: 'uppercase' }}>
                    {lang}
                  </div>
                )}
                <code>{code.trim()}</code>
              </pre>
            );
          }
          return <pre key={index}><code>{part.replace(/```/g, '')}</code></pre>;
        }
        
        // Normal text wrapper with whiteSpace pre-wrap so linebreaks and math are preserved
        return (
          <span key={index} style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
            {part}
          </span>
        );
      })}
    </div>
  );
}
