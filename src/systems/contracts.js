/**
 * MFD Contract System
 *
 * Contract creation, restructuring, backloading, extensions,
 * dead cap calculations, and cap hit math.
 */

import { MIN_SALARY, getMinSalary } from '../config/cap-math.js';

export function makeContract(salary, years, signingBonus, guaranteed) {
  var sb = signingBonus || 0;
  var yrs = Math.max(years || 1, 1);
  var base = Math.max(salary || MIN_SALARY, MIN_SALARY);
  var pro = yrs > 0 ? Math.round((sb / yrs) * 10) / 10 : 0;
  var hit = Math.round((base + pro) * 10) / 10;
  return {
    baseSalary: base,
    years: yrs,
    signingBonus: sb,
    prorated: pro,
    guaranteed: guaranteed || 0,
    restructured: false,
    originalYears: yrs,
    salary: hit, // v35: .salary = capHit for backward compat
  };
}

export function calcCapHit(c) {
  if (!c) return 0;
  if (c.baseSalary !== undefined)
    return Math.round((c.baseSalary + (c.prorated || 0)) * 10) / 10;
  return c.salary || 0;
}

export function calcDeadMoney(c) {
  if (!c || !c.prorated) return 0;
  return Math.round(c.prorated * c.years * 10) / 10;
}

export function restructureContract(p) {
  var c = p.contract;
  if (!c || c.baseSalary === undefined)
    return { ok: false, msg: 'Contract not v35-shaped.' };
  if (c.years <= 1)
    return { ok: false, msg: 'Cannot restructure \u2014 1 year or less remaining.' };
  if (c.restructured)
    return { ok: false, msg: 'Already restructured this contract.' };
  var yoe = Math.max((p.age || 22) - 22, 0);
  var minBase = getMinSalary(yoe);
  if (c.baseSalary < minBase + 1.0)
    return {
      ok: false,
      msg:
        'Base salary too low to restructure ($' +
        (minBase + 1.0).toFixed(1) +
        'M minimum).',
    };
  var converted = Math.round((c.baseSalary - minBase) * 10) / 10;
  var spreadYrs = Math.min(c.years, 5);
  var addedPro = Math.round((converted / spreadYrs) * 10) / 10;
  var oldHit = calcCapHit(c);
  c.baseSalary = Math.round(minBase * 10) / 10;
  c.prorated = Math.round((c.prorated + addedPro) * 10) / 10;
  c.signingBonus = Math.round((c.signingBonus + converted) * 10) / 10;
  c.restructured = true;
  c.salary = calcCapHit(c);
  var newHit = calcCapHit(c);
  var savings = Math.round((oldHit - newHit) * 10) / 10;
  return {
    ok: true,
    savings: savings,
    addedPro: addedPro,
    years: spreadYrs,
    newHit: newHit,
    msg:
      'Restructured: saved $' +
      savings +
      'M this year. +$' +
      addedPro +
      'M/yr dead cap for ' +
      spreadYrs +
      ' years.',
  };
}

export function backloadContract973(p, voidYears) {
  var c = p && p.contract;
  if (!c || c.baseSalary === undefined)
    return { ok: false, msg: 'Contract not v35-shaped.' };
  if (c.years <= 1)
    return { ok: false, msg: 'Cannot backload \u2014 1 year or less remaining.' };
  if (c.backloaded) return { ok: false, msg: 'Already backloaded.' };
  var maxVoid = Math.min(voidYears || 2, 3);
  var converted = Math.round(c.baseSalary * 0.4 * 10) / 10;
  if (converted <= 0)
    return { ok: false, msg: 'No base salary available to backload.' };
  var spreadYrs = Math.max(1, (c.years || 1) + maxVoid);
  var addedPro = Math.round((converted / spreadYrs) * 10) / 10;
  var oldHit = calcCapHit(c);
  c.baseSalary = Math.round((c.baseSalary - converted) * 10) / 10;
  c.prorated = Math.round(((c.prorated || 0) + addedPro) * 10) / 10;
  c.backloaded = true;
  c.voidYears = Math.max(c.voidYears || 0, maxVoid);
  c.salary = calcCapHit(c);
  var newHit = calcCapHit(c);
  var savings = Math.round((oldHit - newHit) * 10) / 10;
  return {
    ok: true,
    savings: savings,
    voidYears: maxVoid,
    newHit: newHit,
    msg:
      'Backloaded: saved $' +
      savings +
      'M this year. ' +
      maxVoid +
      ' void year' +
      (maxVoid > 1 ? 's' : '') +
      ' of $' +
      addedPro +
      'M dead cap added.',
  };
}

