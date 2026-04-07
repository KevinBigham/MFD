/**
 * MFD Scout Intelligence — Advanced Scouting Systems
 *
 * Scout spending menu, scouting math (error bands, OVR display),
 * and scout note flavor text by position + personality trait.
 */

export var SCOUT_SPEND_MENU95 = [
  { id: "opponent_film", label: "Opponent Film Study", icon: "\u{1F4F9}", cost: 40, phase: ["regular", "playoffs"], desc: "+5% win chance vs next opponent. Reveals tendencies." },
  { id: "injury_intel", label: "Injury Intel", icon: "\u{1FA7A}", cost: 25, phase: ["regular", "playoffs"], desc: "Reveals if opponent's Questionable star will actually play." },
  { id: "fa_background", label: "FA Background Check", icon: "\u{1F50D}", cost: 35, phase: ["offseason", "fa"], desc: "Reveals hidden negative traits on a free agent before signing." },
  { id: "trade_intel", label: "Trade Block Intel", icon: "\u{1F4B1}", cost: 50, phase: ["regular", "offseason"], desc: "Reveals rival GM's minimum acceptable trade package for a target." },
  { id: "medical_recheck", label: "Medical Re-Check", icon: "\u{1F3E5}", cost: 30, phase: ["any"], desc: "50% chance to cut injury recovery time by 1-3 weeks." },
  { id: "locker_mole", label: "Locker Room Intel", icon: "\u{1F575}\uFE0F", cost: 60, phase: ["regular"], desc: "Identifies exact source of low morale \u2014 which player is causing it." },
  { id: "contract_intel", label: "Contract Intel", icon: "\u270D\uFE0F", cost: 25, phase: ["offseason", "resign"], desc: "Reveals a player's true contract demands before negotiations." },
  { id: "training_boost", label: "Position Group Boost", icon: "\u{1F3CB}\uFE0F", cost: 45, phase: ["preseason", "regular"], desc: "+15% dev speed for one position group this week." },
  { id: "udfa_search", label: "UDFA Gem Search", icon: "\u{1F48E}", cost: 120, phase: ["offseason"], desc: "Find 3 hidden high-potential undrafted free agents after draft." },
  { id: "pr_spin", label: "Media Spin", icon: "\u{1F4FA}", cost: 80, phase: ["any"], desc: "Artificially boost Owner Mood +5. Useful when you're on the hot seat." },
  { id: "pipeline", label: "College Pipeline", icon: "\u{1F393}", cost: 150, phase: ["offseason", "regular"], desc: "Build college intel year-round with weekly scout trips. Improves draft class insight and pipeline bonuses." },
  { id: "combine_extra", label: "Combine Deep Dive", icon: "\u{1F52C}", cost: 55, phase: ["offseason"], desc: "Extra combine analysis \u2014 50% chance to reveal hidden Glass trait on prospect." },
];

export var SCOUT_MATH = {
  getErrorBand: function (facilityLevel, scoutBonus) {
    var baseError = 12;
    var facilityReduction = (facilityLevel || 0) * 1.5;
    var staffReduction = Math.floor(((scoutBonus || 0) * 40) / 10);
    var finalError = Math.max(1, Math.floor(baseError - facilityReduction - staffReduction));
    return finalError;
  },
  getOvrDisplay: function (trueOvr, conf, errorBand) {
    if (conf >= 100) return "" + trueOvr;
    if (conf < 40) return "??";
    var lo = Math.max(40, trueOvr - errorBand);
    var hi = Math.min(99, trueOvr + errorBand);
    return lo + "-" + hi;
  }
};

export var SCOUT_NOTE_FLAVOR = {
  "QB+workEthic": "Film junkie. He'll know your defense better than you do.",
  "QB+ambition": "High ceiling. Needs the right system to unlock it.",
  "QB+greed": "Elite talent. Will cost you \u2014 and knows it.",
  "QB+loyalty": "Team guy. Will take a hometown discount to win.",
  "QB+pressure": "Thrives in big moments. Born for fourth quarter.",
  "RB+speed": "Burst off the line that pro scouts dream about.",
  "RB+workEthic": "Workhorse back. Give him 25 carries and he won't complain.",
  "WR+ambition": "Wants the spotlight. Give it to him.",
  "WR+greed": "Will catch everything thrown his way \u2014 then ask for more.",
  "CB+pressure": "Clutch cover corner. Big game specialist.",
  "CB+workEthic": "Technician. Studies film until midnight every week.",
  "DL+workEthic": "Motor never stops. Offensive linemen hate him.",
  "DL+ambition": "Wants to lead the league in sacks. He's got the tools.",
  "LB+loyalty": "Captain-type. Defensive leader waiting to happen.",
  "QB+fallback": "Intriguing arm talent. The tape tells the story.",
  "fallback": "Intriguing prospect. Film suggests upside \u2014 needs development."
};

export function getScoutNoteFlavor(pos, trait) {
  return SCOUT_NOTE_FLAVOR[(pos || "?") + "+" + (trait || "")] || SCOUT_NOTE_FLAVOR[(pos || "?") + "+fallback"] || SCOUT_NOTE_FLAVOR.fallback;
}
