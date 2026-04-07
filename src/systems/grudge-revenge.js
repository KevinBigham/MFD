/**
 * MFD Grudge Match & Revenge Game Systems
 *
 * GRUDGE_MATCH: Player revenge narratives vs former teams.
 * REVENGE_GAME: Rivalry-driven revenge game detection and bonuses.
 */

export var GRUDGE_MATCH={
  markGrudge:function(player,formerTeamId,reason){if(!player)return;player.grudge80={formerTeamId:formerTeamId,reason:reason,weeksActive:0,torched:false};},
  isGrudgeGame:function(player,homeTeamId,awayTeamId){if(!player||!player.grudge80)return false;return player.grudge80.formerTeamId===homeTeamId||player.grudge80.formerTeamId===awayTeamId;},
  applyBoost:function(player){
    if(!player||!player.grudge80)return player;
    var boosted=Object.assign({},player);
    boosted.ovr=Math.min(99,boosted.ovr+8);
    if(boosted.ratings){boosted.ratings=Object.assign({},boosted.ratings);Object.keys(boosted.ratings).forEach(function(k){boosted.ratings[k]=Math.min(99,(boosted.ratings[k]||60)+5);});}
    boosted._grudgeActive=true;
    return boosted;
  },
  resolve:function(player,playerStats,wasGoodGame,formerTeamAbbr){
    if(!player||!player.grudge80)return null;
    player.grudge80.weeksActive=(player.grudge80.weeksActive||0)+1;
    if(wasGoodGame&&!player.grudge80.torched){player.grudge80.torched=true;return{torched:true,name:player.name,pos:player.pos,abbr:formerTeamAbbr,stats:playerStats};}
    if(player.grudge80.weeksActive>34||player.grudge80.torched)delete player.grudge80;
    return null;
  }
};
export var REVENGE_GAME={
  check:function(teamA,teamB,rivalries){
    if(!rivalries||!teamA||!teamB)return null;
    var riv=null;
    (rivalries||[]).forEach(function(r){
      if(!r)return;
      var isMatch=(r.teamA===teamA.id&&r.teamB===teamB.id)||(r.teamA===teamB.id&&r.teamB===teamA.id);
      if(isMatch)riv=r;
    });
    if(!riv)return null;
    var hist=riv.history||{};
    var aLostLast=hist.lastResult&&hist.lastResult.loserId===teamA.id;
    var bLostLast=hist.lastResult&&hist.lastResult.loserId===teamB.id;
    var streak=hist.streak||0;
    var result=null;
    if(aLostLast&&Math.abs(streak)>=2){
      result={revengeTeam:teamA.id,revengeAbbr:teamA.abbr,revengeIcon:teamA.icon,
        streak:Math.abs(streak),heat:riv.heat||0,bonus:Math.min(5,Math.abs(streak))};
    }else if(bLostLast&&Math.abs(streak)>=2){
      result={revengeTeam:teamB.id,revengeAbbr:teamB.abbr,revengeIcon:teamB.icon,
        streak:Math.abs(streak),heat:riv.heat||0,bonus:Math.min(5,Math.abs(streak))};
    }
    if(!result&&(riv.heat||0)>=50){
      result={revengeTeam:null,isHeatRivalry:true,heat:riv.heat,bonus:2,
        label:"🔥 HEATED RIVALRY"};
    }
    return result;
  },
  getBonus:function(revengeInfo,teamId){
    if(!revengeInfo)return 0;
    if(revengeInfo.revengeTeam===teamId)return revengeInfo.bonus||0;
    if(revengeInfo.isHeatRivalry)return revengeInfo.bonus||0;
    return 0;
  }
};
