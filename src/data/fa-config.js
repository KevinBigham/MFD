/**
 * MFD Free Agency Configuration
 *
 * Tiers, phases, role pitches, RFA tenders, market value calculation,
 * and priority tags for the free agency system.
 */

export var FA_TIERS={
  ELITE:{label:"Elite",emoji:"👑",minOvr:78,rounds:3,color:"#fbbf24",aiCompetition:0.85},
  SOLID:{label:"Solid",emoji:"⭐",minOvr:70,rounds:2,color:"#60a5fa",aiCompetition:0.55},
  DEPTH:{label:"Depth",emoji:"🔧",minOvr:60,rounds:1,color:"#a1a1aa",aiCompetition:0.30},
  CAMP:{label:"Camp Body",emoji:"📋",minOvr:0,rounds:0,color:"#52525b",aiCompetition:0.05}
};

export function getFATier(ovr){if(ovr>=78)return FA_TIERS.ELITE;if(ovr>=70)return FA_TIERS.SOLID;if(ovr>=60)return FA_TIERS.DEPTH;return FA_TIERS.CAMP;}

export var FA_PHASES={
  TAMPERING:{id:"tampering",label:"Legal Tampering",icon:"👀",desc:"Express interest. No binding offers yet."},
  OPEN:{id:"open",label:"FA Opens",icon:"🏪",desc:"Bidding is live. Place offers on targets."},
  SETTLING:{id:"settling",label:"Market Settling",icon:"📉",desc:"Remaining FAs accept best offer or wait."}
};

export var FA_ROLE_PITCH={
  STARTER:{id:"starter",label:"Day 1 Starter",icon:"🏈",weight:1.20},
  ROTATION:{id:"rotation",label:"Rotation Piece",icon:"🔄",weight:1.00},
  BACKUP:{id:"backup",label:"Quality Backup",icon:"📋",weight:0.85},
  DEPTH:{id:"depth",label:"Depth / ST",icon:"🔧",weight:0.70}
};

export var RFA_TENDERS={
  FIRST:{id:"first",label:"1st Round Tender",salary:8.0,compRound:1},
  SECOND:{id:"second",label:"2nd Round Tender",salary:5.5,compRound:2},
  ORIGINAL:{id:"original",label:"Original Round",salary:3.0,compRound:4}
};

export var FA_MARKET_VALUE={
  scarcity:{QB:1.8,DL:1.3,CB:1.25,WR:1.15,OL:1.2,LB:1.1,RB:0.85,TE:1.0,S:1.05,K:0.5,P:0.4},
  ageMod:function(age){if(age<=25)return 1.15;if(age<=27)return 1.05;if(age<=29)return 0.95;if(age<=31)return 0.80;return 0.60;},
  calc:function(player,interestedCount){
    var base=Math.max(1,Math.round(player.ovr*0.12*10)/10);
    var scar=FA_MARKET_VALUE.scarcity[player.pos]||1.0;
    var ageMd=FA_MARKET_VALUE.ageMod(player.age);
    var demand=1.0+Math.min(0.5,(interestedCount||0)*0.08);
    return Math.round(base*scar*ageMd*demand*10)/10;
  }
};

export var FA_PRIORITY_TAGS=["💰 Money","💍 Ring Chase","📋 Role","🏠 Hometown","🎓 Coach","🧬 Scheme Fit"];
