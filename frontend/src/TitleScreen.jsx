import React from 'react';

function TitleScreen({ onCreate, onPlay }) {
  return (
    <div className="container text-center" style={{ marginTop: '60px' }}>
      <div className="card" style={{ 
        maxWidth: '600px', 
        margin: '0 auto',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)'
      }}>
        <div className="card-body p-4">
          <h1 className="text-primary mb-3" style={{ 
            fontSize: '3rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            🎵 Retenez les paroles
          </h1>
          <p className="text-secondary mb-4" style={{ fontSize: '1.1rem' }}>
            Testez votre mémoire musicale dans ce jeu inspiré de "N'oubliez pas les paroles"
          </p>
          <div className="flex gap-3 justify-center" style={{ flexWrap: 'wrap' }}>
            <button 
              onClick={onCreate} 
              className="btn-primary"
              style={{ 
                fontSize: '1.1rem',
                padding: '16px 32px',
                minWidth: '180px'
              }}
            >
              🎮 Créer une partie
            </button>
            <button 
              onClick={onPlay} 
              className="btn-secondary"
              style={{ 
                fontSize: '1.1rem',
                padding: '16px 32px',
                minWidth: '180px'
              }}
            >
              ▶️ Jouer une partie
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TitleScreen;
