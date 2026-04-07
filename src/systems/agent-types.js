/**
 * MFD Agent Types
 *
 * Player agent personality types that influence free agency decisions.
 * Each type has different weights for money, winning, loyalty, and rings.
 */

export var AGENT_TYPES=[
  {id:"loyal",name:"Loyal Lifer",emoji:"🏠",desc:"Stays where they are if the money is close",
    moneyWeight:0.3,winWeight:0.3,loyaltyWeight:0.8,ringWeight:0.2},
  {id:"mercenary",name:"Show Me the Money",emoji:"💰",desc:"Always takes the highest offer",
    moneyWeight:0.95,winWeight:0.1,loyaltyWeight:0.05,ringWeight:0.1},
  {id:"ring_chaser",name:"Ring Chaser",emoji:"💍",desc:"Will take a discount to join a contender",
    moneyWeight:0.2,winWeight:0.9,loyaltyWeight:0.1,ringWeight:0.95},
  {id:"hometown",name:"Hometown Hero",emoji:"🏟️",desc:"Heavily favors returning to original team",
    moneyWeight:0.4,winWeight:0.2,loyaltyWeight:0.95,ringWeight:0.15},
  {id:"spotlight",name:"Spotlight Seeker",emoji:"📺",desc:"Wants a big market and a big role",
    moneyWeight:0.5,winWeight:0.3,loyaltyWeight:0.1,ringWeight:0.3}
];
export function assignAgentType(player,rng2){
  if(player.agentType)return player.agentType;
  var r=rng2();
  if(player.age>=31)return r<0.35?"ring_chaser":r<0.55?"mercenary":r<0.75?"loyal":r<0.9?"hometown":"spotlight";
  if(player.age>=28)return r<0.25?"mercenary":r<0.45?"loyal":r<0.6?"ring_chaser":r<0.8?"hometown":"spotlight";
  return r<0.3?"mercenary":r<0.5?"spotlight":r<0.65?"loyal":r<0.8?"hometown":"ring_chaser";
}
export function getAgentTypeObj(typeId){
  return AGENT_TYPES.find(function(a){return a.id===typeId;})||AGENT_TYPES[0];
}
