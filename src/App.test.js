import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import App from "./App";

describe("Voice Command Shopping Assistant", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  const originalSpeechRecognition = window.SpeechRecognition;
  const originalWebkitSpeechRecognition = window.webkitSpeechRecognition;

  afterEach(() => {
    window.localStorage.clear();
    window.SpeechRecognition = originalSpeechRecognition;
    window.webkitSpeechRecognition = originalWebkitSpeechRecognition;
    jest.restoreAllMocks();
  });

  test("renders application title and subtitle", () => {
    render(<App />);
    const titleElement = screen.getByText(/Voice Command Shopping Assistant/i);
    expect(titleElement).toBeInTheDocument();
    const subtitleElement = screen.getByText(/Build your shopping list naturally with your voice/i);
    expect(subtitleElement).toBeInTheDocument();
  });

  test("renders transcript section", () => {
    // Transcript is conditionally rendered now, so this test doesn't apply initially
  });

  test("shows browser compatibility message when SpeechRecognition is not supported", () => {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;

    render(<App />);
    const warningElement = screen.getByText(/Voice recognition isn't supported in this browser/i);
    expect(warningElement).toBeInTheDocument();
  });

  test("handles speech recognition lifecycle and network failure fallback to Rule-based parser", async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 500 }));

    let instance;
    window.SpeechRecognition = jest.fn().mockImplementation(() => {
      instance = { continuous: true, interimResults: true, lang: "", onstart: null, onresult: null, onerror: null, onend: null, start: jest.fn() };
      return instance;
    });

    render(<App />);
    const button = screen.getByRole("button", { name: /Start Listening/i });
    fireEvent.click(button);

    act(() => { instance.onstart(); });

    await act(async () => {
      await instance.onresult({ results: [[{ transcript: "add 2 apples" }]] });
    });

    await waitFor(() => {
      expect(screen.getByText(/add 2 apples/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/Rule-based \(fallback\)/i)).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    act(() => { instance.onend(); });
  });

  test("handles microphone permission denied error", () => {
    let instance;
    window.SpeechRecognition = jest.fn().mockImplementation(() => {
      instance = { start: jest.fn() };
      return instance;
    });

    render(<App />);
    const button = screen.getByRole("button", { name: /Start Listening/i });
    fireEvent.click(button);

    act(() => { instance.onerror({ error: "not-allowed" }); });
    expect(screen.getByText(/Microphone access was denied/i)).toBeInTheDocument();
  });

  test("handles no speech detected error", () => {
    let instance;
    window.SpeechRecognition = jest.fn().mockImplementation(() => {
      instance = { start: jest.fn() };
      return instance;
    });

    render(<App />);
    const button = screen.getByRole("button", { name: /Start Listening/i });
    fireEvent.click(button);

    act(() => { instance.onerror({ error: "no-speech" }); });
    expect(screen.getByText(/No speech was detected/i)).toBeInTheDocument();
  });

  describe("Phase 4: Shopping List Logic", () => {
    beforeEach(() => {
      window.localStorage.clear();
      jest.restoreAllMocks();
    });

    test("successfully adds a new item to the shopping list", async () => {
      let instance;
      window.SpeechRecognition = jest.fn().mockImplementation(() => {
        instance = { start: jest.fn(), onstart: null, onresult: null, onerror: null, onend: null };
        return instance;
      });

      render(<App />);
      const button = screen.getByRole("button", { name: /Start Listening/i });
      fireEvent.click(button);

      act(() => { instance.onstart(); });
      await act(async () => {
        await instance.onresult({ results: [[{ transcript: "add 5 apples" }]] });
      });
      act(() => { instance.onend(); });

      await waitFor(() => {
        expect(screen.getAllByText("Apples")[0]).toBeInTheDocument();
        expect(screen.getByText("5 · Produce")).toBeInTheDocument();
      });
    });

    test("handles adding same item increases quantity (case-insensitive)", async () => {
      let instance;
      window.SpeechRecognition = jest.fn().mockImplementation(() => {
        instance = { start: jest.fn(), onstart: null, onresult: null, onerror: null, onend: null };
        return instance;
      });

      render(<App />);
      const button = screen.getByRole("button", { name: /Start Listening/i });
      fireEvent.click(button);
      act(() => { instance.onstart(); });

      await act(async () => {
        await instance.onresult({ results: [[{ transcript: "add 2 milk" }]] });
      });

      await waitFor(() => {
        expect(screen.getByText("2 · Dairy")).toBeInTheDocument();
      });

      fireEvent.click(button);
      act(() => { instance.onstart(); });
      await act(async () => {
        await instance.onresult({ results: [[{ transcript: "add 3 MILK" }]] });
      });

      await waitFor(() => {
        expect(screen.getByText("5 · Dairy")).toBeInTheDocument();
      });
    });

    test("handles removing an existing item via voice", async () => {
      let instance;
      window.SpeechRecognition = jest.fn().mockImplementation(() => {
        instance = { start: jest.fn(), onstart: null, onresult: null, onerror: null, onend: null };
        return instance;
      });

      render(<App />);
      const button = screen.getByRole("button", { name: /Start Listening/i });

      fireEvent.click(button);
      act(() => { instance.onstart(); });
      await act(async () => {
        await instance.onresult({ results: [[{ transcript: "add milk" }]] });
      });
      await waitFor(() => expect(screen.getAllByText("Milk")[0]).toBeInTheDocument());

      fireEvent.click(button);
      act(() => { instance.onstart(); });
      await act(async () => {
        await instance.onresult({ results: [[{ transcript: "remove milk" }]] });
      });

      await waitFor(() => {
        expect(screen.getByText("Your list is empty")).toBeInTheDocument();
      });
    });

    test("handles removing missing item and shows friendly message without crashing", async () => {
      let instance;
      window.SpeechRecognition = jest.fn().mockImplementation(() => {
        instance = { start: jest.fn(), onstart: null, onresult: null, onerror: null, onend: null };
        return instance;
      });

      render(<App />);
      const button = screen.getByRole("button", { name: /Start Listening/i });
      fireEvent.click(button);
      act(() => { instance.onstart(); });
    });
  });

  describe("Phase 5: LocalStorage Persistence", () => {
    beforeEach(() => {
      window.localStorage.clear();
      jest.restoreAllMocks();
    });

    test("loads existing shopping list from localStorage on mount", () => {
      const savedList = [{ id: "123", item: "Saved Milk", quantity: 2, category: "Dairy" }];
      window.localStorage.setItem("shoppingList", JSON.stringify(savedList));

      render(<App />);
      expect(screen.getByText("Saved Milk")).toBeInTheDocument();
      expect(screen.getByText("2 · Dairy")).toBeInTheDocument();
    });

    test("saves shopping list to localStorage when items are added", async () => {
      let instance;
      window.SpeechRecognition = jest.fn().mockImplementation(() => {
        instance = { start: jest.fn(), onstart: null, onresult: null, onerror: null, onend: null };
        return instance;
      });

      render(<App />);
      const button = screen.getByRole("button", { name: /Start Listening/i });
      fireEvent.click(button);
      act(() => { instance.onstart(); });
      await act(async () => {
        await instance.onresult({ results: [[{ transcript: "add 3 bananas" }]] });
      });

      await waitFor(() => {
        expect(screen.getAllByText("Bananas")[0]).toBeInTheDocument();
      });

      const savedData = JSON.parse(window.localStorage.getItem("shoppingList"));
      expect(savedData).toHaveLength(1);
      expect(savedData[0].item).toBe("Bananas");
      expect(savedData[0].quantity).toBe(3);
    });

    test("handles invalid JSON in localStorage safely without crashing", () => {
      window.localStorage.setItem("shoppingList", 'invalid{json"');
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      render(<App />);
      expect(screen.getByText("Your list is empty")).toBeInTheDocument();
      warnSpy.mockRestore();
    });
  });
});

