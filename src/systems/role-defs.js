/**
 * MFD Player Role Definitions
 *
 * Defines positional roles (RB1/3rd-down/goal-line, WR X/Slot/Deep, etc.)
 * with snap percentages. Manages role assignment and stability tracking.
 */

export var ROLE_DEFS={
  RB:[{id:"rb1",label:"RB1 (Bellcow)",snapPct:65},{id:"3rd_down",label:"3rd Down Back",snapPct:25},{id:"goal_line",label:"Goal Line",snapPct:10}],
  WR:[{id:"wr_x",label:"X (Outside)",snapPct:45},{id:"wr_slot",label:"Slot",snapPct:35},{id:"wr_deep",label:"Deep Threat",snapPct:20}],
  DL:[{id:"pass_rush",label:"Pass Rusher",snapPct:55},{id:"run_stop",label:"Run Stopper",snapPct:45}],
  LB:[{id:"pass_rush_lb",label:"Blitzer",snapPct:40},{id:"coverage_lb",label:"Coverage",snapPct:35},{id:"run_stop_lb",label:"Run Stopper",snapPct:25}]
};
export function assignDefaultRoles(roster){
  var byPos={};roster.forEach(function(p){if(!byPos[p.pos])byPos[p.pos]=[];byPos[p.pos].push(p);});
  ["RB","WR","DL","LB"].forEach(function(pos){
    var players=(byPos[pos]||[]).filter(function(p){return !(p.injury&&p.injury.games>0);}).sort(function(a,b){return b.ovr-a.ovr;});
    var roles=ROLE_DEFS[pos];if(!roles||!players.length)return;
    players.forEach(function(p,i){
      var newRole=i<roles.length?roles[i].id:roles[roles.length-1].id;
      if(p.role===newRole){p.roleWeeks=(p.roleWeeks||0)+1;}
      else{p.role=newRole;p.roleWeeks=0;}
    });
  });
}
export function getRoleSnapPct(pos,roleId){
  var roles=ROLE_DEFS[pos];if(!roles)return 100;
  var r=roles.find(function(d){return d.id===roleId;});
  return r?r.snapPct:50;
}
