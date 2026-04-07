/**
 * MFD Trade Value Calculator
 *
 * Simple trade/pick valuation for quick AI trade evaluation.
 * Separate from trade-math.js which handles classification, trust, decay.
 */

export function calcTradeValue(player){
  if(!player)return 0;
  var base=player.ovr*2;
  if(player.age<=24)base+=15;
  else if(player.age<=27)base+=5;
  else if(player.age>=31)base-=10;
  else if(player.age>=33)base-=25;
  if(player.pos==="QB")base+=20;
  if(player.pot&&player.pot>player.ovr)base+=(player.pot-player.ovr)*0.5;
  if(player.contract&&player.contract.salary>8)base-=(player.contract.salary-8)*2;
  return Math.max(5,Math.round(base));
}
export function calcPickValue(round,totalTeams){
  totalTeams=totalTeams||32;
  if(round===1)return 80;
  if(round===2)return 50;
  if(round===3)return 30;
  return 15;
}
export function evaluateTradePackage(myAssets,theirAssets){
  var myVal=0;var theirVal=0;
  myAssets.forEach(function(a){
    if(a.type==="player")myVal+=calcTradeValue(a.player);
    else if(a.type==="pick")myVal+=calcPickValue(a.round);
  });
  theirAssets.forEach(function(a){
    if(a.type==="player")theirVal+=calcTradeValue(a.player);
    else if(a.type==="pick")theirVal+=calcPickValue(a.round);
  });
  var diff=myVal-theirVal;
  var verdict=diff>20?"OVERPAY":diff>5?"SLIGHT_OVERPAY":diff>-5?"FAIR":diff>-20?"GOOD_DEAL":"STEAL";
  return{myVal:myVal,theirVal:theirVal,diff:diff,verdict:verdict,
    willAccept:myVal>=theirVal*0.95};// AI accepts if within 5% of fair
}
