import React, { useRef } from 'react';
import { exportData, importData } from './api';

function TitleScreen({ onCreate, onPlay }) {
  const fileInputRef = useRef(null);

  const handleExport = async () => {
    try {
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `retenez-les-paroles-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Erreur lors de l\'export: ' + error.message);
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importData(data);
      alert('Données importées avec succès!');
      // Reset file input
      event.target.value = '';
    } catch (error) {
      alert('Erreur lors de l\'import: ' + error.message);
      event.target.value = '';
    }
  };
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
          
          <hr style={{ margin: '2rem 0', border: '1px solid #eee' }} />
          
          <div className="flex gap-3 justify-center" style={{ flexWrap: 'wrap' }}>
            <button 
              onClick={handleExport} 
              className="btn-outline-secondary"
              style={{ 
                fontSize: '1rem',
                padding: '12px 24px',
                minWidth: '140px'
              }}
            >
              📤 Exporter
            </button>
            <button 
              onClick={handleImport} 
              className="btn-outline-secondary"
              style={{ 
                fontSize: '1rem',
                padding: '12px 24px',
                minWidth: '140px'
              }}
            >
              📥 Importer
            </button>
          </div>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            style={{ display: 'none' }}
          />
        </div>
      </div>
    </div>
  );
}

export default TitleScreen;
