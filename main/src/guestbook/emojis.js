// The 16 classic emoticon icons for the guestbook picker.
// One source of truth for the picker grid AND the sanitizer img-src allowlist.
//
// These are 12x12 pixel-art .ico files. They're displayed upscaled with
// image-rendering:pixelated (nearest-neighbor), so they stay crisp - no blur -
// and all render at an identical size (single 12x12 source).
export const EMOJI_DIR = "/assets/guestbook/emoticons/";

export const EMOJIS = [
  { file: "1smiling.ico", label: "Smiling" },
  { file: "2frowning.ico", label: "Frowning" },
  { file: "3winking.ico", label: "Winking" },
  { file: "4stickingouttongue.ico", label: "Tongue out" },
  { file: "5surprised.ico", label: "Surprised" },
  { file: "6kissing.ico", label: "Kissing" },
  { file: "7yelling.ico", label: "Yelling" },
  { file: "8cool.ico", label: "Cool" },
  { file: "9moneymouth.ico", label: "Money-mouth" },
  { file: "10footinmouth.ico", label: "Foot in mouth" },
  { file: "11embarrassed.ico", label: "Embarrassed" },
  { file: "12innocent.ico", label: "Innocent" },
  { file: "13undecided.ico", label: "Undecided" },
  { file: "14crying.ico", label: "Crying" },
  { file: "15lipsaresealed.ico", label: "Lips are sealed" },
  { file: "16laughing.ico", label: "Laughing" },
];

// Set of allowed emote filenames (for the sanitizer).
export const EMOJI_FILES = new Set(EMOJIS.map((e) => e.file));

export const emojiUrl = (file) => EMOJI_DIR + file;
