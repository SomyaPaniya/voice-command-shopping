import React, { useState, useEffect } from 'react';
import './App.css';
import { parseCommand } from './commandParser';

function App() {
  // State variables strictly conforming to Phase 1 & 2 requirements
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  
  // Phase 2: State to hold the rule-based parsed result
  const [parsedResult, setParsedResult] = useState(null);

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

      // Phase 1 Requirements:
      // continuous: false -> process one phrase per click
      // interimResults: false -> deliver final recognized speech only after speaking ends
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        // Extract the final recognized speech transcript
        const currentTranscript = event.results[0][0].transcript;
        setTranscript(currentTranscript);
        
        // Phase 2: Run the rule-based parser on the raw transcript
        setParsedResult(parseCommand(currentTranscript));
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
          <p className="subtitle">Phase 1 & 2: Voice Input & Parsing</p>
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

        {/* Voice Recognition Trigger Button */}
        <div className="controls">
          <button
            type="button"
            className={`btn-listen ${isListening ? 'listening' : ''}`}
            onClick={handleStartListening}
            disabled={isListening || !isSupported}
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

        {/* Phase 2: Parsed Result Display */}
        {parsedResult && (
          <section className="parsed-section">
            <h2 className="section-title">Parsed Command</h2>
            <div className="parsed-container">
              <p><strong>Action:</strong> <span className="parsed-val">{parsedResult.action}</span></p>
              <p><strong>Item:</strong> <span className="parsed-val">{parsedResult.item || 'N/A'}</span></p>
              <p><strong>Quantity:</strong> <span className="parsed-val">{parsedResult.quantity !== null ? parsedResult.quantity : 'N/A'}</span></p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default App;
