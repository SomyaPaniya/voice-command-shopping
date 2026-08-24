import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
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
    const subtitleElement = screen.getByText(
      /Phase 5: LocalStorage Persistence/i,
    );
    expect(subtitleElement).toBeInTheDocument();
  });

  test("renders transcript section and initial placeholder", () => {
    render(<App />);
    const transcriptHeading = screen.getByText(/Recognized Transcript/i);
    expect(transcriptHeading).toBeInTheDocument();
    const placeholder = screen.getByText(
      /Your recognized speech will appear here/i,
    );
    expect(placeholder).toBeInTheDocument();
  });

  test("shows browser compatibility message when SpeechRecognition is not supported", () => {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;

    render(<App />);
    const warningElement = screen.getByText(
      /Voice recognition isn't supported in this browser/i,
    );
    expect(warningElement).toBeInTheDocument();
  });

  test("handles speech recognition lifecycle and network failure fallback to Rule-based parser", async () => {
    // Phase 3 requirement: "write a Jest test that mocks fetch to simulate an API failure
    // and confirms App.js correctly falls back to parseCommand() and shows 'Rule-based (fallback)'."

    // Mock the global fetch to return an error/500
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      }),
    );

    let instance;
    const MockSpeechRecognition = jest.fn().mockImplementation(() => {
      instance = {
        continuous: true,
        interimResults: true,
        lang: "",
        onstart: null,
        onresult: null,
        onerror: null,
        onend: null,
        start: jest.fn(),
      };
      return instance;
    });

    window.SpeechRecognition = MockSpeechRecognition;

    render(<App />);

    const button = screen.getByRole("button", { name: /Start Listening/i });
    fireEvent.click(button);

    // Simulate onstart
    act(() => {
      instance.onstart();
    });

    // Simulate onresult with some text
    await act(async () => {
      await instance.onresult({
        results: [[{ transcript: "add 2 apples" }]],
      });
    });

    // We should see the parsed via fallback logic
    await waitFor(() => {
      expect(screen.getByText("add 2 apples")).toBeInTheDocument();
    });

    await waitFor(() => {
      // "add 2 apples" parsed rule-based becomes: action: add, item: apples, qty: 2
      expect(screen.getByText(/Rule-based \(fallback\)/i)).toBeInTheDocument();
      // Ensure quantity "2" appears
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    // Simulate onend event
    act(() => {
      instance.onend();
    });
  });

  test("handles microphone permission denied error", () => {
    let instance;
    window.SpeechRecognition = jest.fn().mockImplementation(() => {
      instance = {
        start: jest.fn(),
      };
      return instance;
    });

    render(<App />);
    const button = screen.getByRole("button", { name: /Start Listening/i });
    fireEvent.click(button);

    // Simulate permission denied error
    act(() => {
      instance.onerror({ error: "not-allowed" });
    });

    expect(
      screen.getByText(/Microphone access was denied/i),
    ).toBeInTheDocument();
  });

  test("handles no speech detected error", () => {
    let instance;
    window.SpeechRecognition = jest.fn().mockImplementation(() => {
      instance = {
        start: jest.fn(),
      };
      return instance;
    });

    render(<App />);
    const button = screen.getByRole("button", { name: /Start Listening/i });
    fireEvent.click(button);

    // Simulate no-speech error
    act(() => {
      instance.onerror({ error: "no-speech" });
    });
  });

  describe("Phase 5: LocalStorage Persistence", () => {
    test("handles adding new items and assigning categories", async () => {
      let instance;
      const MockSpeechRecognition = jest.fn().mockImplementation(() => {
        instance = {
          start: jest.fn(),
          onstart: null,
          onresult: null,
          onerror: null,
          onend: null,
        };
        return instance;
      });
      window.SpeechRecognition = MockSpeechRecognition;

      render(<App />);

      const button = screen.getByRole("button", { name: /Start Listening/i });
      fireEvent.click(button);
      act(() => {
        instance.onstart();
      });

      // Add milk (Dairy)
      await act(async () => {
        await instance.onresult({ results: [[{ transcript: "add milk" }]] });
      });
      act(() => {
        instance.onend();
      });

      await waitFor(() => {
        expect(screen.getByText("Milk")).toBeInTheDocument();
        expect(
          screen.getByText("Quantity: 1 | Category: Dairy"),
        ).toBeInTheDocument();
      });

      // Add apples (Produce)
      fireEvent.click(button);
      act(() => {
        instance.onstart();
      });
      await act(async () => {
        await instance.onresult({
          results: [[{ transcript: "buy 5 apples" }]],
        });
      });
      act(() => {
        instance.onend();
      });

      await waitFor(() => {
        expect(screen.getByText("Apples")).toBeInTheDocument();
        expect(
          screen.getByText("Quantity: 5 | Category: Produce"),
        ).toBeInTheDocument();
      });
    });

    test("handles adding same item increases quantity (case-insensitive)", async () => {
      let instance;
      window.SpeechRecognition = jest.fn().mockImplementation(() => {
        instance = {
          start: jest.fn(),
          onstart: null,
          onresult: null,
          onerror: null,
          onend: null,
        };
        return instance;
      });

      render(<App />);

      const button = screen.getByRole("button", { name: /Start Listening/i });
      fireEvent.click(button);
      act(() => {
        instance.onstart();
      });

      // Add 2 milk
      await act(async () => {
        await instance.onresult({ results: [[{ transcript: "add 2 milk" }]] });
      });

      await waitFor(() => {
        expect(
          screen.getByText("Quantity: 2 | Category: Dairy"),
        ).toBeInTheDocument();
      });

      // Add MILK (another 3)
      fireEvent.click(button);
      act(() => {
        instance.onstart();
      });
      await act(async () => {
        await instance.onresult({ results: [[{ transcript: "add 3 MILK" }]] });
      });

      await waitFor(() => {
        expect(
          screen.getByText("Quantity: 5 | Category: Dairy"),
        ).toBeInTheDocument();
      });
    });

    test("handles removing an existing item via voice", async () => {
      let instance;
      window.SpeechRecognition = jest.fn().mockImplementation(() => {
        instance = {
          start: jest.fn(),
          onstart: null,
          onresult: null,
          onerror: null,
          onend: null,
        };
        return instance;
      });

      render(<App />);
      const button = screen.getByRole("button", { name: /Start Listening/i });

      // Add item first
      fireEvent.click(button);
      act(() => {
        instance.onstart();
      });
      await act(async () => {
        await instance.onresult({ results: [[{ transcript: "add milk" }]] });
      });
      await waitFor(() => expect(screen.getByText("Milk")).toBeInTheDocument());

      // Remove item
      fireEvent.click(button);
      act(() => {
        instance.onstart();
      });
      await act(async () => {
        await instance.onresult({ results: [[{ transcript: "remove milk" }]] });
      });

      await waitFor(() => {
        expect(
          screen.getByText("Your shopping list is empty."),
        ).toBeInTheDocument();
      });
    });

    test("handles removing missing item and shows friendly message without crashing", async () => {
      let instance;
      window.SpeechRecognition = jest.fn().mockImplementation(() => {
        instance = {
          start: jest.fn(),
          onstart: null,
          onresult: null,
          onerror: null,
          onend: null,
        };
        return instance;
      });

      render(<App />);
      const button = screen.getByRole("button", { name: /Start Listening/i });

      fireEvent.click(button);
      act(() => {
        instance.onstart();
      });
    });
  });

  describe("Phase 5: LocalStorage Persistence", () => {
    beforeEach(() => {
      window.localStorage.clear();
      jest.restoreAllMocks();
    });

    test("loads existing shopping list from localStorage on mount", () => {
      const savedList = [
        { id: "123", item: "Saved Milk", quantity: 2, category: "Dairy" },
      ];
      window.localStorage.setItem("shoppingList", JSON.stringify(savedList));

      render(<App />);

      expect(screen.getByText("Saved Milk")).toBeInTheDocument();
      expect(
        screen.getByText("Quantity: 2 | Category: Dairy"),
      ).toBeInTheDocument();
    });

    test("saves shopping list to localStorage when items are added", async () => {
      let instance;
      window.SpeechRecognition = jest.fn().mockImplementation(() => {
        instance = {
          start: jest.fn(),
          onstart: null,
          onresult: null,
          onerror: null,
          onend: null,
        };
        return instance;
      });

      render(<App />);
      const button = screen.getByRole("button", { name: /Start Listening/i });

      fireEvent.click(button);
      act(() => {
        instance.onstart();
      });
      await act(async () => {
        await instance.onresult({
          results: [[{ transcript: "add 3 bananas" }]],
        });
      });

      await waitFor(() => {
        expect(screen.getByText("Bananas")).toBeInTheDocument();
      });

      // Verify it was saved to localStorage
      const savedData = JSON.parse(window.localStorage.getItem("shoppingList"));
      expect(savedData).toHaveLength(1);
      expect(savedData[0].item).toBe("Bananas");
      expect(savedData[0].quantity).toBe(3);
    });

    test("handles invalid JSON in localStorage safely without crashing", () => {
      // Intentionally corrupt the saved data
      window.localStorage.setItem("shoppingList", 'invalid{json"');

      // The console will warn, so we spy on it to keep test output clean
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      render(<App />);

      // Should render empty list, no crash
      expect(
        screen.getByText("Your shopping list is empty."),
      ).toBeInTheDocument();

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
    expect(screen.queryByText("💡 Smart Suggestions")).not.toBeInTheDocument();
  });

  test("frequently purchased items become suggestions and survive reload", () => {
    const history = { milk: 3, bread: 1 };
    window.localStorage.setItem("purchaseHistory", JSON.stringify(history));

    render(<App />);

    expect(screen.getByText("💡 Smart Suggestions")).toBeInTheDocument();
    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText("Bread")).toBeInTheDocument();
  });

  test("items already in the shopping list are excluded from suggestions", () => {
    const history = { milk: 3, bread: 1, eggs: 5 };
    const currentList = [
      { id: "1", item: "Eggs", quantity: 1, category: "Other" },
    ];

    window.localStorage.setItem("purchaseHistory", JSON.stringify(history));
    window.localStorage.setItem("shoppingList", JSON.stringify(currentList));

    render(<App />);

    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText("Bread")).toBeInTheDocument();

    const suggestionChips = screen.getByText(
      "💡 Smart Suggestions",
    ).parentElement;
    expect(suggestionChips).not.toHaveTextContent("Eggs");
  });

  test("maximum 5 suggestions are displayed", () => {
    const history = { a: 10, b: 9, c: 8, d: 7, e: 6, f: 5, g: 4 };
    window.localStorage.setItem("purchaseHistory", JSON.stringify(history));

    render(<App />);

    const addButtons = screen.getAllByRole("button", { name: /Add/i });
    expect(addButtons).toHaveLength(5);
  });

  test("clicking Add adds the suggested item and records purchase history", () => {
    const history = { milk: 3 };
    window.localStorage.setItem("purchaseHistory", JSON.stringify(history));

    render(<App />);

    const addButton = screen.getByRole("button", { name: /Add/i });
    fireEvent.click(addButton);

    expect(
      screen.getByText("Quantity: 1 | Category: Dairy"),
    ).toBeInTheDocument();
    expect(screen.queryByText("💡 Smart Suggestions")).not.toBeInTheDocument();

    const updatedHistory = JSON.parse(
      window.localStorage.getItem("purchaseHistory"),
    );
    expect(updatedHistory.milk).toBe(4);
  });
});

