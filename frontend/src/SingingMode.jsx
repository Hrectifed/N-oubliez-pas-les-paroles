import React, { useState, useEffect, useRef } from 'react';
import YouTube from 'react-youtube';

function SingingMode({ song, onAttemptSubmit, onBack }) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true); // Auto-start
  const [hiddenWordsInput, setHiddenWordsInput] = useState([]);
  const [showInputs, setShowInputs] = useState(false);
  const [hiddenStartTime, setHiddenStartTime] = useState(null);
  const [hiddenEndTime, setHiddenEndTime] = useState(null);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);
  const [inputResults, setInputResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [resultDisplayEndTime, setResultDisplayEndTime] = useState(null);
  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const resultTimeoutRef = useRef(null);

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
        
        // Calculate end time based on next line or assume 4 seconds per line
        const nextLineIndex = song.hidden_line_indices[lineIdx + 1];
        if (nextLineIndex && song.lyrics[nextLineIndex]) {
          endTime = song.lyrics[nextLineIndex].time;
        } else {
          // For the last hidden line, look for the next non-hidden line
          const currentIndex = song.hidden_line_indices[lineIdx];
          const nextLyric = song.lyrics[currentIndex + 1];
          if (nextLyric) {
            endTime = nextLyric.time;
          } else {
            endTime = line.time + 4000; // 4 seconds fallback
          }
        }

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

          // Check if we should hide the results overlay
          if (resultDisplayEndTime && time >= resultDisplayEndTime) {
            setShowInputs(false);
            setShowResults(false);
            setResultDisplayEndTime(null);
          }
        }
      }, 100);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isPlaying, hiddenStartTime, showInputs, resultDisplayEndTime]);

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
    // Auto-start the video
    event.target.playVideo();
  };

  const onPlayerStateChange = (event) => {
    const isCurrentlyPlaying = event.data === YouTube.PlayerState.PLAYING;
    setIsPlaying(isCurrentlyPlaying);
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
    
    // Set up when to hide results and automatically continue
    const hideResultsTime = currentTime + 5000; // Show results for 5 seconds
    setResultDisplayEndTime(hideResultsTime);
    
    // Resume video immediately but keep showing results overlay
    if (playerRef.current) {
      playerRef.current.playVideo();
      setIsPlaying(true);
    }
    
    // Auto-hide and continue after 5 seconds
    setTimeout(() => {
      setShowInputs(false);
      setShowResults(false);
      setResultDisplayEndTime(null);
      // The parent component will handle next player transition
    }, 5000);
  };

  const renderLyrics = () => {
    if (!song?.lyrics) return <div>Paroles non disponibles</div>;

    // Show only the current line in a single box
    const currentLyric = song.lyrics[currentLyricIndex];
    if (!currentLyric) return <div>Paroles non disponibles</div>;

    const isHidden = song.hidden_line_indices?.includes(currentLyricIndex);

    // If current line is hidden and we're showing inputs, don't show the lyric text
    if (isHidden && showInputs) {
      return null; // Hidden lines are shown as inputs instead
    }

    // If current line is hidden but we're not showing inputs yet, hide it completely
    if (isHidden) {
      return (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#000',
          minHeight: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          ♪ ♪ ♪
        </div>
      );
    }

    // Hide lyrics that come after when showing results to prevent spoilers
    if (showResults && showInputs) {
      return (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#666',
          minHeight: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f0f0f0',
          borderRadius: '8px'
        }}>
          <i>Paroles masquées pendant la validation...</i>
        </div>
      );
    }

    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#000',
        minHeight: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#e3f2fd',
        borderRadius: '8px'
      }}>
        {currentLyric.text}
      </div>
    );
  };

  const renderWordInputs = () => {
    if (!showInputs) return null;

    return (
      <div style={{ 
        background: 'rgba(245, 245, 245, 0.95)', 
        padding: '20px', 
        borderRadius: '8px', 
        margin: '20px 0',
        position: 'relative',
        zIndex: 10
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
                width: `${Math.max(80, (inputResults[index]?.word.length || 4) * 12)}px`,
                padding: '10px',
                border: showResults 
                  ? `3px solid ${inputResults[index]?.correct ? '#4caf50' : '#f44336'}`
                  : '2px solid #ddd',
                borderRadius: '6px',
                fontSize: '16px',
                textAlign: 'center',
                backgroundColor: showResults 
                  ? (inputResults[index]?.correct ? '#c8e6c9' : '#ffcdd2')
                  : 'white',
                fontWeight: showResults ? 'bold' : 'normal'
              }}
              placeholder="___"
              autoComplete="off"
              disabled={showResults}
            />
          ))}
        </div>
        
        {showResults && (
          <div style={{ 
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#fff',
            borderRadius: '6px',
            border: '2px solid #e0e0e0'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              marginBottom: '8px',
              fontSize: '16px',
              fontWeight: 'bold'
            }}>
              {inputResults.every(r => r.correct) ? (
                <span style={{ color: '#4caf50' }}>🎉 Parfait ! Toutes les réponses sont correctes !</span>
              ) : (
                <span style={{ color: '#f44336' }}>❌ Quelques erreurs... Voici les bonnes réponses :</span>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {inputResults.map((result, index) => (
                <span
                  key={index}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '4px',
                    backgroundColor: result.correct ? '#4caf50' : '#f44336',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  {result.word}
                </span>
              ))}
            </div>
            <div style={{ 
              marginTop: '8px', 
              fontSize: '12px', 
              color: '#666',
              fontStyle: 'italic'
            }}>
              Les résultats disparaîtront automatiquement...
            </div>
          </div>
        )}

        {!showResults && (
          <button
            onClick={submitAttempt}
            disabled={hiddenWordsInput.some(word => !word.trim())}
            style={{
              padding: '12px 24px',
              backgroundColor: hiddenWordsInput.some(word => !word.trim()) ? '#ccc' : '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: hiddenWordsInput.some(word => !word.trim()) ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            Valider les réponses
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
                showinfo: 0,
                autoplay: 1 // Enable autoplay
              }
            }}
          />
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
        minHeight: '150px'
      }}>
        <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>Paroles</h3>
        {renderLyrics()}
        {renderWordInputs()}
      </div>
    </div>
  );
}

export default SingingMode;