import React, { useState, useEffect } from 'react';
import './App.css';
import { parseCommand } from './commandParser';

function App() {
  // State variables strictly conforming to Phase 1, 2, & 3 requirements
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  
  const [parsedResult, setParsedResult] = useState(null);
  
  // Phase 3 States
  const [language, setLanguage] = useState('en-US');
  const [isParsing, setIsParsing] = useState(false);
  const [parseSource, setParseSource] = useState(''); // 'Gemini' or 'Rule-based (fallback)'

  // Check browser support on component mount
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setError("Voice recognition isn't supported in this browser. Please use Google Chrome.");
    }
  }, []);

  const handleStartListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    // Safety guard if the browser does not support SpeechRecognition
    if (!SpeechRecognition) {
      setError("Voice recognition isn't supported in this browser. Please use Google Chrome.");
      return;
    }

    // Reset error message on a fresh attempt
    setError('');

    try {
      const recognition = new SpeechRecognition();

      // Phase 1 Requirements
      recognition.continuous = false;
      recognition.interimResults = false;
      
      // Phase 3: Set dynamic language
      recognition.lang = language;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = async (event) => {
        // Extract the final recognized speech transcript
        const currentTranscript = event.results[0][0].transcript;
        setTranscript(currentTranscript);
        
        setIsParsing(true);
        setParsedResult(null);
        setParseSource('');

        try {
          // Phase 3: Gemini API fetch with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const res = await fetch('/api/parse', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: currentTranscript }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);

          if (!res.ok) {
            throw new Error(`API returned ${res.status}`);
          }

          const data = await res.json();
          
          // Validate structure
          const validActions = ['add', 'remove', 'unknown'];
          if (
            data && 
            typeof data === 'object' && 
            validActions.includes(data.action) && 
            (data.item === null || typeof data.item === 'string') && 
            (data.quantity === null || typeof data.quantity === 'number')
          ) {
            setParsedResult(data);
            setParseSource('Gemini');
          } else {
            throw new Error('Invalid response shape from API');
          }

        } catch (err) {
          // Fallback to Phase 2 rule-based parser on any failure/timeout
          console.warn('Gemini NLP failed, falling back to rule-based parser:', err);
          setParsedResult(parseCommand(currentTranscript));
          setParseSource('Rule-based (fallback)');
        } finally {
          setIsParsing(false);
        }
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setError('Microphone access was denied. Please allow microphone permissions in your browser.');
        } else if (event.error === 'no-speech') {
          setError('No speech was detected. Please try speaking again.');
        } else if (event.error === 'audio-capture') {
          setError('No microphone found. Please ensure a microphone is connected.');
        } else if (event.error === 'network') {
          setError('Network error occurred during speech recognition. Please check your connection.');
        } else {
          setError(`Speech recognition error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      setIsListening(false);
      setError('Unable to start speech recognition. Please try again.');
    }
  };

  return (
    <div className="App">
      <div className="card">
        <header className="card-header">
          <h1 className="title">🛒 Voice Command Shopping Assistant</h1>
          <p className="subtitle">Phase 3: Gemini NLP + Rule-based Fallback</p>
        </header>

        {/* Browser Compatibility Notice */}
        {!isSupported && (
          <div className="alert alert-warning" role="alert">
            Voice recognition isn't supported in this browser. Please use Google Chrome.
          </div>
        )}

        {/* Error Alert Display */}
        {error && isSupported && (
          <div className="alert alert-danger" role="alert">
            ⚠️ {error}
          </div>
        )}

        {/* Active Listening Indicator */}
        {isListening && (
          <div className="listening-indicator" aria-live="polite">
            <span className="pulse-dot"></span>
            🎙️ Listening...
          </div>
        )}

        {/* Phase 3: Language Selection */}
        <div className="language-selector">
          <label htmlFor="lang-select">Language: </label>
          <select 
            id="lang-select" 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)} 
            disabled={isListening || isParsing}
          >
            <option value="en-US">English</option>
            <option value="hi-IN">Hindi</option>
          </select>
        </div>

        {/* Voice Recognition Trigger Button */}
        <div className="controls">
          <button
            type="button"
            className={`btn-listen ${isListening ? 'listening' : ''}`}
            onClick={handleStartListening}
            disabled={isListening || isParsing || !isSupported}
          >
            {isListening ? '🎙️ Listening...' : '🎙️ Start Listening'}
          </button>
        </div>

        {/* Recognized Transcript Display Card */}
        <section className="transcript-section">
          <h2 className="section-title">Recognized Transcript</h2>
          <div className="transcript-container">
            {transcript ? (
              <p className="transcript-text">{transcript}</p>
            ) : (
              <p className="transcript-placeholder">
                Your recognized speech will appear here after you click &quot;Start Listening&quot; and finish speaking.
              </p>
            )}
          </div>
        </section>

        {/* Parsing Indicator */}
        {isParsing && (
          <div className="parsing-indicator">
            Parsing command...
          </div>
        )}

        {/* Phase 2 & 3: Parsed Result Display */}
        {parsedResult && !isParsing && (
          <section className="parsed-section">
            <h2 className="section-title">Parsed Command</h2>
            <div className="parsed-container">
              <p><strong>Action:</strong> <span className="parsed-val">{parsedResult.action}</span></p>
              <p><strong>Item:</strong> <span className="parsed-val">{parsedResult.item || 'N/A'}</span></p>
              <p><strong>Quantity:</strong> <span className="parsed-val">{parsedResult.quantity !== null ? parsedResult.quantity : 'N/A'}</span></p>
              <p className="parse-source">Parsed via: <strong>{parseSource}</strong></p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default App;
