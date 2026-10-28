/**
 * Host lines for Apo Lakay, the cultural quiz host.
 * Client-side default quips for the 5-question arc.
 */

export interface HostDialogue {
  welcome: string[];
  questionLeadIn: string[];
  optionSelected: string[];
  submissionCheer: string[];
  passLines: string[];
  failLines: string[];
}

export const APO_LAKAY_HOST: HostDialogue = {
  welcome: [
    "Welcome to the Juander Quiz Show! I'm your host, Apo Lakay. Let's see if you know our Pangasinan stories!",
    "Ay apo! Five questions stand between you and local glory.",
    "Mabuhay, traveler! Apo Lakay here. Ready your wits, keep your eyes on the board, and let's roll!",
  ],
  questionLeadIn: [
    "Checkpoint 1: Let's start with a classic Pangasinan landmark.",
    "Checkpoint 2: Moving along the coastline—listen closely now!",
    "Checkpoint 3: The halfway mark! Don't let your concentration slip.",
    "Checkpoint 4: Deep into local history. Can you feel the tension?",
    "Checkpoint 5: The final question! Win it here and claim your bragging rights!",
  ],
  optionSelected: [
    "Locking that in!",
    "A bold choice! Let's see if it holds up.",
    "Selected! No turning back now.",
    "Marked down! Onward to the next.",
  ],
  submissionCheer: [
    "All five answers are in! Tallying the scorecard...",
    "That's all five! Let's consult the records of Pangasinan...",
  ],
  passLines: [
    "Agtan pay! Excellent work! You passed with flying colors!",
    "Naimbag! True Pangasinense wisdom! Your XP reward is well deserved.",
    "Look at that score! Apo Lakay is genuinely impressed!",
  ],
  failLines: [
    "Ay sayang! A valiant effort, but you fell just short of the 4-correct mark.",
    "Don't fret, traveler! The roads of Pangasinan are full of lessons. Review the facts below and try again soon!",
    "Good try! A bit more exploration along the gulf and you'll ace it next time.",
  ],
};

export function getRandomHostLine(lines: string[], seed?: number): string {
  if (!lines || lines.length === 0) return '';
  const idx = typeof seed === 'number' ? Math.abs(seed) % lines.length : Math.floor(Math.random() * lines.length);
  return lines[idx];
}