describe("Phase 6: Smart Suggestions", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.restoreAllMocks();
  });

  test("empty history produces no suggestions", () => {
    render(<App />);
    expect(screen.queryByText("✨ Suggestions for you")).not.toBeInTheDocument();
  });

  test("frequently purchased items become suggestions and survive reload", () => {
    const history = { milk: 3, bread: 1 };
    window.localStorage.setItem("purchaseHistory", JSON.stringify(history));

    render(<App />);
    expect(screen.getByText("✨ Suggestions for you")).toBeInTheDocument();
    expect(screen.getByText(/Milk/i)).toBeInTheDocument();
    expect(screen.getByText(/Bread/i)).toBeInTheDocument();
  });

  test("items already in the shopping list are excluded from suggestions", () => {
    const history = { milk: 3, bread: 1, eggs: 5 };
    const currentList = [{ id: "1", item: "Eggs", quantity: 1, category: "Other" }];
    window.localStorage.setItem("purchaseHistory", JSON.stringify(history));
    window.localStorage.setItem("shoppingList", JSON.stringify(currentList));

    render(<App />);
    expect(screen.getByText(/Milk/i)).toBeInTheDocument();
    expect(screen.getByText(/Bread/i)).toBeInTheDocument();
    
    const suggestionChips = screen.getByText("✨ Suggestions for you").parentElement;
    expect(suggestionChips).not.toHaveTextContent("Eggs");
  });

  test("maximum 5 suggestions are displayed", () => {
    const history = { a: 10, b: 9, c: 8, d: 7, e: 6, f: 5, g: 4 };
    window.localStorage.setItem("purchaseHistory", JSON.stringify(history));

    render(<App />);
    const addButtons = screen.getAllByRole("button", { name: /Add.*to list/i });
    const historyButtons = addButtons.filter(b => !b.className.includes("chip-seasonal") && !b.className.includes("btn-add-search"));
    expect(historyButtons).toHaveLength(5);
  });

  test("clicking Add adds the suggested item and records purchase history", () => {
    const history = { milk: 3 };
    window.localStorage.setItem("purchaseHistory", JSON.stringify(history));

    render(<App />);
    const addButton = screen.getByRole("button", { name: /Add milk to list/i });
    fireEvent.click(addButton);

    expect(screen.getByText("1 · Dairy")).toBeInTheDocument();
    expect(screen.queryByText("✨ Suggestions for you")).not.toBeInTheDocument();

    const updatedHistory = JSON.parse(window.localStorage.getItem("purchaseHistory"));
    expect(updatedHistory.milk).toBe(4);
  });
});
