import React, { useState } from 'react';
import TitleScreen from './TitleScreen';
import CreateGame from './CreateGame';
import GameSelector from './GameSelector';
import PlayGame from './PlayGame';
import SongManager from './SongManager';

function App() {
  const [screen, setScreen] = useState('title');
  const [gameId, setGameId] = useState(null);

  return (
    <div style={{ minHeight: '100vh' }}>
      {screen === 'title' && (
        <TitleScreen 
          onCreate={() => setScreen('create')} 
          onPlay={() => setScreen('select')}
        />
      )}
      {screen === 'create' && (
        <CreateGame onGameCreated={id => { setGameId(id); setScreen('play'); }} />
      )}
      {screen === 'select' && (
        <GameSelector 
          onGameSelected={id => { setGameId(id); setScreen('play'); }}
          onBack={() => setScreen('title')}
          title="Jouer une partie"
        />
      )}
      {screen === 'play' && (
        <PlayGame gameId={gameId} onBack={() => setScreen('title')} />
      )}
    </div>
  );
}

export default App;
