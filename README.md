# 🛒 VoiceCart: Voice Command Shopping Assistant

VoiceCart is a smart, voice-activated shopping list application designed to feel like a calm, tactile "kitchen counter" tool. It allows users to quickly add items, specify quantities, search a product catalog, and get smart suggestions simply by speaking. 

Under the hood, it uses a highly resilient hybrid NLP architecture, relying on Google's Gemini AI for deep natural language understanding, backed by a lightning-fast rule-based regex fallback parser.

## ✨ Key Features

* **🎙️ Voice Recognition**: Hands-free item entry using the native Web Speech API.
* **🧠 Hybrid NLP Engine**: 
  * Primary: Google Gemini API for understanding complex commands, implicit quantities, and categorizing items.
  * Fallback: Local rule-based regex parser ensures the app remains snappy and functional even if the AI endpoint hangs or fails (includes an 8-second circuit breaker).
* **🌍 Multilingual Support**: Seamlessly supports English and Hindi (`hi-IN`) voice input.
* **💡 Smart Suggestions**: Deterministic, on-device purchase history tracking to suggest frequently bought items not currently on your list.
* **🍂 Seasonal & Substitute Recommendations**: Context-aware UI sections suggesting alternatives and month-appropriate items.
* **📱 Tactile UI/UX**: A warm, accessible design using a parchment/ink palette (`#FAF7F2` & `#221F1A`), elegant typography (Fraunces & Work Sans), Lucide icons, and a signature "breathing" mic button.
* **💾 Local Persistence**: Entirely client-side state management using `localStorage` for privacy and instant loads.
* **☁️ Serverless Architecture**: Secure API routes deployed as Vercel Serverless Functions to protect API keys.

## 🛠️ Tech Stack

* **Frontend**: React.js, standard CSS3 (Mobile-first, responsive)
* **Icons & Typography**: `lucide-react`, Google Fonts (Fraunces, Work Sans)
* **Backend / API**: Node.js Serverless Functions (Vercel)
* **AI Model**: Google Gemini (`gemini-1.5-flash`)
* **Testing**: Jest & React Testing Library

## 🚀 Local Development Setup

### Prerequisites
* Node.js (v16+)
* A Google Gemini API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/SomyaPaniya/voice-command-shopping.git
   cd voice-command-shopping
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```
   *(Note: The API key is securely consumed by the backend serverless function and is never exposed to the client bundle.)*

4. **Start the development server:**
   ```bash
   npm start
   ```
   The application will be available at `http://localhost:3000`.

## ☁️ Deployment (Vercel)

This project is configured for seamless deployment on Vercel. 

1. Push your code to a GitHub repository.
2. Import the project into your Vercel dashboard.
3. In the Vercel project settings, add your `GEMINI_API_KEY` under **Environment Variables**.
4. Deploy! Vercel will automatically host the React frontend and deploy `api/parse.js` as a secure Serverless Function.

## 🧪 Testing

The project maintains a strict test suite verifying UI components, smart suggestion logic, and the robustness of the fallback command parser.

To run the test suite:
```bash
npm test
```

To run a production build locally:
```bash
npm run build
```

## 🏗️ Project Structure

```text
├── api/
│   └── parse.js             # Vercel Serverless Function handling Gemini calls
├── src/
│   ├── App.js               # Main React application & UI layout
│   ├── App.css              # Tactile "kitchen counter" styling & animations
│   ├── App.test.js          # RTL component tests
│   ├── commandParser.js     # Rule-based regex fallback engine
│   ├── commandParser.test.js# Unit tests for fallback logic
│   └── productCatalog.js    # Mock backend data for search and seasonals
├── .env.local               # Local secrets (ignored in git)
└── package.json             # Project dependencies and scripts
```

## 🗺️ Roadmap (Completed)

- [x] Phase 1: Voice Input Integration
- [x] Phase 2: Rule-based Parser Development
- [x] Phase 3: Gemini NLP + Resilience Fallback Integration
- [x] Phase 4: Shopping List State Management
- [x] Phase 5: LocalStorage Persistence
- [x] Phase 6: Smart Suggestions Engine
- [x] Phase 7: UI/UX Polish (Tactile Redesign)
- [x] Phase 8: Vercel Deployment