export function extendAndRestructure973(p, addYears) {
  var c = p && p.contract;
  if (!c || c.baseSalary === undefined)
    return { ok: false, msg: 'Contract not v35-shaped.' };
  var maxAdd = Math.min(addYears || 2, 3);
  if (maxAdd <= 0) return { ok: false, msg: 'Invalid extension length.' };
  var raise = Math.round(c.baseSalary * 0.1 * maxAdd * 10) / 10;
  c.years = Math.max(1, (c.years || 1) + maxAdd);
  c.baseSalary = Math.round((c.baseSalary + raise) * 10) / 10;
  c.guaranteed = Math.round(((c.guaranteed || 0) + raise * 0.5) * 10) / 10;
  c.salary = calcCapHit(c);
  var result = restructureContract(p);
  if (result.ok) {
    return {
      ok: true,
      msg: 'Extended ' + maxAdd + 'yr + restructured: ' + result.msg,
      savings: result.savings,
      addedYears: maxAdd,
      newHit: result.newHit,
    };
  }
  return {
    ok: true,
    msg: 'Extended ' + maxAdd + 'yr. Raise: +$' + raise + 'M/yr.',
    savings: 0,
    addedYears: maxAdd,
    newHit: calcCapHit(c),
  };
}

// v99.4 — DeepSeek: Contract Value Engine v2
// CONTRACT_VALUE_TABLE_994[position][tier] -> expected cap % per year
export var CONTRACT_VALUE_TABLE_994 = {
  QB:  { elite: 0.18, starter: 0.09, backup: 0.03 },
  RB:  { elite: 0.12, starter: 0.06, backup: 0.02 },
  WR:  { elite: 0.16, starter: 0.08, backup: 0.025 },
  TE:  { elite: 0.10, starter: 0.05, backup: 0.015 },
  OL:  { elite: 0.11, starter: 0.055, backup: 0.018 },
  DL:  { elite: 0.15, starter: 0.075, backup: 0.022 },
  LB:  { elite: 0.10, starter: 0.05, backup: 0.015 },
  CB:  { elite: 0.14, starter: 0.07, backup: 0.02 },
  S:   { elite: 0.09, starter: 0.045, backup: 0.012 },
  K:   { elite: 0.05, starter: 0.025, backup: 0.008 },
  P:   { elite: 0.04, starter: 0.02, backup: 0.006 },
};

// AGE_VALUE_CURVE_994[position] -> multipliers, index 0 = age 21, index 17 = age 38
export var AGE_VALUE_CURVE_994 = {
  QB:  [0.80,0.84,0.88,0.91,0.94,0.96,0.98,0.99,1.00,1.00,0.99,0.98,0.96,0.93,0.89,0.84,0.78,0.71],
  RB:  [0.85,0.93,0.98,1.00,0.96,0.88,0.78,0.68,0.59,0.51,0.44,0.38,0.32,0.27,0.22,0.18,0.14,0.11],
  WR:  [0.72,0.79,0.86,0.92,0.97,0.99,1.00,0.99,0.97,0.94,0.90,0.86,0.81,0.76,0.71,0.66,0.61,0.56],
  TE:  [0.70,0.77,0.84,0.90,0.95,0.98,0.99,1.00,0.99,0.97,0.94,0.90,0.86,0.81,0.76,0.71,0.66,0.61],
  OL:  [0.65,0.72,0.79,0.86,0.92,0.96,0.99,1.00,1.00,0.99,0.97,0.94,0.91,0.87,0.83,0.79,0.75,0.71],
  DL:  [0.68,0.75,0.82,0.89,0.94,0.98,0.99,1.00,0.99,0.96,0.92,0.87,0.82,0.77,0.72,0.67,0.62,0.57],
  LB:  [0.70,0.78,0.86,0.93,0.97,0.99,1.00,0.98,0.95,0.91,0.86,0.81,0.76,0.71,0.66,0.61,0.56,0.51],
  CB:  [0.80,0.90,0.97,1.00,0.98,0.96,0.92,0.87,0.81,0.75,0.69,0.63,0.57,0.51,0.45,0.39,0.33,0.27],
  S:   [0.72,0.80,0.88,0.94,0.98,0.99,1.00,0.98,0.95,0.91,0.87,0.82,0.77,0.72,0.67,0.62,0.57,0.52],
  K:   [0.70,0.74,0.78,0.82,0.86,0.90,0.94,0.98,1.00,1.00,0.99,0.97,0.94,0.90,0.86,0.82,0.78,0.74],
  P:   [0.70,0.74,0.78,0.82,0.86,0.90,0.94,0.98,1.00,1.00,0.99,0.97,0.94,0.90,0.86,0.82,0.78,0.74],
};

