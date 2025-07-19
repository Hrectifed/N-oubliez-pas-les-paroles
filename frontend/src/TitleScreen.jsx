import React from 'react';

function TitleScreen({ onCreate, onPlay }) {
  return (
    <div style={{ textAlign: 'center', marginTop: 40 }}>
      <h1>Retenez les paroles</h1>
      <button onClick={onCreate}>Créer une partie</button>
      <button onClick={onPlay} style={{ marginLeft: 10 }}>Jouer une partie</button>
    </div>
  );
}

export default TitleScreen;
