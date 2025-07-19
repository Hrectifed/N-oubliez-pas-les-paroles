import React from 'react';

function LyricsSelector({ lines, selected, onToggle }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 400, overflowY: 'auto', border: '1px solid #ccc', borderRadius: 4 }}>
      {lines.map((line, idx) => (
        <div key={idx} style={{ display: 'flex', alignItems: 'center', background: selected.includes(idx) ? '#e0f7fa' : 'transparent' }}>
          <span style={{ width: 32, textAlign: 'right', color: '#888', fontFamily: 'monospace', marginRight: 8 }}>{idx + 1}</span>
          <input
            type="checkbox"
            checked={selected.includes(idx)}
            onChange={() => onToggle(idx)}
            style={{ marginRight: 8 }}
          />
          <span>{line.text}</span>
        </div>
      ))}
    </div>
  );
}

export default LyricsSelector;
