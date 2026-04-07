/**
 * MFD Draft Commentary
 *
 * Round/OVR-based draft pick commentary lines.
 */

export var DRAFT_COMMENTARY={
  r1elite:"Elite talent off the board. That franchise just got better overnight.",
  r1solid:"Day 1 starter. Their staff loved him at the combine.",
  r1value:"Interesting pick. Could be a steal if he develops.",
  r2steal:"Steal of the draft? Scouts had him going much higher.",
  r2solid:"Solid Day 2 pick. Fills a need immediately.",
  r2depth:"Good value in Round 2. Fits their system.",
  r3plus:"Day 3 find. Depth pick with some upside.",
  r3gem:"Hidden gem alert — this kid was on nobody's radar.",
  fallback:"The pick is in."
};
export function getDraftCommentary(round,ovr){
  var r=round||1;var o=ovr||65;
  if(r===1){
    if(o>=80)return DRAFT_COMMENTARY.r1elite;
    if(o>=72)return DRAFT_COMMENTARY.r1solid;
    return DRAFT_COMMENTARY.r1value;
  }
  if(r===2){
    if(o>=72)return DRAFT_COMMENTARY.r2steal;
    if(o>=66)return DRAFT_COMMENTARY.r2solid;
    return DRAFT_COMMENTARY.r2depth;
  }
  if(o>=68)return DRAFT_COMMENTARY.r3gem;
  return DRAFT_COMMENTARY.r3plus;
}
