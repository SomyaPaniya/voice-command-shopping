# 🛒 VoiceCart — Voice Command Shopping Assistant

VoiceCart is a smart, voice-activated shopping list app designed to feel like a calm, tactile "kitchen counter" tool. Add items, specify quantities, search a product catalog, and get smart suggestions — all just by speaking.

Under the hood, it uses a resilient hybrid NLP architecture: Google's Gemini AI handles deep natural language understanding, backed by a fast local rule-based parser that kicks in automatically if the AI call fails or times out.

**Live app:** https://voice-command-shopping-gilt.vercel.app
**Repo:** https://github.com/SomyaPaniya/voice-command-shopping

---

## ✨ Key Features

- 🎙️ **Voice Recognition** — hands-free item entry using the browser's native Web Speech API
- 🧠 **Hybrid NLP Engine**
  - *Primary:* Google Gemini API for understanding varied phrasing, implicit quantities, and search intent
  - *Fallback:* local rule-based regex parser keeps the app functional even if the AI endpoint hangs or fails (8-second timeout circuit breaker)
- 🌍 **Multilingual Support** — English and Hindi (`hi-IN`) voice input, normalized to the same structured format
- 🔍 **Voice-Activated Search** — "find organic apples", "find toothpaste under $5" (brand and price-range aware, against a mock product catalog)
- 💡 **Smart Suggestions** — on-device purchase history tracking, surfaces frequently bought items not currently on the list
- 🍂 **Seasonal & Substitute Recommendations** — month-based suggestions and dismissible alternative-item prompts
- 📱 **Tactile UI/UX** — warm parchment/ink palette (`#FAF7F2` / `#221F1A`), Fraunces + Work Sans typography, Lucide icons, a signature "breathing" mic button
- 💾 **Local Persistence** — shopping list and history survive a refresh via `localStorage`, entirely client-side
- ☁️ **Serverless Architecture** — API key protected via a Vercel Serverless Function, never exposed to the browser
- ⚠️ **Error handling & loading states** — clear feedback for denied mic permissions, no speech detected, unsupported browsers, and AI timeouts

## 🛠️ Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React.js (Create React App), CSS3, mobile-first responsive |
| Voice recognition | Browser-native Web Speech API (`webkitSpeechRecognition`) |
| NLP | Google Gemini API (`gemini-3.5-flash`), called via a serverless function |
| Fallback parser | Custom rule-based regex parser (client-side) |
| Backend | Vercel Serverless Function (`/api/parse.js`) — exists solely to keep the Gemini API key off the client |
| Persistence | Browser `localStorage` |
| Icons & Typography | lucide-react, Google Fonts (Fraunces, Work Sans) |
| Testing | Jest & React Testing Library |
| Hosting | Vercel |

No traditional backend or database — deliberately, to keep the app fast, cheap to run, and simple to reason about.

## 🏗️ Architecture

```
Voice input (browser)
      ↓
Web Speech API → raw transcript
      ↓
Gemini API (via serverless function) ──fails/times out──→ Rule-based parser (fallback)
      ↓                                                          ↓
            structured command: { action, item, quantity, brand, maxPrice }
                              ↓
                    React state (shopping list)
                              ↓
                        localStorage
```

**Why the two-parser design:** Gemini handles the actual NLP requirement — varied phrasing and multilingual input — well, but any cloud API call can fail or hang. Every request to Gemini has an 8-second timeout; if it fails, times out, or returns malformed data, the app silently falls back to the local rule-based parser instead of showing an error. The user experience stays uninterrupted either way.

**Why a serverless function instead of calling Gemini from the browser:** an API key placed directly in frontend code is visible in the compiled JavaScript bundle to anyone who opens dev tools. `/api/parse.js` runs server-side on Vercel, keeps the key in an environment variable, and is the only thing that talks to Gemini.

## 📁 Project Structure

```
├── api/
│   └── parse.js              # Vercel Serverless Function handling Gemini calls
├── src/
│   ├── App.js                 # Main React application & UI layout
│   ├── App.css                # Tactile "kitchen counter" styling & animations
│   ├── App.test.js            # Component tests
│   ├── commandParser.js       # Rule-based regex fallback engine
│   ├── commandParser.test.js  # Unit tests for fallback logic
│   └── productCatalog.js      # Mock product data for search & seasonal features
├── .env.local                 # Local secrets (gitignored, never committed)
└── package.json
```

## 🗣️ Supported Voice Commands (examples)

```
"add milk"
"I need apples"
"I want to buy bananas"
"add 2 bottles of water"
"remove milk"
"find organic apples"
"find toothpaste under $5"
```

## 🚀 Local Development Setup

**Prerequisites:** Node.js v16+, a Google Gemini API key.

```bash
git clone https://github.com/SomyaPaniya/voice-command-shopping.git
cd voice-command-shopping
npm install
```

Create a `.env.local` file in the project root:
```
GEMINI_API_KEY=your_api_key_here
```
(This key is consumed only by the backend serverless function and is never exposed to the client bundle.)

```bash
npm start
```
Open `http://localhost:3000` in **Google Chrome** — see Limitations below on browser support.

## ☁️ Deployment (Vercel)

1. Push code to a GitHub repository
2. Import the project into the Vercel dashboard
3. Add `GEMINI_API_KEY` under Project Settings → Environment Variables
4. Deploy — Vercel automatically hosts the React frontend and deploys `api/parse.js` as a serverless function, zero extra config needed

## 🧪 Testing

```bash
npm test        # run the test suite
npm run build   # verify the production build
```

## ⚠️ Known Limitations

Built under an 8-hour assessment time budget — some tradeoffs were made deliberately rather than left as unnoticed bugs:

- **Multi-item commands aren't split.** "Add milk and bananas" is currently stored as one item literally named "milk and bananas" rather than two separate list entries. A future version would extend the Gemini response schema to return an array of items.
- **Search matching is exact-substring, not fuzzy.** Searching "soda" won't surface "Sparkling Water" unless the words literally overlap — there's no semantic/fuzzy matching layer.
- **Seasonal recommendations and substitutes are hardcoded, not personalized.** They don't adapt to geography (e.g. Southern Hemisphere seasons) or individual behavior — a deliberate scope decision to avoid over-engineering a small demo feature.
- **Browser support is Chrome-first.** The Web Speech API isn't reliably supported in Firefox or Safari; the app detects this and shows a clear message rather than failing silently, but full functionality requires Chrome.
- **The product catalog is mock/demo data**, not a real product database, per the assessment's allowance to use public/sample test data.

## 🗺️ Roadmap

- [x] Phase 1: Voice input integration
- [x] Phase 2: Rule-based parser
- [x] Phase 3: Gemini NLP + resilience fallback
- [x] Phase 4: Shopping list state management
- [x] Phase 5: localStorage persistence
- [x] Phase 6: Smart suggestions engine
- [x] Phase 7: UI/UX tactile redesign
- [x] Phase 8: Vercel deployment
- [ ] Multi-item command parsing
- [ ] Fuzzy/semantic search
- [ ] Additional language support

---

Built by Somya Paniya as a technical assessment project.
