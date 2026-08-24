import React, { useState, useEffect } from "react";
import "./App.css";
import { parseCommand } from "./commandParser";

function App() {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState("");
  const [isSupported, setIsSupported] = useState(true);
  const [parsedResult, setParsedResult] = useState(null);
  const [language, setLanguage] = useState("en-US");
  const [isParsing, setIsParsing] = useState(false);
  const [parseSource, setParseSource] = useState("");

  const [searchResults, setSearchResults] = useState([]);
  const [substituteSuggestion, setSubstituteSuggestion] = useState(null);
  
  const currentMonth = new Date().getMonth();
  const seasonalRecommendations = {
    0: ['Hot Chocolate', 'Oatmeal', 'Soup'],
    1: ['Chocolates', 'Strawberries', 'Wine'],
    2: ['Corned Beef', 'Cabbage', 'Potatoes'],
    3: ['Eggs', 'Ham', 'Carrots'],
    4: ['Avocado', 'Tomatoes', 'Tortilla Chips'],
    5: ['Watermelon', 'Ice Cream', 'Hot Dogs'],
    6: ['Burgers', 'Lemonade', 'Berries'],
    7: ['Peaches', 'Corn', 'Iced Tea'],
    8: ['Apples', 'Pumpkin', 'Cinnamon'],
    9: ['Candy', 'Pumpkin Spice', 'Caramel'],
    10: ['Turkey', 'Cranberries', 'Sweet Potatoes'],
    11: ['Gingerbread', 'Eggnog', 'Peppermint']
  };
  const currentSeasonals = seasonalRecommendations[currentMonth] || [];

  const substituteDictionary = {
    'milk': 'Almond Milk',
    'sugar': 'Stevia',
    'white bread': 'Whole Wheat Bread',
    'butter': 'Margarine',
    'soda': 'Sparkling Water',
    'potato chips': 'Veggie Chips'
  };


  const [shoppingList, setShoppingList] = useState(() => {
    try {
      const saved = localStorage.getItem("shoppingList");
      if (saved) return JSON.parse(saved);
    } catch (err) {
      console.warn("Failed to parse shopping list", err);
    }
    return [];
  });

  const [feedbackMessage, setFeedbackMessage] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem("shoppingList", JSON.stringify(shoppingList));
    } catch (err) {}
  }, [shoppingList]);

  const [purchaseHistory, setPurchaseHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("purchaseHistory");
      if (saved) return JSON.parse(saved);
    } catch (err) {}
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem("purchaseHistory", JSON.stringify(purchaseHistory));
    } catch (err) {}
  }, [purchaseHistory]);

  const categorizeItem = (itemName) => {
    if (!itemName) return "Other";
    const lowerItem = itemName.toLowerCase();
    if (["milk", "cheese", "butter", "yogurt", "curd"].includes(lowerItem))
      return "Dairy";
    if (
      [
        "apple",
        "apples",
        "banana",
        "bananas",
        "orange",
        "oranges",
        "tomato",
        "tomatoes",
        "potato",
        "potatoes",
      ].includes(lowerItem)
    )
      return "Produce";
    if (["bread", "cake", "biscuit", "biscuits"].includes(lowerItem))
      return "Bakery";
    if (["water", "juice", "coffee", "tea"].includes(lowerItem))
      return "Beverages";
    if (["chips", "chocolate", "cookies"].includes(lowerItem)) return "Snacks";
    return "Other";
  };

  const capitalize = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const getCategoryEmoji = (category) => {
    const map = {
      Dairy: "🥛",
      Produce: "🍎",
      Bakery: "🍞",
      Beverages: "🧃",
      Snacks: "🍪",
      Other: "🛍️",
    };
    return map[category] || "🛍️";
  };

  const processShoppingCommand = (command) => {
    setFeedbackMessage("");

    if (command.action === "unknown") {
      setFeedbackMessage("I couldn't understand that shopping command.");
      return;
    }

    if (command.action === "add") {
      if (!command.item) return;
      let qty = command.quantity !== null ? command.quantity : 1;
      if (qty <= 0) return;

      setPurchaseHistory((prev) => {
        const lowerName = command.item.toLowerCase();
        return { ...prev, [lowerName]: (prev[lowerName] || 0) + 1 };
      });


      setShoppingList((prevList) => {
        const lowerItemName = command.item.toLowerCase();
        
        // Check for substitute
        const sub = Object.keys(substituteDictionary).find(k => lowerItemName.includes(k));
        if (sub) {
          setSubstituteSuggestion({ original: command.item, substitute: substituteDictionary[sub] });
        } else {
          setSubstituteSuggestion(null);
        }

        const existingIndex = prevList.findIndex(

          (i) => i.item.toLowerCase() === command.item.toLowerCase(),
        );

        if (existingIndex >= 0) {
          const newList = [...prevList];
          newList[existingIndex] = {
            ...newList[existingIndex],
            quantity: newList[existingIndex].quantity + qty,
          };
          return newList;
        } else {
          return [
            ...prevList,
            {
              id: Date.now() + Math.random().toString(),
              item: capitalize(command.item),
              quantity: qty,
              category: categorizeItem(command.item),
            },
          ];
        }
      });
    } else if (command.action === "remove") {
      if (!command.item) return;
      setShoppingList((prevList) => {
        const lowerMatch = command.item.toLowerCase();
        const exists = prevList.some(
          (i) => i.item.toLowerCase() === lowerMatch,
        );
        if (!exists) {
          setFeedbackMessage(
            'Could not find "' + command.item + '" in your shopping list.',
          );
          return prevList;
        }
        return prevList.filter((i) => i.item.toLowerCase() !== lowerMatch);
      });
    }
  };

  const manualRemove = (id) => {
    setShoppingList((prev) => prev.filter((item) => item.id !== id));
  };

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      setError(
        "Voice recognition isn't supported in this browser. Please use Google Chrome.",
      );
    }
  }, []);

  const handleStartListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        "Voice recognition isn't supported in this browser. Please use Google Chrome.",
      );
      return;
    }

    setError("");
    setFeedbackMessage("");

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language;

      recognition.onstart = () => setIsListening(true);

      recognition.onresult = async (event) => {
        const currentTranscript = event.results[0][0].transcript;
        setTranscript(currentTranscript);
        setIsParsing(true);
        setParsedResult(null);
        setParseSource("");

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const res = await fetch("/api/parse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: currentTranscript }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          if (!res.ok) throw new Error("API returned " + res.status);

          const data = await res.json();
          const validActions = ["add", "remove", "unknown"];
          if (
            data &&
            typeof data === "object" &&
            validActions.includes(data.action) &&
            (data.item === null || typeof data.item === "string") &&
            (data.quantity === null || typeof data.quantity === "number")
          ) {
            setParsedResult(data);
            setParseSource("Gemini");
            processShoppingCommand(data);
          } else {
            throw new Error("Invalid response shape from API");
          }
        } catch (err) {
          console.warn(
            "Gemini NLP failed, falling back to rule-based parser:",
            err,
          );
          const fallbackData = parseCommand(currentTranscript);
          setParsedResult(fallbackData);
          setParseSource("Rule-based (fallback)");
          processShoppingCommand(fallbackData);
        } finally {
          setIsParsing(false);
        }
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        if (
          event.error === "not-allowed" ||
          event.error === "service-not-allowed"
        ) {
          setError(
            "Microphone access was denied. Please allow microphone permissions in your browser.",
          );
        } else if (event.error === "no-speech") {
          setError("No speech was detected. Please try speaking again.");
        } else if (event.error === "audio-capture") {
          setError(
            "No microphone found. Please ensure a microphone is connected.",
          );
        } else if (event.error === "network") {
          setError(
            "Network error occurred during speech recognition. Please check your connection.",
          );
        } else {
          setError("Speech recognition error: " + event.error);
        }
      };

      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch (err) {
      setIsListening(false);
      setError("Unable to start speech recognition. Please try again.");
    }
  };

  const currentItemNames = shoppingList.map((item) => item.item.toLowerCase());
  const suggestions = Object.entries(purchaseHistory)
    .filter(([name]) => !currentItemNames.includes(name))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  return (
    <div className="app-wrapper">
      <header className="app-header">
        <div className="header-content">
          <h1 className="brand-title">
            <span className="brand-icon">🛒</span> VoiceCart
          </h1>
          <p className="brand-subtitle">Voice Command Shopping Assistant</p>
          <p className="brand-description">
            Build your shopping list naturally with your voice.
          </p>
        </div>
        <div className="header-actions">
          <div className="language-selector">
            <label htmlFor="lang-select">Language</label>
            <select
              id="lang-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={isListening || isParsing}
            >
              <option value="en-US">English ▾</option>
              <option value="hi-IN">Hindi ▾</option>
            </select>
          </div>
        </div>
      </header>

      <main className="app-main">
        {!isSupported && (
          <div className="alert alert-warning" role="alert">
            Voice recognition isn't supported in this browser. Please use Google
            Chrome.
          </div>
        )}

        {error && isSupported && (
          <div className="alert alert-danger" role="alert">
            ⚠ {error}
          </div>
        )}

        {feedbackMessage && (
          <div className="alert alert-warning" role="alert">
            ⚠ {feedbackMessage}
          </div>
        )}

        <section className="voice-command-section" aria-label="Voice Controls">
          <h2>Add to your list</h2>
          <p>Tell me what you need.</p>
          <div className="voice-action-center">
            <button
              type="button"
              className={
                isListening
                  ? "btn-mic listening"
                  : isParsing
                    ? "btn-mic parsing"
                    : "btn-mic"
              }
              onClick={handleStartListening}
              disabled={isListening || isParsing || !isSupported}
              aria-label={
                isListening ? "Listening in progress" : "Start Listening"
              }
            >
              {isListening ? (
                <>
                  <span className="pulse-ring"></span>🔴 Listening...
                </>
              ) : isParsing ? (
                <>
                  <span className="spinner"></span>✨ Understanding...
                </>
              ) : (
                <>🎙 Start Listening</>
              )}
            </button>
          </div>
        </section>

        {transcript && (
          <section className="transcript-preview" aria-live="polite">
            <h3>You said</h3>
            <blockquote className="transcript-text">"{transcript}"</blockquote>
          </section>
        )}

        {parsedResult && !isParsing && (
          <section
            className="parsed-preview"
            aria-live="polite"
            aria-label="Parsed Command"
          >
            <h3>
              Understood <span className="source-badge">{parseSource}</span>
            </h3>
            <div className="parsed-data-row">
              <div className="parsed-item">
                <span className="parsed-label">Action</span>
                <span className="parsed-value action-val">
                  {parsedResult.action.toUpperCase()}
                </span>
              </div>
              <div className="parsed-item">
                <span className="parsed-label">Item</span>
                <span className="parsed-value">
                  {parsedResult.item ? capitalize(parsedResult.item) : "N/A"}
                </span>
              </div>
              <div className="parsed-item">
                <span className="parsed-label">Quantity</span>
                <span className="parsed-value">
                  {parsedResult.quantity !== null
                    ? parsedResult.quantity
                    : "N/A"}
                </span>
              </div>
            </div>
          </section>
        )}


        {searchResults.length > 0 && (
          <section className="search-results-section" aria-label="Search Results">
            <h3>🔍 Search Results</h3>
            <ul className="search-list">
              {searchResults.map(prod => (
                <li key={prod.id} className="search-item-row">
                  <div>
                    <strong>{prod.name}</strong> <span className="brand-badge">{prod.brand}</span>
                    <div className="search-meta">{prod.size} - ${prod.price}</div>
                  </div>
                  <button 
                    className="btn-add-search"
                    onClick={() => {
                      processShoppingCommand({ action: 'add', item: prod.name, quantity: 1 });
                      setSearchResults([]);
                    }}
                  >
                    + Add
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="lists-layout">
          <section className="shopping-list-section" aria-label="Shopping List">
            <header className="list-header">
              <h2>Your Shopping List</h2>
              {shoppingList.length > 0 && (
                <span className="item-count">
                  {shoppingList.length}{" "}
                  {shoppingList.length === 1 ? "item" : "items"}
                </span>
              )}
            </header>


            {substituteSuggestion && (
              <div className="substitute-alert">
                <span>💡 Added <strong>{substituteSuggestion.original}</strong>. Try <strong>{substituteSuggestion.substitute}</strong> next time for a healthier choice!</span>
                <button className="btn-dismiss" onClick={() => setSubstituteSuggestion(null)}>✖</button>
              </div>
            )}

            {shoppingList.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">🛒</span>
                <h3>Your list is empty</h3>
                <p>Start by saying something like "Add five apples"</p>
              </div>
            ) : (
              <ul className="shopping-list">
                {shoppingList.map((item) => (
                  <li key={item.id} className="list-row">
                    <div className="row-icon">
                      {getCategoryEmoji(item.category)}
                    </div>
                    <div className="row-details">
                      <span className="row-name">{item.item}</span>
                      <span className="row-meta">
                        {item.quantity} · {item.category}
                      </span>
                    </div>
                    <button
                      className="btn-remove-row"
                      onClick={() => manualRemove(item.id)}
                      aria-label={"Remove " + item.item + " from list"}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>


          {currentSeasonals.length > 0 && (
            <aside className="suggestions-aside seasonal-aside" aria-label="Seasonal Recommendations">
              <h3>🌞 Seasonal Picks</h3>
              <p>Perfect for this month:</p>
              <div className="suggestion-chips">
                {currentSeasonals.map((itemName) => (
                  <button
                    key={itemName}
                    className="chip chip-seasonal"
                    onClick={() => processShoppingCommand({ action: 'add', item: itemName, quantity: 1 })}
                    aria-label={"Add " + itemName + " to list"}
                  >
                    {capitalize(itemName)} <span className="chip-plus">+</span>
                  </button>
                ))}
              </div>
            </aside>
          )}

          {suggestions.length > 0 && (
            <aside className="suggestions-aside" aria-label="Smart Suggestions">
              <h3>✨ Suggestions for you</h3>
              <p>Based on your previous shopping:</p>
              <div className="suggestion-chips">
                {suggestions.map((itemName) => (
                  <button
                    key={itemName}
                    className="chip"
                    onClick={() =>
                      processShoppingCommand({
                        action: "add",
                        item: itemName,
                        quantity: 1,
                      })
                    }
                    aria-label={"Add " + itemName + " to list"}
                  >
                    {capitalize(itemName)} <span className="chip-plus">+</span>
                  </button>
                ))}
              </div>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
