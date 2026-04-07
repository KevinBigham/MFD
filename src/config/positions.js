/**
 * MFD Position Definitions & Rating Labels
 *
 * Defines all 11 positions with their rating attributes, weights,
 * side (O/D/K), and category groupings for UI display.
 *
 * POS_DEF[pos].r  — array of 20 rating names
 * POS_DEF[pos].w  — parallel array of weights for OVR calc
 * POS_DEF[pos].side — "O", "D", or "K"
 * POS_DEF[pos].cat — {category: [rating names]} for UI grouping
 */

export var POS_DEF = {
  QB: {
    r: [
      'arm', 'accuracy', 'awareness', 'speed', 'toughness',
      'throwOnRun', 'shortAccuracy', 'deepAccuracy', 'release', 'pocketPresence',
      'acceleration', 'agility', 'strength', 'stamina', 'clutch',
      'leadership', 'scramble', 'playRecognition', 'decisionSpeed', 'fieldVision',
    ],
    w: [10, 10, 10, 3, 6, 6, 6, 6, 6, 10, 1, 3, 1, 3, 6, 3, 3, 6, 6, 3],
    side: 'O',
    cat: {
      PHY: ['speed', 'acceleration', 'agility', 'strength', 'stamina', 'toughness'],
      THROW: ['arm', 'accuracy', 'shortAccuracy', 'deepAccuracy', 'throwOnRun', 'release'],
      MENTAL: ['awareness', 'pocketPresence', 'playRecognition', 'decisionSpeed', 'fieldVision', 'clutch'],
      INTANG: ['leadership', 'scramble'],
    },
  },
  RB: {
    r: [
      'speed', 'power', 'elusiveness', 'catching', 'blocking',
      'acceleration', 'agility', 'strength', 'stamina', 'toughness',
      'ballCarrierVision', 'breakTackle', 'stiffArm', 'truckPower', 'routeRunning',
      'passProtection', 'awareness', 'clutch', 'durability', 'changeOfDirection',
    ],
    w: [10, 10, 10, 3, 3, 6, 6, 3, 6, 3, 10, 6, 3, 6, 1, 1, 6, 3, 3, 6],
    side: 'O',
    cat: {
      PHY: ['speed', 'acceleration', 'agility', 'strength', 'stamina', 'toughness', 'durability'],
      RUSH: ['power', 'elusiveness', 'ballCarrierVision', 'breakTackle', 'stiffArm', 'truckPower', 'changeOfDirection'],
      REC: ['catching', 'routeRunning'],
      MENTAL: ['awareness', 'clutch', 'blocking', 'passProtection'],
    },
  },
  WR: {
    r: [
      'speed', 'catching', 'routeRunning', 'release', 'awareness',
      'acceleration', 'agility', 'strength', 'stamina', 'jumping',
      'catchInTraffic', 'spectacularCatch', 'shortRoute', 'deepRoute', 'separation',
      'yacAbility', 'breakTackle', 'runBlocking', 'playRecognition', 'clutch',
    ],
    w: [10, 10, 10, 6, 6, 6, 3, 1, 3, 3, 6, 3, 6, 6, 10, 6, 1, 1, 3, 3],
    side: 'O',
    cat: {
      PHY: ['speed', 'acceleration', 'agility', 'strength', 'stamina', 'jumping'],
      REC: ['catching', 'catchInTraffic', 'spectacularCatch', 'routeRunning', 'release', 'separation'],
      ROUTE: ['shortRoute', 'deepRoute', 'yacAbility', 'breakTackle'],
      MENTAL: ['awareness', 'playRecognition', 'clutch', 'runBlocking'],
    },
  },
  TE: {
    r: [
      'catching', 'blocking', 'speed', 'routeRunning', 'toughness',
      'acceleration', 'agility', 'strength', 'stamina', 'jumping',
      'catchInTraffic', 'runBlocking', 'passProtection', 'impactBlocking', 'breakTackle',
      'awareness', 'playRecognition', 'clutch', 'release', 'ballCarrierVision',
    ],
    w: [10, 10, 6, 6, 3, 3, 3, 6, 3, 3, 6, 10, 6, 6, 1, 6, 3, 3, 3, 1],
    side: 'O',
    cat: {
      PHY: ['speed', 'acceleration', 'agility', 'strength', 'stamina', 'toughness', 'jumping'],
      REC: ['catching', 'catchInTraffic', 'routeRunning', 'release', 'ballCarrierVision', 'breakTackle'],
      BLOCK: ['blocking', 'runBlocking', 'passProtection', 'impactBlocking'],
      MENTAL: ['awareness', 'playRecognition', 'clutch'],
    },
  },
  OL: {
    r: [
      'passBlock', 'runBlock', 'strength', 'awareness', 'toughness',
      'acceleration', 'agility', 'speed', 'stamina', 'impactBlocking',
      'pullBlock', 'footwork', 'handTechnique', 'anchorStrength', 'runBlockFinesse',
      'passBlockFinesse', 'playRecognition', 'clutch', 'durability', 'assignmentIQ',
    ],
    w: [10, 10, 10, 6, 6, 1, 3, 1, 6, 6, 3, 6, 6, 10, 3, 3, 6, 3, 3, 6],
    side: 'O',
    cat: {
      PHY: ['strength', 'speed', 'acceleration', 'agility', 'stamina', 'toughness', 'durability'],
      PASS: ['passBlock', 'passBlockFinesse', 'anchorStrength', 'handTechnique', 'footwork'],
      RUN: ['runBlock', 'runBlockFinesse', 'impactBlocking', 'pullBlock'],
      MENTAL: ['awareness', 'playRecognition', 'clutch', 'assignmentIQ'],
    },
  },
  DL: {
    r: [
      'passRush', 'runStop', 'strength', 'speed', 'toughness',
      'acceleration', 'agility', 'stamina', 'powerMoves', 'finesseMoves',
      'bullRush', 'handUsage', 'blockShedding', 'pursuit', 'awareness',
      'playRecognition', 'clutch', 'durability', 'motorEffort', 'tackling',
    ],
    w: [10, 10, 10, 6, 3, 6, 3, 6, 6, 6, 3, 6, 6, 6, 3, 3, 3, 3, 6, 1],
    side: 'D',
    cat: {
      PHY: ['strength', 'speed', 'acceleration', 'agility', 'stamina', 'toughness', 'durability'],
      RUSH: ['passRush', 'powerMoves', 'finesseMoves', 'bullRush', 'handUsage'],
      RUN: ['runStop', 'blockShedding', 'pursuit', 'tackling', 'motorEffort'],
      MENTAL: ['awareness', 'playRecognition', 'clutch'],
    },
  },
  LB: {
    r: [
      'tackle', 'coverage', 'speed', 'awareness', 'passRush',
      'acceleration', 'agility', 'strength', 'stamina', 'toughness',
      'zoneCoverage', 'manCoverage', 'pursuit', 'blockShedding', 'hitPower',
      'playRecognition', 'clutch', 'jumping', 'ballSkills', 'motorEffort',
    ],
    w: [10, 6, 10, 6, 6, 6, 3, 3, 6, 3, 6, 3, 6, 3, 6, 6, 3, 3, 3, 3],
    side: 'D',
    cat: {
      PHY: ['speed', 'acceleration', 'agility', 'strength', 'stamina', 'toughness', 'jumping'],
      RUSH: ['passRush', 'blockShedding', 'hitPower', 'pursuit', 'motorEffort'],
      COV: ['coverage', 'zoneCoverage', 'manCoverage', 'ballSkills'],
      MENTAL: ['awareness', 'playRecognition', 'clutch', 'tackle'],
    },
  },
  CB: {
    r: [
      'coverage', 'speed', 'awareness', 'tackling', 'ballSkills',
      'acceleration', 'agility', 'strength', 'stamina', 'jumping',
      'manCoverage', 'zoneCoverage', 'pressAbility', 'hitPower', 'pursuit',
      'playRecognition', 'clutch', 'catchup', 'breakOnBall', 'discipline',
    ],
    w: [10, 10, 6, 3, 6, 10, 6, 1, 3, 3, 10, 6, 6, 1, 3, 6, 3, 6, 6, 3],
    side: 'D',
    cat: {
      PHY: ['speed', 'acceleration', 'agility', 'strength', 'stamina', 'jumping'],
      COV: ['coverage', 'manCoverage', 'zoneCoverage', 'pressAbility', 'breakOnBall', 'catchup'],
      BALL: ['ballSkills', 'discipline', 'pursuit', 'hitPower', 'tackling'],
      MENTAL: ['awareness', 'playRecognition', 'clutch'],
    },
  },
  S: {
    r: [
      'coverage', 'tackling', 'speed', 'awareness', 'ballSkills',
      'acceleration', 'agility', 'strength', 'stamina', 'toughness',
      'jumping', 'zoneCoverage', 'manCoverage', 'hitPower', 'pursuit',
      'blockShedding', 'playRecognition', 'clutch', 'rangeAbility', 'runSupport',
    ],
    w: [10, 6, 10, 6, 6, 6, 3, 3, 3, 3, 3, 6, 3, 6, 6, 3, 6, 3, 10, 6],
    side: 'D',
    cat: {
      PHY: ['speed', 'acceleration', 'agility', 'strength', 'stamina', 'toughness', 'jumping'],
      COV: ['coverage', 'zoneCoverage', 'manCoverage', 'rangeAbility', 'ballSkills'],
      RUN: ['tackling', 'hitPower', 'pursuit', 'blockShedding', 'runSupport'],
      MENTAL: ['awareness', 'playRecognition', 'clutch'],
    },
  },
  K: {
    r: [
      'kickPower', 'accuracy', 'clutch', 'consistency', 'awareness',
      'stamina', 'confidence', 'shortRange', 'medRange', 'longRange',
      'direction', 'hangTime', 'touchback', 'onsideKick', 'weatherResist',
      'acceleration', 'agility', 'toughness', 'fieldGoalIQ', 'iceVeins',
    ],
    w: [10, 10, 6, 10, 3, 3, 6, 6, 6, 6, 3, 3, 1, 1, 1, 1, 1, 1, 3, 6],
    side: 'K',
    cat: {
      PHY: ['stamina', 'acceleration', 'agility', 'toughness'],
      KICK: ['kickPower', 'accuracy', 'shortRange', 'medRange', 'longRange', 'direction', 'hangTime', 'touchback'],
      MENTAL: ['clutch', 'consistency', 'awareness', 'confidence', 'iceVeins', 'fieldGoalIQ'],
      SPECIAL: ['onsideKick', 'weatherResist'],
    },
  },
  P: {
    r: [
      'kickPower', 'accuracy', 'consistency', 'awareness', 'clutch',
      'stamina', 'hangTime', 'directional', 'coffeeCorner', 'speed',
      'agility', 'tackling', 'toughness', 'confidence', 'weatherResist',
      'netPunt', 'pinPoint', 'coverage', 'fieldSense', 'insideThe20',
    ],
    w: [10, 10, 10, 3, 3, 3, 6, 6, 6, 1, 1, 1, 1, 3, 1, 6, 6, 3, 3, 10],
    side: 'K',
    cat: {
      PHY: ['speed', 'agility', 'stamina', 'toughness', 'tackling'],
      PUNT: ['kickPower', 'accuracy', 'hangTime', 'directional', 'coffeeCorner', 'netPunt', 'pinPoint', 'insideThe20'],
      MENTAL: ['consistency', 'awareness', 'clutch', 'confidence', 'fieldSense'],
      SPECIAL: ['coverage', 'weatherResist'],
    },
  },
};

