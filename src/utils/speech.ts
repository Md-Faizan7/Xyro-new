// Web Speech API text-to-speech helper with clean pause/resume/stop, voice selection, and message tracking

class SpeechManager {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeaking = false;
  private currentSpokenId: string | null = null;
  private onStateChangeCallback: ((speaking: boolean, activeId: string | null) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public isSupported(): boolean {
    return this.synth !== null;
  }

  public onStateChange(cb: (speaking: boolean, activeId: string | null) => void) {
    this.onStateChangeCallback = cb;
  }

  public cleanTextForSpeech(text: string): string {
    return text
      // Remove markdown bold/italic/code markers
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/#+\s*/g, '')
      .replace(/•\s*/g, '')
      .replace(/[-*]\s+/g, '')
      // Clean common mathematical formulas
      .replace(/\\approx/g, 'approximately')
      .replace(/\\cdot/g, 'times')
      .replace(/\\pm/g, 'plus or minus')
      .replace(/\\times/g, 'multiplied by')
      .replace(/\\div/g, 'divided by')
      .replace(/\\leq/g, 'less than or equal to')
      .replace(/\\geq/g, 'greater than or equal to')
      .replace(/\\neq/g, 'not equal to')
      .replace(/\\infty/g, 'infinity')
      .replace(/\\rightarrow/g, 'leads to')
      .replace(/([0-9]+)\s*\/\s*([0-9]+)/g, '$1 divided by $2')
      .replace(/[*_~`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  public speak(
    text: string,
    personaVoiceHint?: string,
    messageId?: string
  ) {
    if (!this.synth) return;

    this.stop();

    const clean = this.cleanTextForSpeech(text);
    if (!clean) return;

    // Chrome bug workaround: speechSynthesis can pause after 15 seconds if long; cancel beforehand
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(clean);
    this.currentUtterance = utterance;
    this.currentSpokenId = messageId || null;

    // Select suitable voice if available
    const voices = this.synth.getVoices();
    if (voices && voices.length > 0) {
      const hint = personaVoiceHint?.toLowerCase();
      if (hint === 'vision' || hint === 'marcus') {
        const deepVoice = voices.find(
          (v) => v.lang.startsWith('en') && (v.name.includes('David') || v.name.includes('Male') || v.name.includes('Daniel') || v.name.includes('Guy'))
        );
        if (deepVoice) utterance.voice = deepVoice;
        utterance.rate = 0.95;
        utterance.pitch = 0.9;
      } else if (hint === 'xyro' || hint === 'zyro' || hint === 'maya' || hint === 'meow') {
        const warmVoice = voices.find(
          (v) => v.lang.startsWith('en') && (v.name.includes('Zira') || v.name.includes('Female') || v.name.includes('Victoria') || v.name.includes('Samantha') || v.name.includes('Natural'))
        );
        if (warmVoice) utterance.voice = warmVoice;
        utterance.rate = 1.05;
        utterance.pitch = 1.1;
      } else if (personaVoiceHint === 'thala' || personaVoiceHint === 'sam') {
        const calmVoice = voices.find((v) => v.lang.startsWith('en') && (v.name.includes('George') || v.name.includes('Oliver') || v.name.includes('Alex')));
        if (calmVoice) utterance.voice = calmVoice;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
      } else {
        // jarvis / alex: tech, crisp, and direct
        const crispVoice = voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Daniel')));
        if (crispVoice) utterance.voice = crispVoice;
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
      }
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(true, this.currentSpokenId);
      }
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentSpokenId = null;
      this.currentUtterance = null;
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(false, null);
      }
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      this.currentSpokenId = null;
      this.currentUtterance = null;
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(false, null);
      }
    };

    this.synth.speak(utterance);
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
      this.currentSpokenId = null;
      this.currentUtterance = null;
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(false, null);
      }
    }
  }

  public toggle(
    text: string,
    persona?: 'jarvis' | 'vision' | 'xyro' | 'zyro' | 'thala' | 'alex' | 'marcus' | 'maya' | 'sam',
    messageId?: string
  ) {
    if (this.isSpeaking && (this.currentSpokenId === messageId || !messageId)) {
      this.stop();
    } else {
      this.speak(text, persona, messageId);
    }
  }

  public getSpeaking(): boolean {
    return this.isSpeaking;
  }

  public getCurrentSpokenId(): string | null {
    return this.currentSpokenId;
  }
}

export const speechManager = new SpeechManager();
