/**
 * MFD Practice Focus & Captain Moments
 *
 * Weekly practice focus options (scout, dev, recovery, pads)
 * and captain moment types (calm drive, big stop, clutch convert).
 */

export var PRACTICE_FOCUS=[
  {id:"scout",label:"🔍 Opponent Scout",desc:"+system knowledge (fastest) · fewer turnovers & stalls",
    fx:{dev:0,injuryRisk:0,system:0.08,morale:0}},
  {id:"dev",label:"📈 Development Camp",desc:"+player growth · no system knowledge gain",
    fx:{dev:0.12,injuryRisk:0,system:0,morale:0}},
  {id:"recovery",label:"🧊 Recovery Week",desc:"-injury risk, +morale · no system knowledge gain",
    fx:{dev:0,injuryRisk:-0.10,system:0,morale:0.02}},
  {id:"pads",label:"💪 Full Pads",desc:"+dev, +system knowledge (moderate)",
    fx:{dev:0.04,injuryRisk:0,system:0.04,morale:0}}
];
export var CAPTAIN_RULES={eligibleMinOvr:70,clutchDriveMin:9,scoreDiffMax:10,triggersPerSeason:3};
export var CAPTAIN_MOMENT_TYPES=[
  {id:"calm_drive",label:"Calm Drive",emoji:"🧊",desc:"Captain settled the offense — turnover risk dropped",
    fx:{intReduction:0.06,fumbleReduction:0.03}},
  {id:"big_stop",label:"Big Stop",emoji:"🛑",desc:"Captain rallied the defense — pressure surge",
    fx:{pressureBoost:0.10,coverageBoost:0.04}},
  {id:"clutch_convert",label:"Clutch Convert",emoji:"⚡",desc:"Captain willed the team forward — scoring boost",
    fx:{scoringBoost:8}}
];