// 3-letter abbreviations for all rating names (used in UI)
export var RATING_LABELS = {
  arm: 'ARM', accuracy: 'ACC', awareness: 'AWR', speed: 'SPD', toughness: 'TGH',
  throwOnRun: 'TOR', shortAccuracy: 'SAC', deepAccuracy: 'DAC', release: 'REL', pocketPresence: 'PKT',
  acceleration: 'ACL', agility: 'AGI', strength: 'STR', stamina: 'STA', clutch: 'CLT',
  leadership: 'LDR', scramble: 'SCR', playRecognition: 'PRE', decisionSpeed: 'DCS', fieldVision: 'FVS',
  power: 'PWR', elusiveness: 'ELU', catching: 'CTH', blocking: 'BLK',
  ballCarrierVision: 'BCV', breakTackle: 'BTK', stiffArm: 'SFA', truckPower: 'TRK', routeRunning: 'RTE',
  passProtection: 'PPR', durability: 'DUR', changeOfDirection: 'COD',
  jumping: 'JMP', catchInTraffic: 'CIT', spectacularCatch: 'SPC', shortRoute: 'SRT', deepRoute: 'DRT',
  separation: 'SEP', yacAbility: 'YAC', runBlocking: 'RBK',
  impactBlocking: 'IMP', passBlock: 'PBK', runBlock: 'RBL',
  pullBlock: 'PUL', footwork: 'FTW', handTechnique: 'HND', anchorStrength: 'ANC',
  runBlockFinesse: 'RBF', passBlockFinesse: 'PBF', assignmentIQ: 'AIQ',
  passRush: 'PRS', runStop: 'RST', powerMoves: 'PMV', finesseMoves: 'FMV', bullRush: 'BUL',
  handUsage: 'HUS', blockShedding: 'BSH', pursuit: 'PUR', motorEffort: 'MOT', tackling: 'TKL',
  tackle: 'TKL', coverage: 'COV', zoneCoverage: 'ZCV', manCoverage: 'MCV', hitPower: 'HIT',
  ballSkills: 'BSK', pressAbility: 'PRA', catchup: 'CUP', breakOnBall: 'BOB', discipline: 'DSC',
  rangeAbility: 'RNG', runSupport: 'RSP',
  kickPower: 'KPW', consistency: 'CON', confidence: 'CNF', shortRange: 'SRG', medRange: 'MRG',
  longRange: 'LRG', direction: 'DIR', hangTime: 'HNG', touchback: 'TBK', onsideKick: 'ONS',
  weatherResist: 'WTH', fieldGoalIQ: 'FIQ', iceVeins: 'ICE',
  directional: 'DIR', coffeeCorner: 'CFC', netPunt: 'NET', pinPoint: 'PIN', fieldSense: 'FSN', insideThe20: 'I20',
};

// Derived: list of all position keys
export var ALL_POSITIONS = Object.keys(POS_DEF);
export var OFF_POSITIONS = ALL_POSITIONS.filter(function (p) { return POS_DEF[p].side === 'O'; });
export var DEF_POSITIONS = ALL_POSITIONS.filter(function (p) { return POS_DEF[p].side === 'D'; });
export var SPEC_POSITIONS = ALL_POSITIONS.filter(function (p) { return POS_DEF[p].side === 'K'; });
