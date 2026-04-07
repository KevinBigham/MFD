/**
 * MFD Win Probability Engine v2
 *
 * Expected Points table by down/distance/field position,
 * Leverage Index by quarter/score differential,
 * and win probability calculator with logistic model.
 */

export var EP_TABLE_993 = {
  1: {
    short:    { ownGoal: -0.1, own20: 0.5, own40: 1.2, mid: 2.0, redZone: 3.5, goalLine: 5.0 },
    medium:   { ownGoal: -0.2, own20: 0.4, own40: 1.1, mid: 1.8, redZone: 3.2, goalLine: 4.5 },
    long:     { ownGoal: -0.3, own20: 0.3, own40: 0.9, mid: 1.5, redZone: 2.8, goalLine: 4.0 },
    veryLong: { ownGoal: -0.5, own20: 0.1, own40: 0.6, mid: 1.2, redZone: 2.2, goalLine: 3.5 }
  },
  2: {
    short:    { ownGoal: -0.2, own20: 0.4, own40: 1.1, mid: 1.9, redZone: 3.3, goalLine: 4.8 },
    medium:   { ownGoal: -0.3, own20: 0.3, own40: 1.0, mid: 1.7, redZone: 3.0, goalLine: 4.3 },
    long:     { ownGoal: -0.4, own20: 0.2, own40: 0.8, mid: 1.4, redZone: 2.6, goalLine: 3.8 },
    veryLong: { ownGoal: -0.6, own20: 0.0, own40: 0.5, mid: 1.1, redZone: 2.0, goalLine: 3.3 }
  },
  3: {
    short:    { ownGoal: -0.3, own20: 0.3, own40: 1.0, mid: 1.8, redZone: 3.0, goalLine: 4.5 },
    medium:   { ownGoal: -0.4, own20: 0.2, own40: 0.9, mid: 1.6, redZone: 2.7, goalLine: 4.0 },
    long:     { ownGoal: -0.5, own20: 0.1, own40: 0.7, mid: 1.3, redZone: 2.3, goalLine: 3.5 },
    veryLong: { ownGoal: -0.7, own20: -0.1, own40: 0.4, mid: 0.9, redZone: 1.8, goalLine: 3.0 }
  },
  4: {
    short:    { ownGoal: -1.5, own20: -0.2, own40: 0.8, mid: 1.6, redZone: 2.8, goalLine: 4.2 },
    medium:   { ownGoal: -1.8, own20: -0.4, own40: 0.6, mid: 1.4, redZone: 2.5, goalLine: 3.9 },
    long:     { ownGoal: -2.0, own20: -0.6, own40: 0.4, mid: 1.1, redZone: 2.1, goalLine: 3.5 },
    veryLong: { ownGoal: -2.5, own20: -0.8, own40: 0.2, mid: 0.8, redZone: 1.7, goalLine: 3.0 }
  }
};
export function getEP993(down, yardsToGo, fieldPosition) {
  var distBucket = yardsToGo <= 3 ? "short" : yardsToGo <= 7 ? "medium" : yardsToGo <= 15 ? "long" : "veryLong";
  var fpBucket = fieldPosition <= 10 ? "ownGoal" : fieldPosition <= 30 ? "own20" : fieldPosition <= 50 ? "own40" :
    fieldPosition <= 70 ? "mid" : fieldPosition <= 90 ? "redZone" : "goalLine";
  var d = Math.min(4, Math.max(1, down));
  try { return EP_TABLE_993[d][distBucket][fpBucket]; } catch(e) { return 1.0; }
}
export var LEVERAGE_INDEX_993 = {
  1: { blowout: 0.3, comfortable: 0.5, close: 0.8, tied: 1.0 },
  2: { blowout: 0.4, comfortable: 0.7, close: 1.1, tied: 1.3 },
  3: { blowout: 0.5, comfortable: 0.9, close: 1.4, tied: 1.7 },
  4: { blowout: 0.6, comfortable: 1.3, close: 2.2, tied: 3.0 }
};
export function getLeverageIndex(quarter, scoreDiff) {
  var absDiff = Math.abs(scoreDiff);
  var bucket;
  if (absDiff > 21) bucket = "blowout";
  else if (absDiff >= 11) bucket = "comfortable";
  else if (absDiff >= 4) bucket = "close";
  else bucket = "tied";
  return LEVERAGE_INDEX_993[quarter][bucket];
}
export function calcWinProbV2_993(scoreDiff, quarter, timeLeftInQuarter, down, yardsToGo, fieldPos, isHome) {
  var ep = getEP993(down, yardsToGo, fieldPos);
  var leverage = getLeverageIndex(quarter, scoreDiff);
  var logit = (scoreDiff * 0.09 + ep * 0.125 - 0.0375) * leverage; // v100 DeepSeek fix: corrected coefficients
  if (isHome) logit += 0.2;
  var wp = 1 / (1 + Math.exp(-logit));
  if (wp < 0.01) wp = 0.01;
  if (wp > 0.99) wp = 0.99;
  return wp;
}
