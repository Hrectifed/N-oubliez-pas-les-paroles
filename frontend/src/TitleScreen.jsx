import React from 'react';

function TitleScreen({ onCreate, onPlay, onManageSongs }) {
  return (
    <div style={{ textAlign: 'center', marginTop: 40 }}>
      <h1>Retenez les paroles</h1>
      <div style={{ margin: '20px 0' }}>
        <button onClick={onCreate} style={{ margin: '0 10px', padding: '10px 20px' }}>
          Créer une partie
        </button>
        <button onClick={onPlay} style={{ margin: '0 10px', padding: '10px 20px' }}>
          Jouer une partie
        </button>
        <button onClick={onManageSongs} style={{ margin: '0 10px', padding: '10px 20px' }}>
          Gérer les chansons
        </button>
      </div>
    </div>
  );
}

export default TitleScreen;
