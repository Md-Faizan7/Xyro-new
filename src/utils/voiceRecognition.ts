// Robust Dual-Mode Voice Recognition Service
// 1. Direct Web Speech API (Chrome/Safari) with fresh instance per session and non-fatal silence handling
// 2. High-Accuracy MediaRecorder + Gemini Fallback (Firefox, Edge, cross-origin iframes, or when browser speech API is unavailable)

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function playAudioCue(type: 'start' | 'stop' | 'success') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'start') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } else if (type === 'stop') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } else if (type === 'success') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch {
    // Ignore audio cue errors
  }
}

export interface VoiceRecognitionOptions {
  onInterim?: (interimText: string) => void;
  onFinal: (finalText: string) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onProcessing?: (isProcessing: boolean) => void;
  lang?: string;
  continuous?: boolean;
}

export class VoiceRecognitionService {
  private activeRecognition: any = null;
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private isListening = false;
  private mode: 'webspeech' | 'mediarecorder' = 'webspeech';
  private currentOptions: VoiceRecognitionOptions | null = null;
  private userStoppedExplicitly = false;
  private capturedAnyText = false;

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    const hasWebSpeech = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    const hasMediaDevices = !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
    return hasWebSpeech || hasMediaDevices;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Start listening. Attempts native Web Speech first; if unavailable or errors, falls back to MediaRecorder.
   */
  public async start(options: VoiceRecognitionOptions): Promise<boolean> {
    this.currentOptions = options;
    this.userStoppedExplicitly = false;
    this.capturedAnyText = false;

    if (this.isListening) {
      this.stop();
    }

    const SpeechRecognitionClass =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (SpeechRecognitionClass) {
      try {
        const started = this.startWebSpeech(SpeechRecognitionClass, options);
        if (started) return true;
      } catch (err) {
        console.warn('Web Speech API failed to start, falling back to MediaRecorder:', err);
      }
    }

    // Fallback: Record audio and transcribe via Gemini
    return this.startMediaRecorder(options);
  }

  private startWebSpeech(SpeechRecognitionClass: any, options: VoiceRecognitionOptions): boolean {
    try {
      // Always create a fresh instance to avoid "recognition already started" errors
      const rec = new SpeechRecognitionClass();
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.lang = options.lang || 'en-US';

      rec.onstart = () => {
        this.isListening = true;
        this.mode = 'webspeech';
        playAudioCue('start');
        options.onStart?.();
      };

      rec.onresult = (event: any) => {
        let interim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalChunk += transcript + ' ';
          } else {
            interim += transcript;
          }
        }

        if (finalChunk.trim()) {
          this.capturedAnyText = true;
          options.onFinal(finalChunk.trim());
        }

        if (interim) {
          options.onInterim?.(interim);
        }
      };

      rec.onerror = (event: any) => {
        const error = event.error;
        console.warn('Web Speech API event.error:', error);

        // 'no-speech' is non-fatal: user is just thinking or silent for a moment
        if (error === 'no-speech') {
          return;
        }

        // 'aborted' is intentional when user clicks stop
        if (error === 'aborted') {
          return;
        }

        // If Web Speech is blocked in iframe or hits network/not-allowed, gracefully switch to MediaRecorder
        if (error === 'not-allowed' || error === 'service-not-allowed' || error === 'network' || error === 'audio-capture') {
          this.cleanupWebSpeech();
          console.info('Switching to MediaRecorder audio transcription fallback...');
          this.startMediaRecorder(options);
          return;
        }

        // Any other error
        options.onError?.(`Microphone notice: ${error}`);
      };

      rec.onend = () => {
        const wasListening = this.isListening;
        this.isListening = false;
        this.activeRecognition = null;

        if (wasListening) {
          playAudioCue('stop');
        }

        // If recognition closed automatically without explicit stop and without error, restart if still desired
        if (!this.userStoppedExplicitly && wasListening && !this.capturedAnyText) {
          // Silent end, no action needed
        }

        options.onEnd?.();
      };

