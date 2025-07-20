import React, { useState, useEffect, useRef } from 'react';
import YouTube from 'react-youtube';

function SingingMode({ song, onAttemptSubmit, onBack }) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hiddenWordsInput, setHiddenWordsInput] = useState([]);
  const [showInputs, setShowInputs] = useState(false);
  const [hiddenStartTime, setHiddenStartTime] = useState(null);
  const [hiddenEndTime, setHiddenEndTime] = useState(null);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);
  const [inputResults, setInputResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const playerRef = useRef(null);
  const intervalRef = useRef(null);

  // Extract YouTube video ID from URL
  const getYouTubeId = (url) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  };

  // Get hidden words and their timing
  useEffect(() => {
    if (!song?.lyrics || !song?.hidden_line_indices) return;

    const hiddenLines = song.hidden_line_indices.map(idx => song.lyrics[idx]);
    const hiddenWords = [];
    let startTime = null;
    let endTime = null;

    hiddenLines.forEach((line, lineIdx) => {
      if (line && line.text) {
        if (startTime === null) startTime = line.time;
        endTime = line.time + 5000; // Assume 5 seconds per line if no next line

        const words = line.text.match(/\b\w+\b/g) || [];
        words.forEach(word => {
          hiddenWords.push(word);
        });
      }
    });

    setHiddenWordsInput(new Array(hiddenWords.length).fill(''));
    setHiddenStartTime(startTime);
    setHiddenEndTime(endTime);
  }, [song]);

  // Update current time and check for hidden sections
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        if (playerRef.current) {
          const time = playerRef.current.getCurrentTime() * 1000;
          setCurrentTime(time);

          // Check if we're at the hidden section
          if (hiddenStartTime && !showInputs && time >= hiddenStartTime) {
            playerRef.current.pauseVideo();
            setShowInputs(true);
            setIsPlaying(false);
          }
        }
      }, 100);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isPlaying, hiddenStartTime, showInputs]);

  // Find current lyric based on time
  useEffect(() => {
    if (!song?.lyrics) return;
    
    for (let i = song.lyrics.length - 1; i >= 0; i--) {
      if (currentTime >= song.lyrics[i].time) {
        setCurrentLyricIndex(i);
        break;
      }
    }
  }, [currentTime, song]);

  const onPlayerReady = (event) => {
    playerRef.current = event.target;
  };

  const onPlayerStateChange = (event) => {
    setIsPlaying(event.data === YouTube.PlayerState.PLAYING);
  };

  const handlePlay = () => {
    if (playerRef.current) {
      playerRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  const handlePause = () => {
    if (playerRef.current) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
    }
  };

  const handleWordInputChange = (index, value) => {
    const newInputs = [...hiddenWordsInput];
    newInputs[index] = value;
    setHiddenWordsInput(newInputs);

    // Auto-advance to next input on space or enter
    if (value.includes(' ') || value.includes('\n')) {
      const cleanValue = value.replace(/[\s\n]/g, '');
      newInputs[index] = cleanValue;
      setHiddenWordsInput(newInputs);
      
      if (index < hiddenWordsInput.length - 1) {
        const nextInput = document.getElementById(`word-input-${index + 1}`);
        if (nextInput) nextInput.focus();
      }
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (index < hiddenWordsInput.length - 1) {
        const nextInput = document.getElementById(`word-input-${index + 1}`);
        if (nextInput) nextInput.focus();
      }
    }
  };

  const submitAttempt = async () => {
    const result = await onAttemptSubmit(hiddenWordsInput);
    setInputResults(result.word_results || []);
    setShowResults(true);
    
    // Resume video after showing results for 3 seconds
    setTimeout(() => {
      setShowInputs(false);
      setShowResults(false);
      if (playerRef.current) {
        playerRef.current.playVideo();
        setIsPlaying(true);
      }
    }, 3000);
  };

  const renderLyrics = () => {
    if (!song?.lyrics) return <div>Paroles non disponibles</div>;

    return song.lyrics.map((lyric, index) => {
      const isHidden = song.hidden_line_indices?.includes(index);
      const isCurrent = index === currentLyricIndex;
      const isPast = currentTime > lyric.time + 3000; // 3 seconds after line starts

      if (isHidden && showInputs) {
        return null; // Hidden lines are shown as inputs
      }

      return (
        <div
          key={index}
          style={{
            padding: '4px 0',
            backgroundColor: isCurrent ? '#e3f2fd' : 'transparent',
            fontWeight: isCurrent ? 'bold' : 'normal',
            opacity: isPast ? 0.6 : 1,
            color: isHidden ? '#999' : '#000'
          }}
        >
          {lyric.text}
        </div>
      );
    });
  };

  const renderWordInputs = () => {
    if (!showInputs) return null;

    return (
      <div style={{ 
        background: '#f5f5f5', 
        padding: '20px', 
        borderRadius: '8px', 
        margin: '20px 0' 
      }}>
        <h4>Complétez les paroles :</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {hiddenWordsInput.map((word, index) => (
            <input
              key={index}
              id={`word-input-${index}`}
              type="text"
              value={word}
              onChange={(e) => handleWordInputChange(index, e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              style={{
                width: `${Math.max(60, (inputResults[index]?.word.length || 4) * 10)}px`,
                padding: '8px',
                border: '2px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px',
                textAlign: 'center',
                backgroundColor: showResults 
                  ? (inputResults[index]?.correct ? '#c8e6c9' : '#ffcdd2')
                  : 'white'
              }}
              placeholder="___"
              autoComplete="off"
            />
          ))}
        </div>
        
        {showResults && (
          <div style={{ marginBottom: '16px' }}>
            <h5>Résultats :</h5>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {inputResults.map((result, index) => (
                <span
                  key={index}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: result.correct ? '#4caf50' : '#f44336',
                    color: 'white',
                    fontSize: '14px'
                  }}
                >
                  {result.word}
                </span>
              ))}
            </div>
          </div>
        )}

        {!showResults && (
          <button
            onClick={submitAttempt}
            disabled={hiddenWordsInput.some(word => !word.trim())}
            style={{
              padding: '12px 24px',
              backgroundColor: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Valider
          </button>
        )}
      </div>
    );
  };

  const youtubeId = getYouTubeId(song?.youtube_url || '');

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>{song?.title}</h2>
        <button onClick={onBack} style={{ padding: '8px 16px' }}>
          Retour
        </button>
      </div>

      {youtubeId ? (
        <div style={{ marginBottom: '20px' }}>
          <YouTube
            videoId={youtubeId}
            onReady={onPlayerReady}
            onStateChange={onPlayerStateChange}
            opts={{
              width: '100%',
              height: '315',
              playerVars: {
                controls: 0,
                disablekb: 1,
                fs: 0,
                iv_load_policy: 3,
                modestbranding: 1,
                rel: 0,
                showinfo: 0
              }
            }}
          />
          
          <div style={{ marginTop: '10px', textAlign: 'center' }}>
            <button
              onClick={handlePlay}
              disabled={isPlaying}
              style={{ margin: '0 5px', padding: '8px 16px' }}
            >
              ▶ Play
            </button>
            <button
              onClick={handlePause}
              disabled={!isPlaying}
              style={{ margin: '0 5px', padding: '8px 16px' }}
            >
              ⏸ Pause
            </button>
          </div>
        </div>
      ) : (
        <div style={{ 
          background: '#ffebee', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          textAlign: 'center' 
        }}>
          <p>Vidéo YouTube non disponible</p>
          <p>URL: {song?.youtube_url}</p>
        </div>
      )}

      <div style={{ 
        background: '#fafafa', 
        padding: '20px', 
        borderRadius: '8px',
        maxHeight: '400px',
        overflowY: 'auto'
      }}>
        <h3>Paroles</h3>
        {renderLyrics()}
        {renderWordInputs()}
      </div>
    </div>
  );
}

export default SingingMode;