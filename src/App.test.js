import { render, screen, fireEvent, act } from '@testing-library/react';
import App from './App';

describe('Voice Command Shopping Assistant - Phase 1', () => {
  const originalSpeechRecognition = window.SpeechRecognition;
  const originalWebkitSpeechRecognition = window.webkitSpeechRecognition;

  afterEach(() => {
    window.SpeechRecognition = originalSpeechRecognition;
    window.webkitSpeechRecognition = originalWebkitSpeechRecognition;
  });

  test('renders application title and subtitle', () => {
    render(<App />);
    const titleElement = screen.getByText(/Voice Command Shopping Assistant/i);
    expect(titleElement).toBeInTheDocument();
    const subtitleElement = screen.getByText(/Phase 1: Voice Input/i);
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

  test('handles speech recognition lifecycle, transcript capture, and UI state updates', () => {
    let instance;

    // Mock SpeechRecognition constructor
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
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();

    // Click to start listening
    fireEvent.click(button);

    expect(MockSpeechRecognition).toHaveBeenCalledTimes(1);
    expect(instance.continuous).toBe(false);
    expect(instance.interimResults).toBe(false);
    expect(instance.lang).toBe('en-US');
    expect(instance.start).toHaveBeenCalledTimes(1);

    // Simulate onstart event
    act(() => {
      instance.onstart();
    });

    // Verify indicator is displayed and button is disabled during active listening
    expect(screen.getAllByText(/🎙️ Listening.../i).length).toBeGreaterThanOrEqual(1);
    expect(button).toBeDisabled();

    // Simulate onresult event with recognized speech
    act(() => {
      instance.onresult({
        results: [[{ transcript: 'buy two bottles of milk' }]],
      });
    });

    // Simulate onend event
    act(() => {
      instance.onend();
    });

    expect(screen.getByText('buy two bottles of milk')).toBeInTheDocument();
    expect(button).not.toBeDisabled();
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

    expect(screen.getByText(/No speech was detected/i)).toBeInTheDocument();
  });
});


