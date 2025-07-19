import React, { useState } from 'react';
import TitleScreen from './TitleScreen';
import CreateGame from './CreateGame';
import PlayGame from './PlayGame';

function App() {
  const [screen, setScreen] = useState('title');
  const [gameId, setGameId] = useState(null);

  return (
    <div>
      {screen === 'title' && (
        <TitleScreen onCreate={() => setScreen('create')} onPlay={() => setScreen('play')} />
      )}
      {screen === 'create' && (
        <CreateGame onGameCreated={id => { setGameId(id); setScreen('play'); }} />
      )}
      {screen === 'play' && (
        <PlayGame gameId={gameId} />
      )}
    </div>
  );
}

export default App;