// v99.4: Contract scoring — grades a contract A+ through F
export function calcContractScore994(ovr, pos, age, years, totalValue, capTotal) {
  var tier;
  if (ovr >= 90) tier = 'elite';
  else if (ovr >= 75) tier = 'starter';
  else tier = 'backup';

  var marketRate = CONTRACT_VALUE_TABLE_994[pos]
    ? CONTRACT_VALUE_TABLE_994[pos][tier]
    : 0.05;

  var ageIndex = Math.min(38, Math.max(21, age)) - 21;
  var ageMult = AGE_VALUE_CURVE_994[pos]
    ? AGE_VALUE_CURVE_994[pos][ageIndex]
    : 0.8;

  // Length penalty: 2% per year beyond 3
  var lengthPenalty = 1 - 0.02 * Math.max(0, years - 3);

  var fairAnnual = capTotal * marketRate * ageMult * lengthPenalty;
  var actualAnnual = totalValue / years;
  var fairTotal = fairAnnual * years;
  var surplus = fairTotal - totalValue;

  var grade;
  if (surplus > 15) grade = 'A+';
  else if (surplus >= 8) grade = 'A';
  else if (surplus >= 2) grade = 'B';
  else if (surplus >= -5) grade = 'C';
  else if (surplus >= -15) grade = 'D';
  else grade = 'F';

  var score = 50 + surplus * 2;
  score = Math.min(100, Math.max(0, score));

  return {
    score: Math.round(score),
    grade: grade,
    surplus: Math.round(surplus * 10) / 10,
    annualCapPct: Math.round((actualAnnual / capTotal) * 1000) / 1000,
    fairValue: Math.round(fairAnnual * 10) / 10,
  };
}

// v99.4: Dead cap impact calculator
export function calcDeadCap994(totalGuaranteed, yearsRemaining, yearsCut) {
  yearsRemaining = Math.max(1, yearsRemaining);
  yearsCut = Math.min(yearsCut, yearsRemaining);
  var remainingAfterCut = Math.max(0, yearsRemaining - yearsCut);
  var deadCapHit = (totalGuaranteed * remainingAfterCut) / yearsRemaining;
  var annualGuaranteed = totalGuaranteed / yearsRemaining;
  var capSavings = annualGuaranteed * remainingAfterCut;
  var netCapImpact = capSavings - deadCapHit;

  return {
    deadCapHit: Math.round(deadCapHit * 10) / 10,
    capSavings: Math.round(capSavings * 10) / 10,
    netCapImpact: Math.round(netCapImpact * 10) / 10,
  };
}

