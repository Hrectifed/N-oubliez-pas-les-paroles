import React from 'react';

function TitleScreen({ onCreate, onPlay }) {
  return (
    <div className="container">
      <div className="columnscontainer">
        <div className='column' style={{ maxHeight: '100%' }}>
          <img src="/src/assets/placeholder.png" style={{ width: '100%' }}></img>
          <button onClick={onCreate} className='button btn-primary'>Créer une partie</button>
        </div>
        <div className='column' style={{ maxHeight: '100%' }}>
          <img src="/src/assets/placeholder.png" style={{ width: '100%' }}></img>
          <button onClick={onPlay} className='button btn-primary'>Jouer une partie</button>
        </div>
      </div>
    </div>
  );
}

export default TitleScreen;
