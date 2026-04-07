/**
 * MFD Keyboard Configuration
 *
 * Key mappings for tab navigation, action keys,
 * and tab ordering for keyboard shortcuts.
 */

export var KEYMAP = {
  "1": "home", "2": "roster", "3": "scouting", "4": "schedule", "5": "standings",
  "6": "stats", "7": "trade", "8": "freeAgents", "9": "office",
  "d": "home", "r": "roster", "g": "trade", "o": "office", "c": "capLab",
  "h": "hallOfFame", "i": "inbox",
  "[": "prevTab", "]": "nextTab"
};

export var ACTION_KEYS = {
  " ": "simWeek", "w": "simWeek", "n": "nextPhase", "p": "simToPlayoffs",
  "Escape": "closeModal", "?": "showHelp"
};

export var TAB_ORDER = ["home", "roster", "depthChart", "scouting", "schedule", "standings", "stats", "trade", "freeAgents", "office"];
