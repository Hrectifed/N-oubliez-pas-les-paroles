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
        <div className='lyrics-container' style={{
          textAlign: 'center',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          ♪ ♪ ♪
        </div>
      );
    }

    // Hide lyrics that come after when showing results to prevent spoilers
    if (showResults && showInputs) {
      return (
        <div className='lyrics-container' style={{
          textAlign: 'center',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <i>Paroles masquées pendant la validation...</i>
        </div>
      );
    }

    return (
      <div className='lyrics-container' style={{
        textAlign: 'center',
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {currentLyric.text}
      </div>
    );
  };

  const renderWordInputs = () => {
    if (!showInputs) return null;

    return (
      <div className='lyrics-container' style={{ 
          textAlign: 'center',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
      }}>
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
              textAlign: 'center',
              color: showResults 
                ? (inputResults[index]?.correct ? 'var(--Text-color-Validate)' : 'var(--Text-color-Wrong)')
                : 'var(--Text-color-Player)',
            }}
            placeholder="___"
            autoComplete="off"
            disabled={showResults}
          />
        ))}
        {showResults && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {inputResults.map((result, index) => (
            <span
              key={index}
              style={{
                color: result.correct ? 'var(--Text-color-Validate)' : 'var(--Text-color-Wrong)',
              }}
            >
              {result.word}
            </span>
          ))}
        </div>
        )}
        {!showResults && (
        <button
          onClick={submitAttempt}
          disabled={hiddenWordsInput.some(word => !word.trim())}
          style={{
            margin: '8px',
            height: '100%',
            backgroundColor: hiddenWordsInput.some(word => !word.trim()) ? '#7c7c7cff' : '#272727ff',
            color: 'var(--Text-color-Primary)',
            border: 'var(--Stroke-Stroke, rgba(255, 255, 255, 1))',
            borderRadius: '8px',
            cursor: hiddenWordsInput.some(word => !word.trim()) ? 'not-allowed' : 'pointer',
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
    <div style={{ maxWidth: '100vw', margin: '0 0', padding: '32px' }}>

      {youtubeId ? (
        <div style={{ marginBottom: '20px' }}>
          <YouTube
            videoId={youtubeId}
            onReady={onPlayerReady}
            onStateChange={onPlayerStateChange}
            opts={{
              width: '100%',
              height: '80vh',
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
          width: '100%',
          height: '80vh',
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          textAlign: 'center' 
        }}>
          <p>Vidéo YouTube non disponible</p>
          <p>URL: {song?.youtube_url}</p>
        </div>
      )}

      <div className='lyrics-container' style={{ 
        position: 'absolute',
        width: 'calc(100% - 80px)',
        laft : '40px',
        right: '40px',
        bottom: '40px',
      }}>
        <h3 style={{ textAlign: 'center'}}>Paroles</h3>
        {renderLyrics()}
        {renderWordInputs()}
      </div>
    </div>
  );
}

export default SingingMode;