// v100: 4th Down Expected Value Calculator (DeepSeek)
export function calcFourthDownEV995(yards, fieldPos, score, quarter, timeLeft) {
  var convRate;
  if (yards === 1) convRate = 0.72;
  else if (yards === 2) convRate = 0.63;
  else if (yards === 3) convRate = 0.55;
  else if (yards === 4) convRate = 0.48;
  else if (yards === 5) convRate = 0.43;
  else if (yards >= 6 && yards <= 10) convRate = 0.35;
  else if (yards >= 11 && yards <= 15) convRate = 0.22;
  else convRate = 0.14;

  var fgDistance = 100 - fieldPos + 17;
  var fgSuccess;
  if (fgDistance <= 30) fgSuccess = 0.97;
  else if (fgDistance <= 35) fgSuccess = 0.93;
  else if (fgDistance <= 40) fgSuccess = 0.87;
  else if (fgDistance <= 45) fgSuccess = 0.79;
  else if (fgDistance <= 50) fgSuccess = 0.69;
  else fgSuccess = 0.52;

  // Expected points lookup (uses getEP993 from main game — will be wired later)
  var getEP =
    typeof getEP993 !== 'undefined'
      ? getEP993
      : function () {
          return 2.5;
        };

  var epOppFail = getEP(1, 10, 100 - fieldPos);
  var convertField = fieldPos + yards;
  var epConvert;
  if (convertField >= 100) epConvert = 7;
  else epConvert = getEP(1, 10, convertField);
  var puntField = Math.max(5, Math.min(80, 100 - (fieldPos + 40)));
  var missField = Math.max(1, fieldPos - 7);
  var epOppMissFG = getEP(1, 10, 100 - missField);

  var goEV = convRate * epConvert + (1 - convRate) * -epOppFail;
  var fgEV = fgSuccess * 3 + (1 - fgSuccess) * -epOppMissFG;
  var puntEV = -getEP(1, 10, puntField);

  var isDesperate = quarter === 4 && timeLeft < 180 && score <= -8;
  var isProtecting = quarter === 4 && timeLeft < 180 && score >= 7;
  var isLateTrail = quarter === 4 && timeLeft < 420 && score < 0;
  var goAdj = 0;
  var fgAdj = 0;
  var puntAdj = 0;
  if (isDesperate) {
    goAdj += 0.75;
    fgAdj -= 0.15;
    puntAdj -= 0.5;
  }
  if (isProtecting) {
    goAdj -= 0.6;
    puntAdj += 0.35;
  }
  if (quarter === 4 && timeLeft < 180) {
    if (score <= -8) fgAdj -= 1.8;
    else if (score <= -4) fgAdj -= 1.2;
    else if (score < 0) fgAdj -= 0.6;
    if (score >= 7) fgAdj += 0.2;
  }
  if (isLateTrail) goAdj += 0.2;
  if (fieldPos <= 35 && yards >= 5) goAdj -= 0.4;
  if (fieldPos <= 35 && yards >= 8) goAdj -= 1.0;
  if (fieldPos <= 50 && yards >= 12) goAdj -= 0.6;
  if (fieldPos >= 80 && yards <= 2) goAdj += 0.35;
  if (isProtecting && fieldPos <= 60) {
    goAdj -= 0.9;
    puntAdj += 0.5;
  }
  // Own-territory short yardage (not desperate): favor punt — failed conversion
  // hands opponent excellent field position, which the flat EP fallback masks.
  if (!isDesperate && !isLateTrail && fieldPos <= 40 && yards <= 2) {
    puntAdj += 2.5;
    goAdj -= 1.5;
  }
  // Red zone trailing by a field goal in Q4: a made FG only ties — prefer TD.
  if (fieldPos >= 90 && quarter === 4 && score >= -3 && score < 0) {
    fgAdj -= 1.5;
    goAdj += 0.5;
  }

  var fgApplicable = fgDistance <= 65;
  var goEV_adj = goEV + goAdj;
  var fgEV_adj = fgApplicable ? fgEV + fgAdj : -Infinity;
  var puntEV_adj = puntEV + puntAdj;

  var bestEV = goEV_adj;
  var bestAction = 'go';
  if (fgEV_adj > bestEV) {
    bestEV = fgEV_adj;
    bestAction = 'fg';
  }
  if (puntEV_adj > bestEV) {
    bestEV = puntEV_adj;
    bestAction = 'punt';
  }

  var vals = [goEV_adj, fgEV_adj, puntEV_adj].sort(function (a, b) {
    return b - a;
  });
  var margin = vals[0] - vals[1];
  var confidence;
  if (margin > 0.75) confidence = 'clear';
  else if (margin > 0.25) confidence = 'close';
  else confidence = 'situational';

  return {
    goForIt: { ev: Math.round(goEV * 100) / 100, desc: 'Go for it' },
    fieldGoal: {
      ev: Math.round(fgEV * 100) / 100,
      desc: 'Field goal attempt',
      applicable: fgApplicable,
    },
    punt: { ev: Math.round(puntEV * 100) / 100, desc: 'Punt' },
    recommendation: bestAction,
    confidence: confidence,
  };
}
