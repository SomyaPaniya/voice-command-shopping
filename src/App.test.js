import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import App from './App';

describe('Voice Command Shopping Assistant', () => {
  const originalSpeechRecognition = window.SpeechRecognition;
  const originalWebkitSpeechRecognition = window.webkitSpeechRecognition;

  afterEach(() => {
    window.SpeechRecognition = originalSpeechRecognition;
    window.webkitSpeechRecognition = originalWebkitSpeechRecognition;
    jest.restoreAllMocks();
  });

  test('renders application title and subtitle', () => {
    render(<App />);
    const titleElement = screen.getByText(/Voice Command Shopping Assistant/i);
    expect(titleElement).toBeInTheDocument();
    const subtitleElement = screen.getByText(/Phase 4: Shopping List Management/i);
    expect(subtitleElement).toBeInTheDocument();
  });

  test('renders transcript section and initial placeholder', () => {
    render(<App />);
    const transcriptHeading = screen.getByText(/Recognized Transcript/i);
    expect(transcriptHeading).toBeInTheDocument();
    const placeholder = screen.getByText(/Your recognized speech will appear here/i);
    expect(placeholder).toBeInTheDocument();
  });

  test('shows browser compatibility message when SpeechRecognition is not supported', () => {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;

    render(<App />);
    const warningElement = screen.getByText(/Voice recognition isn't supported in this browser/i);
    expect(warningElement).toBeInTheDocument();
  });

  test('handles speech recognition lifecycle and network failure fallback to Rule-based parser', async () => {
    // Phase 3 requirement: "write a Jest test that mocks fetch to simulate an API failure 
    // and confirms App.js correctly falls back to parseCommand() and shows 'Rule-based (fallback)'."
    
    // Mock the global fetch to return an error/500
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500
      })
    );

    let instance;
    const MockSpeechRecognition = jest.fn().mockImplementation(() => {
      instance = {
        continuous: true,
        interimResults: true,
        lang: '',
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

    const button = screen.getByRole('button', { name: /Start Listening/i });
    fireEvent.click(button);

    // Simulate onstart
    act(() => {
      instance.onstart();
    });

    // Simulate onresult with some text
    await act(async () => {
      await instance.onresult({
        results: [[{ transcript: 'add 2 apples' }]],
      });
    });

    // We should see the parsed via fallback logic
    await waitFor(() => {
      expect(screen.getByText('add 2 apples')).toBeInTheDocument();
    });

    await waitFor(() => {
      // "add 2 apples" parsed rule-based becomes: action: add, item: apples, qty: 2
      expect(screen.getByText(/Rule-based \(fallback\)/i)).toBeInTheDocument();
      // Ensure quantity "2" appears
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    // Simulate onend event
    act(() => {
      instance.onend();
    });
  });

  test('handles microphone permission denied error', () => {
    let instance;
    window.SpeechRecognition = jest.fn().mockImplementation(() => {
      instance = {
        start: jest.fn(),
      };
      return instance;
    });

    render(<App />);
    const button = screen.getByRole('button', { name: /Start Listening/i });
    fireEvent.click(button);

    // Simulate permission denied error
    act(() => {
      instance.onerror({ error: 'not-allowed' });
    });

    expect(screen.getByText(/Microphone access was denied/i)).toBeInTheDocument();
  });

  test('handles no speech detected error', () => {
    let instance;
    window.SpeechRecognition = jest.fn().mockImplementation(() => {
      instance = {
        start: jest.fn(),
      };
      return instance;
    });

    render(<App />);
    const button = screen.getByRole('button', { name: /Start Listening/i });
    fireEvent.click(button);

    // Simulate no-speech error
    act(() => {
      instance.onerror({ error: 'no-speech' });
    });

  });

  describe('Phase 4: Shopping List Management', () => {
    test('handles adding new items and assigning categories', async () => {
      let instance;
      const MockSpeechRecognition = jest.fn().mockImplementation(() => {
        instance = { start: jest.fn(), onstart: null, onresult: null, onerror: null, onend: null };
        return instance;
      });
      window.SpeechRecognition = MockSpeechRecognition;

      render(<App />);

      const button = screen.getByRole('button', { name: /Start Listening/i });
      fireEvent.click(button);
      act(() => { instance.onstart(); });

      // Add milk (Dairy)
      await act(async () => {
        await instance.onresult({ results: [[{ transcript: 'add milk' }]] });
      });
      act(() => { instance.onend(); });

      await waitFor(() => {
        expect(screen.getByText('Milk')).toBeInTheDocument();
        expect(screen.getByText('Quantity: 1 | Category: Dairy')).toBeInTheDocument();
      });

      // Add apples (Produce)
      fireEvent.click(button);
      act(() => { instance.onstart(); });
      await act(async () => {
        await instance.onresult({ results: [[{ transcript: 'buy 5 apples' }]] });
      });
      act(() => { instance.onend(); });

      await waitFor(() => {
        expect(screen.getByText('Apples')).toBeInTheDocument();
        expect(screen.getByText('Quantity: 5 | Category: Produce')).toBeInTheDocument();
      });
    });

    test('handles adding same item increases quantity (case-insensitive)', async () => {
      let instance;
      window.SpeechRecognition = jest.fn().mockImplementation(() => {
        instance = { start: jest.fn(), onstart: null, onresult: null, onerror: null, onend: null };
        return instance;
      });

      render(<App />);

      const button = screen.getByRole('button', { name: /Start Listening/i });
      fireEvent.click(button);
      act(() => { instance.onstart(); });

      // Add 2 milk
      await act(async () => {
        await instance.onresult({ results: [[{ transcript: 'add 2 milk' }]] });
      });
      
      await waitFor(() => {
        expect(screen.getByText('Quantity: 2 | Category: Dairy')).toBeInTheDocument();
      });

      // Add MILK (another 3)
      fireEvent.click(button);
      act(() => { instance.onstart(); });
      await act(async () => {
        await instance.onresult({ results: [[{ transcript: 'add 3 MILK' }]] });
      });

      await waitFor(() => {
        expect(screen.getByText('Quantity: 5 | Category: Dairy')).toBeInTheDocument();
      });
    });

    test('handles removing an existing item via voice', async () => {
      let instance;
      window.SpeechRecognition = jest.fn().mockImplementation(() => {
        instance = { start: jest.fn(), onstart: null, onresult: null, onerror: null, onend: null };
        return instance;
      });

      render(<App />);
      const button = screen.getByRole('button', { name: /Start Listening/i });
      
      // Add item first
      fireEvent.click(button);
      act(() => { instance.onstart(); });
      await act(async () => {
        await instance.onresult({ results: [[{ transcript: 'add milk' }]] });
      });
      await waitFor(() => expect(screen.getByText('Milk')).toBeInTheDocument());

      // Remove item
      fireEvent.click(button);
      act(() => { instance.onstart(); });
      await act(async () => {
        await instance.onresult({ results: [[{ transcript: 'remove milk' }]] });
      });

      await waitFor(() => {
        expect(screen.queryByText('Milk')).not.toBeInTheDocument();
      });
    });

    test('handles removing missing item and shows friendly message without crashing', async () => {
      let instance;
      window.SpeechRecognition = jest.fn().mockImplementation(() => {
        instance = { start: jest.fn(), onstart: null, onresult: null, onerror: null, onend: null };
        return instance;
      });

      render(<App />);
      const button = screen.getByRole('button', { name: /Start Listening/i });
      
      fireEvent.click(button);
      act(() => { instance.onstart(); });
      await act(async () => {
        await instance.onresult({ results: [[{ transcript: 'remove bananas' }]] });
      });

      await waitFor(() => {
        expect(screen.getByText('ℹ️ Bananas is not in your shopping list.')).toBeInTheDocument();
      });
    });

    test('handles manual remove button', async () => {
      let instance;
      window.SpeechRecognition = jest.fn().mockImplementation(() => {
        instance = { start: jest.fn(), onstart: null, onresult: null, onerror: null, onend: null };
        return instance;
      });

      render(<App />);
      const button = screen.getByRole('button', { name: /Start Listening/i });
      
      fireEvent.click(button);
      act(() => { instance.onstart(); });
      await act(async () => {
        await instance.onresult({ results: [[{ transcript: 'add milk' }]] });
      });

      await waitFor(() => expect(screen.getByText('Milk')).toBeInTheDocument());

      const removeBtn = screen.getByRole('button', { name: 'Remove' });
      fireEvent.click(removeBtn);

      expect(screen.queryByText('Milk')).not.toBeInTheDocument();
    });

    test('ignores unknown commands and zero/negative quantities', async () => {
      let instance;
      window.SpeechRecognition = jest.fn().mockImplementation(() => {
        instance = { start: jest.fn(), onstart: null, onresult: null, onerror: null, onend: null };
        return instance;
      });

      render(<App />);
      const button = screen.getByRole('button', { name: /Start Listening/i });
      
      fireEvent.click(button);
      act(() => { instance.onstart(); });
      await act(async () => {
        // Fallback rule for "add 0 items" yields quantity 0, which we should ignore.
        await instance.onresult({ results: [[{ transcript: 'add 0 apples' }]] });
      });

      await waitFor(() => {
        expect(screen.queryByText('Apples')).not.toBeInTheDocument();
      });
      
      fireEvent.click(button);
      act(() => { instance.onstart(); });
      await act(async () => {
        await instance.onresult({ results: [[{ transcript: 'what is the weather' }]] });
      });

      await waitFor(() => {
        expect(screen.getByText(/I couldn't understand that shopping command./i)).toBeInTheDocument();
      });
    });
  });
});



