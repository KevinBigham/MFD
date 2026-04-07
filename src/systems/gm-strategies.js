/**
 * MFD GM Strategy System
 *
 * Three GM strategies (rebuild, contend, balanced) with
 * trade posture, youth bias, cap mode, and roster effects.
 */

export var GM_STRATEGIES={
  rebuild:{id:"rebuild",label:"🔨 Rebuild Mode",desc:"Shop veterans, favor youth + picks, maximize cap flexibility",
    tradePosture:"seller",youthBias:true,capMode:"flexible",
    effects:function(team){
      team.gmStrategy="rebuild";
      team.roster.forEach(function(p){
        if(p.age>=28&&p.ovr>=72)p.tradeBlock=true;
        else p.tradeBlock=false;
      });
    }},
  contend:{id:"contend",label:"🏆 Contend Mode",desc:"Buy rentals, favor high OVR, accept cap pain for wins now",
    tradePosture:"buyer",youthBias:false,capMode:"aggressive",
    effects:function(team){
      team.gmStrategy="contend";
      team.roster.forEach(function(p){
        p.tradeBlock=false;
        if(p.ovr<65&&p.age>=26)p.tradeBlock=true;// Underperforming vets expendable
      });
    }},
  neutral:{id:"neutral",label:"⚖️ Balanced",desc:"No strong lean — evaluate opportunities case by case",
    tradePosture:"neutral",youthBias:false,capMode:"balanced",
    effects:function(team){
      team.gmStrategy="neutral";
      team.roster.forEach(function(p){p.tradeBlock=false;});
    }}
};
export function applyGMStrategy(team,strategyId){
  var strat=GM_STRATEGIES[strategyId];
  if(!strat)return;
  strat.effects(team);
  return strat;
}
