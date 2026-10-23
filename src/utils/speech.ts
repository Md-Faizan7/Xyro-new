// Web Speech API text-to-speech helper with clean pause/resume/stop and voice selection

class SpeechManager {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeaking = false;
  private onStateChangeCallback: ((speaking: boolean) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public isSupported(): boolean {
    return this.synth !== null;
  }

  public onStateChange(cb: (speaking: boolean) => void) {
    this.onStateChangeCallback = cb;
  }

  public speak(text: string, personaVoiceHint?: 'jarvis' | 'vision' | 'xyro' | 'zyro' | 'thala' | 'alex' | 'marcus' | 'maya' | 'sam') {
    if (!this.synth) return;

    this.stop();

    // Clean text of markdown asterisks/hashes for natural speech
    const cleanText = text
      .replace(/[*#_`•]/g, '')
      .replace(/\\approx/g, 'approximately')
      .replace(/\\cdot/g, 'times')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    this.currentUtterance = utterance;

    // Select suitable voice if available
    const voices = this.synth.getVoices();
    if (voices.length > 0) {
      if (personaVoiceHint === 'vision' || personaVoiceHint === 'marcus') {
        const deepVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('David') || v.name.includes('Male') || v.name.includes('Daniel')));
        if (deepVoice) utterance.voice = deepVoice;
        utterance.rate = 0.95;
        utterance.pitch = 0.9;
      } else if (personaVoiceHint === 'xyro' || personaVoiceHint === 'zyro' || personaVoiceHint === 'maya') {
        const warmVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Zira') || v.name.includes('Female') || v.name.includes('Victoria')));
        if (warmVoice) utterance.voice = warmVoice;
        utterance.rate = 1.05;
        utterance.pitch = 1.1;
      } else if (personaVoiceHint === 'thala' || personaVoiceHint === 'sam') {
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
      } else {
        // jarvis / alex: tech, crisp, and direct
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
      }
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (this.onStateChangeCallback) this.onStateChangeCallback(true);
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (this.onStateChangeCallback) this.onStateChangeCallback(false);
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (this.onStateChangeCallback) this.onStateChangeCallback(false);
    };

    this.synth.speak(utterance);
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (this.onStateChangeCallback) this.onStateChangeCallback(false);
    }
  }

  public toggle(text: string, persona?: 'alex' | 'marcus' | 'maya' | 'sam') {
    if (this.isSpeaking) {
      this.stop();
    } else {
      this.speak(text, persona);
    }
  }

  public getSpeaking(): boolean {
    return this.isSpeaking;
  }
}

export const speechManager = new SpeechManager();
