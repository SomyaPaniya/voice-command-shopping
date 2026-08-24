import React, { useState, useEffect } from 'react';
import './App.css';
import { parseCommand } from './commandParser';

function App() {
  // Phase 1-3 States
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [parsedResult, setParsedResult] = useState(null);
  const [language, setLanguage] = useState('en-US');
  const [isParsing, setIsParsing] = useState(false);
  const [parseSource, setParseSource] = useState('');
  
  // Phase 4 & 5 States
  const [shoppingList, setShoppingList] = useState(() => {
    // Phase 5: Load initial state from localStorage safely
    try {
      const saved = localStorage.getItem('shoppingList');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.warn('Failed to parse shopping list from localStorage. Starting with empty list.', err);
    }
    return [];
  });
  
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Phase 5: Save to localStorage whenever shoppingList changes
  useEffect(() => {
    try {
      localStorage.setItem('shoppingList', JSON.stringify(shoppingList));
    } catch (err) {
      console.error('Failed to save shopping list to localStorage', err);
    }
  }, [shoppingList]);

  // Phase 4: Helper to categorize item
  const categorizeItem = (itemName) => {
    if (!itemName) return 'Other';
    const lowerItem = itemName.toLowerCase();
    if (['milk', 'cheese', 'butter', 'yogurt', 'curd'].includes(lowerItem)) return 'Dairy';
    if (['apple', 'apples', 'banana', 'bananas', 'orange', 'oranges', 'tomato', 'tomatoes', 'potato', 'potatoes'].includes(lowerItem)) return 'Produce';
    if (['bread', 'cake', 'biscuit', 'biscuits'].includes(lowerItem)) return 'Bakery';
    if (['water', 'juice', 'coffee', 'tea'].includes(lowerItem)) return 'Beverages';
    if (['chips', 'chocolate', 'cookies'].includes(lowerItem)) return 'Snacks';
    return 'Other';
  };

  // Phase 4: Helper to capitalize item names
  const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Phase 4: Process parsed command into shopping list
  const processShoppingCommand = (command) => {
    setFeedbackMessage('');
    
    if (command.action === 'unknown') {
      setFeedbackMessage("I couldn't understand that shopping command.");
      return;
    }

    if (command.action === 'add') {
      if (!command.item) return;
      let qty = command.quantity !== null ? command.quantity : 1;
      if (qty <= 0) return; // Prevent zero/negative quantities
      
      setShoppingList((prevList) => {
        const existingIndex = prevList.findIndex(
          (i) => i.item.toLowerCase() === command.item.toLowerCase()
        );
        
        if (existingIndex >= 0) {
          // Increase quantity of existing item
          const newList = [...prevList];
          newList[existingIndex] = {
            ...newList[existingIndex],
            quantity: newList[existingIndex].quantity + qty
          };
          return newList;
        } else {
          // Add new item
          return [
            ...prevList,
            {
              id: Date.now() + Math.random().toString(), // unique identifier
              item: capitalize(command.item),
              quantity: qty,
              category: categorizeItem(command.item)
            }
          ];
        }
      });
    } else if (command.action === 'remove') {
      if (!command.item) return;
      
      setShoppingList((prevList) => {
        const existingIndex = prevList.findIndex(
          (i) => i.item.toLowerCase() === command.item.toLowerCase()
        );
        
        if (existingIndex >= 0) {
          // Remove existing item
          const newList = [...prevList];
          newList.splice(existingIndex, 1);
          return newList;
        } else {
          // Item not found
          setFeedbackMessage(`${capitalize(command.item)} is not in your shopping list.`);
          return prevList;
        }
      });
    }
  };

  // Phase 4: Manual remove handler
  const manualRemove = (id) => {
    setShoppingList((prev) => prev.filter(item => item.id !== id));
  };

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

    if (!SpeechRecognition) {
      setError("Voice recognition isn't supported in this browser. Please use Google Chrome.");
      return;
    }

    setError('');
    setFeedbackMessage('');

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = async (event) => {
        const currentTranscript = event.results[0][0].transcript;
        setTranscript(currentTranscript);
        
        setIsParsing(true);
        setParsedResult(null);
        setParseSource('');

        try {
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
            processShoppingCommand(data);
          } else {
            throw new Error('Invalid response shape from API');
          }

        } catch (err) {
          console.warn('Gemini NLP failed, falling back to rule-based parser:', err);
          const fallbackData = parseCommand(currentTranscript);
          setParsedResult(fallbackData);
          setParseSource('Rule-based (fallback)');
          processShoppingCommand(fallbackData);
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
          <p className="subtitle">Phase 5: LocalStorage Persistence</p>
        </header>

        {!isSupported && (
          <div className="alert alert-warning" role="alert">
            Voice recognition isn't supported in this browser. Please use Google Chrome.
          </div>
        )}

        {error && isSupported && (
          <div className="alert alert-danger" role="alert">
            ⚠️ {error}
          </div>
        )}
        
        {/* Phase 4 Feedback Message */}
        {feedbackMessage && (
          <div className="alert alert-warning" role="alert">
            ℹ️ {feedbackMessage}
          </div>
        )}

        {isListening && (
          <div className="listening-indicator" aria-live="polite">
            <span className="pulse-dot"></span>
            🎙️ Listening...
          </div>
        )}

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

        {isParsing && (
          <div className="parsing-indicator">
            Parsing command...
          </div>
        )}

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
        
        {/* Phase 4: Shopping List UI */}
        <section className="shopping-list-section">
          <h2 className="section-title">Shopping List</h2>
          {shoppingList.length === 0 ? (
            <p className="empty-state">Your shopping list is empty.</p>
          ) : (
            <ul className="shopping-list">
              {shoppingList.map((item) => (
                <li key={item.id} className="shopping-list-item">
                  <div className="item-details">
                    <span className="item-name">{item.item}</span>
                    <span className="item-meta">Quantity: {item.quantity} | Category: {item.category}</span>
                  </div>
                  <button className="btn-remove" onClick={() => manualRemove(item.id)}>Remove</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
