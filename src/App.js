import React, { useState, useEffect } from "react";
import "./App.css";
import { parseCommand } from "./commandParser";

function App() {
  // Phase 1-3 States
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState("");
  const [isSupported, setIsSupported] = useState(true);
  const [parsedResult, setParsedResult] = useState(null);
  const [language, setLanguage] = useState("en-US");
  const [isParsing, setIsParsing] = useState(false);
  const [parseSource, setParseSource] = useState("");

  // Phase 4 & 5 States
  const [shoppingList, setShoppingList] = useState(() => {
    // Phase 5: Load initial state from localStorage safely
    try {
      const saved = localStorage.getItem("shoppingList");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.warn(
        "Failed to parse shopping list from localStorage. Starting with empty list.",
        err,
      );
    }
    return [];
  });

  const [feedbackMessage, setFeedbackMessage] = useState("");

  // Phase 5: Save to localStorage whenever shoppingList changes
  useEffect(() => {
    try {
      localStorage.setItem("shoppingList", JSON.stringify(shoppingList));
    } catch (err) {
      console.error("Failed to save shopping list to localStorage", err);
    }
  }, [shoppingList]);

  // Phase 6: Smart Suggestions state
  const [purchaseHistory, setPurchaseHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("purchaseHistory");
      if (saved) return JSON.parse(saved);
    } catch (err) {
      console.warn("Failed to parse purchase history", err);
    }
    return {};
  });

  // Phase 6: Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("purchaseHistory", JSON.stringify(purchaseHistory));
    } catch (err) {
      console.error("Failed to save purchase history", err);
    }
  }, [purchaseHistory]);

  // Phase 4: Helper to categorize item
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

  // Phase 4: Helper to capitalize item names
  const capitalize = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Phase 4: Process parsed command into shopping list
  const processShoppingCommand = (command) => {
    setFeedbackMessage("");

    if (command.action === "unknown") {
      setFeedbackMessage("I couldn't understand that shopping command.");
      return;
    }

    if (command.action === "add") {
      if (!command.item) return;
      let qty = command.quantity !== null ? command.quantity : 1;
      if (qty <= 0) return; // Prevent zero/negative quantities

      // Phase 6: Record history
      setPurchaseHistory((prev) => {
        const lowerName = command.item.toLowerCase();
        return { ...prev, [lowerName]: (prev[lowerName] || 0) + 1 };
      });

      setShoppingList((prevList) => {
        const existingIndex = prevList.findIndex(
          (i) => i.item.toLowerCase() === command.item.toLowerCase(),
        );

        if (existingIndex >= 0) {
          // Increase quantity of existing item
          const newList = [...prevList];
          newList[existingIndex] = {
            ...newList[existingIndex],
            quantity: newList[existingIndex].quantity + qty,
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
              category: categorizeItem(command.item),
            },
          ];
        }
      });
    } else if (command.action === "remove") {
      if (!command.item) return;

      setShoppingList((prevList) => {
        const existingIndex = prevList.findIndex(
          (i) => i.item.toLowerCase() === command.item.toLowerCase(),
        );

        if (existingIndex >= 0) {
          // Remove existing item
          const newList = [...prevList];
          newList.splice(existingIndex, 1);
          return newList;
        } else {
          // Item not found
          setFeedbackMessage(
            `${capitalize(command.item)} is not in your shopping list.`,
          );
          return prevList;
        }
      });
    }
  };

  // Phase 4: Manual remove handler
  const manualRemove = (id) => {
    setShoppingList((prev) => prev.filter((item) => item.id !== id));
  };

  // Check browser support on component mount
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

      recognition.onstart = () => {
        setIsListening(true);
      };

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
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ text: currentTranscript }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!res.ok) {
            throw new Error(`API returned ${res.status}`);
          }

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
          setError(`Speech recognition error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      setIsListening(false);
      setError("Unable to start speech recognition. Please try again.");
    }
  };

  // Phase 6: Compute smart suggestions
  const currentItemNames = shoppingList.map((item) => item.item.toLowerCase());
  const suggestions = Object.entries(purchaseHistory)
    .filter(([name]) => !currentItemNames.includes(name))
    .sort((a, b) => b[1] - a[1]) // sort by frequency descending
    .slice(0, 5)
    .map(([name]) => name);

  return (
    <main className="app-main">
      <article className="card">
        <header className="card-header">
          <h1 className="title">🛒 Voice Command Shopping Assistant</h1>
          <p className="subtitle">Phase 5: LocalStorage Persistence</p>
        </header>
        <p className="app-description">
          The easiest way to build your shopping list with voice commands.
        </p>

        {!isSupported && (
          <div className="alert alert-warning" role="alert">
            Voice recognition isn't supported in this browser. Please use Google
            Chrome.
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

        <section className="voice-controls-section" aria-label="Voice Controls">
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
              className={`btn-listen ${isListening ? "listening" : ""} ${isParsing ? "parsing" : ""}`}
              onClick={handleStartListening}
              disabled={isListening || isParsing || !isSupported}
              aria-label={
                isListening ? "Listening in progress" : "Start Listening"
              }
            >
              {isListening ? "🎙️ Listening..." : "🎙️ Start Listening"}
            </button>
          </div>

          {isListening && (
            <div className="listening-indicator" aria-live="polite">
              <span className="pulse-dot"></span>
              Recording your voice...
            </div>
          )}
        </section>

        <section className="transcript-section">
          <h2 className="section-title">Recognized Transcript</h2>
          <div className="transcript-container">
            {transcript ? (
              <p className="transcript-text">{transcript}</p>
            ) : (
              <p className="transcript-placeholder">
                Your recognized speech will appear here after you click
                &quot;Start Listening&quot; and finish speaking.
              </p>
            )}
          </div>
        </section>

        {isParsing && (
          <div className="parsing-indicator" aria-live="polite">
            <span className="spinner"></span> Parsing command...
          </div>
        )}

        {parsedResult && !isParsing && (
          <section
            className="parsed-section"
            aria-live="polite"
            aria-label="Parsed Command"
          >
            <h2 className="section-title">Parsed Command</h2>
            <div className="parsed-summary">
              <div className="parsed-pill">
                <strong>Action:</strong>{" "}
                <span className="parsed-val">{parsedResult.action}</span>
              </div>
              <div className="parsed-pill">
                <strong>Item:</strong>{" "}
                <span className="parsed-val">{parsedResult.item || "N/A"}</span>
              </div>
              <div className="parsed-pill">
                <strong>Quantity:</strong>{" "}
                <span className="parsed-val">
                  {parsedResult.quantity !== null
                    ? parsedResult.quantity
                    : "N/A"}
                </span>
              </div>
            </div>
            <p className="parse-source">
              Parsed via: <strong>{parseSource}</strong>
            </p>
          </section>
        )}

        {/* Phase 4: Shopping List UI */}
        <section className="shopping-list-section" aria-label="Shopping List">
          <h2 className="section-title">Shopping List</h2>
          {shoppingList.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🛒</span>
              <p>Your shopping list is empty.</p>
            </div>
          ) : (
            <ul className="shopping-list">
              {shoppingList.map((item) => (
                <li key={item.id} className="shopping-list-item">
                  <div className="item-details">
                    <span className="item-name">{item.item}</span>
                    <span className="item-meta">
                      Quantity: {item.quantity} | Category: {item.category}
                    </span>
                  </div>
                  <button
                    className="btn-remove"
                    onClick={() => manualRemove(item.id)}
                    aria-label={`Remove ${item.item} from list`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Phase 6: Smart Suggestions UI */}
        {suggestions.length > 0 && (
          <section
            className="suggestions-section"
            aria-label="Smart Suggestions"
          >
            <h2 className="section-title">💡 Smart Suggestions</h2>
            <div className="suggestions-list">
              {suggestions.map((itemName) => (
                <div key={itemName} className="suggestion-chip">
                  <span className="suggestion-name">
                    {capitalize(itemName)}
                  </span>
                  <button
                    className="btn-add-suggestion"
                    onClick={() =>
                      processShoppingCommand({
                        action: "add",
                        item: itemName,
                        quantity: 1,
                      })
                    }
                    aria-label={`Add ${itemName} to list`}
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </article>
    </main>
  );
}

export default App;