      this.activeRecognition = rec;
      rec.start();
      return true;
    } catch (err) {
      console.warn('Failed to start WebSpeech instance:', err);
      return false;
    }
  }

  private async startMediaRecorder(options: VoiceRecognitionOptions): Promise<boolean> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      options.onError?.('Microphone access is not supported in this browser. Please use Google Chrome, Edge, or Safari.');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaStream = stream;
      this.audioChunks = [];
      this.mode = 'mediarecorder';

      // Pick supported mimeType
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg', ''];
      let selectedMime = '';
      for (const m of mimeTypes) {
        if (!m || MediaRecorder.isTypeSupported(m)) {
          selectedMime = m;
          break;
        }
      }

      const recorder = selectedMime
        ? new MediaRecorder(stream, { mimeType: selectedMime })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      recorder.onstart = () => {
        this.isListening = true;
        playAudioCue('start');
        options.onStart?.();
        options.onInterim?.('Listening to your voice... Speak your question now');
      };

      recorder.onstop = async () => {
        this.isListening = false;
        playAudioCue('stop');
        this.cleanupStream();

        if (this.audioChunks.length === 0) {
          options.onEnd?.();
          return;
        }

        // Send recorded audio to Gemini transcription endpoint
        options.onProcessing?.(true);
        options.onInterim?.('Transcribing your speech...');

        try {
          const audioBlob = new Blob(this.audioChunks, { type: selectedMime || 'audio/webm' });
          if (audioBlob.size < 1000) {
            // Audio was essentially empty
            options.onProcessing?.(false);
            options.onEnd?.();
            return;
          }

          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Data = (reader.result as string) || '';
            try {
              const res = await fetch('/api/study/transcribe-audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  audioData: base64Data,
                  mimeType: selectedMime || 'audio/webm',
                }),
              });

              const data = await res.json();
              if (res.ok && data.text) {
                playAudioCue('success');
                options.onFinal(data.text);
              } else if (!res.ok) {
                options.onError?.(data.error || 'Failed to transcribe audio.');
              }
            } catch (err: any) {
              options.onError?.('Network error while transcribing audio.');
            } finally {
              options.onProcessing?.(false);
              options.onEnd?.();
            }
          };
        } catch (err: any) {
          options.onProcessing?.(false);
          options.onError?.('Error processing microphone recording.');
          options.onEnd?.();
        }
      };

      this.mediaRecorder = recorder;
      recorder.start(250);
      return true;
    } catch (err: any) {
      console.warn('Microphone getUserMedia denied/failed:', err);
      let errorMsg = 'Could not access microphone.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Microphone permission was denied. Please click the lock or camera icon in your address bar to allow microphone access.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No microphone device was detected on your computer.';
      }
      options.onError?.(errorMsg);
      return false;
    }
  }

  public stop() {
    this.userStoppedExplicitly = true;
    if (this.mode === 'webspeech' && this.activeRecognition) {
      try {
        this.activeRecognition.stop();
      } catch {
        // Ignore
      }
      this.cleanupWebSpeech();
    } else if (this.mode === 'mediarecorder' && this.mediaRecorder) {
      try {
        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        }
      } catch {
        // Ignore
      }
    }
    this.isListening = false;
  }

  public abort() {
    this.userStoppedExplicitly = true;
    if (this.activeRecognition) {
      try {
        this.activeRecognition.abort();
      } catch {
        // Ignore
      }
      this.cleanupWebSpeech();
    }
    if (this.mediaRecorder) {
      try {
        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        }
      } catch {
        // Ignore
      }
      this.cleanupStream();
    }
    this.isListening = false;
  }

  private cleanupWebSpeech() {
    if (this.activeRecognition) {
      try {
        this.activeRecognition.onstart = null;
        this.activeRecognition.onresult = null;
        this.activeRecognition.onerror = null;
        this.activeRecognition.onend = null;
      } catch {}
      this.activeRecognition = null;
    }
  }

  private cleanupStream() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      this.mediaStream = null;
    }
  }
}

export const voiceRecognition = new VoiceRecognitionService();
