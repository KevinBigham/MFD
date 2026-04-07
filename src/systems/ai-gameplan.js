/**
 * MFD AI Gameplan Pickers
 *
 * Pure logic functions that auto-select offensive and defensive
 * gameplans for AI teams based on roster composition (OVR by position).
 */

export function aiPickOffGPPreview(t){
  if(t.gameplanOff) return t.gameplanOff;
  var gGp=function(roster,pos){return roster.filter(function(p){return pos.indexOf(p.pos)>=0&&!(p.injury&&p.injury.games>0);});};
  var qbs=gGp(t.roster,["QB"]);var rbs=gGp(t.roster,["RB"]);var wrs=gGp(t.roster,["WR","TE"]);
  var qbOvr=qbs.length?qbs[0].ovr:50;var rbOvr=rbs.length?rbs[0].ovr:50;
  var wrOvr=wrs.length?Math.round(wrs.slice(0,3).reduce(function(s,p){return s+p.ovr;},0)/Math.min(3,wrs.length)):50;
  if(qbOvr>=78&&wrOvr>=74) return "air_raid";
  if(rbOvr>=78&&qbOvr<72) return "ground_pound";
  if(qbOvr>=76&&rbOvr>=72) return "play_action";
  if(qbOvr>=74) return "west_coast";
  return "balanced_o";
}

export function aiPickDefGPPreview(t){
  if(t.gameplanDef) return t.gameplanDef;
  var gGp=function(roster,pos){return roster.filter(function(p){return pos.indexOf(p.pos)>=0&&!(p.injury&&p.injury.games>0);});};
  var dls=gGp(t.roster,["DL","LB"]);var cbs=gGp(t.roster,["CB","S"]);
  var dlOvr=dls.length?Math.round(dls.slice(0,5).reduce(function(s,p){return s+p.ovr;},0)/Math.min(5,dls.length)):50;
  var cbOvr=cbs.length?Math.round(cbs.slice(0,3).reduce(function(s,p){return s+p.ovr;},0)/Math.min(3,cbs.length)):50;
  if(dlOvr>=78&&cbOvr<70) return "blitz_heavy";
  if(cbOvr>=78) return "man_press";
  if(dlOvr>=76) return "run_stuff";
  if(cbOvr>=74&&dlOvr<72) return "zone_cov";
  return "balanced_d";
}
