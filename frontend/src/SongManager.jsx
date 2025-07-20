import React, { useState } from 'react';
import { addSong } from './api';
import LyricsSelector from './LyricsSelector';
import { parseLRC } from './lrcUtils';

function SongManager({ onSongAdded, onBack }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [spotifyId, setSpotifyId] = useState('');
  const [lrcContent, setLrcContent] = useState('');
  const [parsedLyrics, setParsedLyrics] = useState([]);
  const [selectedLines, setSelectedLines] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLrcChange = (content) => {
    setLrcContent(content);
    try {
      const parsed = parseLRC(content);
      setParsedLyrics(parsed);
      setSelectedLines([]);
    } catch (error) {
      console.error('Error parsing LRC:', error);
      setParsedLyrics([]);
    }
  };

  const toggleLineSelection = (index) => {
    setSelectedLines(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index].sort((a, b) => a - b)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const song = {
        title,
        category,
        youtube_url: youtubeUrl,
        spotify_id: spotifyId,
        lrc: lrcContent,
        hidden_line_indices: selectedLines
      };

      const result = await addSong(song);
      console.log('Song added:', result);
      
      // Reset form
      setTitle('');
      setCategory('');
      setYoutubeUrl('');
      setSpotifyId('');
      setLrcContent('');
      setParsedLyrics([]);
      setSelectedLines([]);
      
      if (onSongAdded) onSongAdded(result);
      alert('Chanson ajoutée avec succès !');
    } catch (error) {
      console.error('Error adding song:', error);
      alert('Erreur lors de l\'ajout de la chanson');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sampleLrc = `[00:12.50]Imagine all the people
[00:16.30]Living life in peace
[00:20.10]You may say I'm a dreamer
[00:24.00]But I'm not the only one
[00:27.80]I hope someday you'll join us
[00:31.60]And the world will be as one`;

  const loadSample = () => {
    setTitle('Imagine');
    setCategory('Classic Rock');
    setYoutubeUrl('https://www.youtube.com/watch?v=YkgkThdzX-8');
    setSpotifyId('7pKfPomDEeI4TPT6EOYjn9');
    handleLrcChange(sampleLrc);
    setSelectedLines([2, 3]); // "You may say I'm a dreamer" and "But I'm not the only one"
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Ajouter une chanson</h2>
        {onBack && (
          <button 
            onClick={onBack}
            style={{ 
              padding: '8px 16px',
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retour
          </button>
        )}
      </div>
      
      <button 
        onClick={loadSample}
        style={{ 
          marginBottom: '20px', 
          padding: '8px 16px',
          backgroundColor: '#4caf50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Charger un exemple
      </button>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px' }}>Titre:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px' }}>Catégorie:</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px' }}>URL YouTube:</label>
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px' }}>Spotify ID:</label>
          <input
            type="text"
            value={spotifyId}
            onChange={(e) => setSpotifyId(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px' }}>
            Contenu LRC (format: [mm:ss.ff]texte):
          </label>
          <textarea
            value={lrcContent}
            onChange={(e) => handleLrcChange(e.target.value)}
            required
            style={{ 
              width: '100%', 
              height: '150px', 
              padding: '8px', 
              border: '1px solid #ddd', 
              borderRadius: '4px',
              fontFamily: 'monospace'
            }}
            placeholder="[00:12.50]Premier ligne de paroles
[00:16.30]Deuxième ligne de paroles"
          />
        </div>

        {parsedLyrics.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>
              Sélectionnez les lignes à cacher ({selectedLines.length} sélectionnées):
            </label>
            <LyricsSelector 
              lines={parsedLyrics}
              selected={selectedLines}
              onToggle={toggleLineSelection}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || parsedLyrics.length === 0}
          style={{
            padding: '12px 24px',
            backgroundColor: isSubmitting ? '#ccc' : '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          {isSubmitting ? 'Ajout en cours...' : 'Ajouter la chanson'}
        </button>
      </form>
    </div>
  );
}

export default SongManager;