/**
 * MFD Locker Room Events System
 *
 * 14 dynamic locker room events (automatic + player choice) that fire
 * based on team state: chemistry, morale, streaks, traits, injuries.
 * Includes crisis events with multi-option decisions.
 */
import { cl } from '../utils/index.js';
import { RNG } from '../utils/index.js';
import { hasTrait95 } from './traits.js';

export var LOCKER_EVENTS=[
  {id:"players_meeting",label:"Players-Only Meeting",icon:"🗣️",
    check:function(t){var vets=t.roster.filter(function(p){return(p.cliqueId||0)===0;});
      var avgChem=vets.length>0?vets.reduce(function(s,p){return s+(p.chemistry||60);},0)/vets.length:60;
      return avgChem<35&&vets.length>=3;},
    apply:function(t){t.roster.forEach(function(p){p.morale=cl((p.morale||70)+2,30,99);});
      t.roster.forEach(function(p){if((p.cliqueId||0)===0)p.chemistry=cl((p.chemistry||60)+4,15,100);});
      t.roster.forEach(function(p){if(p.devBonus===undefined)p.devBonus=0;p.devBonus-=1;});},
    msg:"Veterans held a players-only meeting. Morale steadied, vets bonding — but practice time lost (-1 dev this week).",color:"gold"},
  {id:"captain_rally",label:"Captain's Rally",icon:"©️",
    check:function(t){var hasCap=t.roster.some(function(p){return hasTrait95(p,"captain")||hasTrait95(p,"vocal_leader");});
      var loseStreak=Math.abs(Math.min(0,(t.streak||0)));return hasCap&&loseStreak>=2;},
    apply:function(t){t.roster.forEach(function(p){p.chemistry=cl((p.chemistry||60)+5,15,100);});},
    msg:"Captain rallied the locker room after losing streak. All cliques chemistry +5.",color:"green"},
  {id:"rookie_hazing",label:"Rookie Hazing Gone Wrong",icon:"😬",
    check:function(t){var rookies=t.roster.filter(function(p){return(p.cliqueId||0)===1;});
      var avgChem=rookies.length>0?rookies.reduce(function(s,p){return s+(p.chemistry||60);},0)/rookies.length:60;
      var hasCap=t.roster.some(function(p){return hasTrait95(p,"captain");});
      return avgChem<30&&rookies.length>=3&&!hasCap;},
    apply:function(t){t.roster.forEach(function(p){if((p.cliqueId||0)===1)p.systemFit=cl((p.systemFit||30)-2,0,100);});},
    msg:"Rookie hazing incident — Young Core systemFit dropped. A captain could prevent this.",color:"red"},
  {id:"star_demands",label:"Star Demands Spotlight",icon:"⭐",
    check:function(t){var stars=t.roster.filter(function(p){return(p.cliqueId||0)===2&&(hasTrait95(p,"ego")||hasTrait95(p,"holdout"));});
      return stars.length>=1&&(t.losses||0)>=(t.wins||0);},
    apply:function(t){t.roster.forEach(function(p){if((p.cliqueId||0)===2)p.chemistry=cl((p.chemistry||60)-3,15,100);
      if((p.cliqueId||0)!==2)p.morale=cl((p.morale||70)-1,30,99);});},
    msg:"Star player demanding more touches. Stars clique chemistry dipped, team morale slightly shaken.",color:"orange"},
  {id:"winning_culture",label:"Winning Culture Taking Hold",icon:"🏆",
    check:function(t){return(t.streak||0)>=4;},
    apply:function(t){t.roster.forEach(function(p){p.chemistry=cl((p.chemistry||60)+3,15,100);
      p.morale=cl((p.morale||70)+2,30,99);});},
    msg:"4-game win streak! Winning culture taking hold — chemistry and morale rising across the board.",color:"gold"},
  {id:"cancer_spreads",label:"Locker Room Cancer Spreads",icon:"☢️",
    check:function(t){var cancers=t.roster.filter(function(p){return hasTrait95(p,"cancer");});
      return cancers.length>=1&&(t.losses||0)>=6;},
    apply:function(t){var cancerClique=(t.roster.find(function(p){return hasTrait95(p,"cancer");})||{}).cliqueId||0;
      t.roster.forEach(function(p){if((p.cliqueId||0)===cancerClique)p.chemistry=cl((p.chemistry||60)-6,15,100);
        else p.chemistry=cl((p.chemistry||60)-2,15,100);});},
    msg:"Locker room cancer is spreading negativity. Chemistry crashing — consider cutting the source.",color:"red"},
  {id:"trade_rumors",label:"Trade Rumors Swirl",icon:"📰",
    check:function(t){return t.roster.some(function(p){return p.onBlock;})&&
      t.roster.filter(function(p){return(p.chemistry||60)<40;}).length>=2;},
    apply:function(t){t.roster.forEach(function(p){if((p.chemistry||60)<40)p.chemistry=cl((p.chemistry||60)-2,15,100);});},
    msg:"Trade rumors swirling — unhappy players growing restless. Chemistry dropping for disgruntled players.",color:"orange"},
  {id:"contract_dispute",label:"Contract Dispute",icon:"💰",
    check:function(t){return t.roster.some(function(p){return p.ovr>=82&&p.contract&&p.contract.years<=1&&p.age<=28;});},
    apply:function(t){var star=t.roster.find(function(p){return p.ovr>=82&&p.contract&&p.contract.years<=1&&p.age<=28;});
      if(star){star.chemistry=cl((star.chemistry||60)-4,15,100);star.contractDispute=true;}},
    msg:"Star player wants extension NOW — chemistry dropping until resolved. Check inbox for options.",color:"orange"},
  {id:"captain_injured",label:"Captain Sidelined",icon:"🏥",
    check:function(t){return t.roster.some(function(p){return(hasTrait95(p,"captain")||hasTrait95(p,"vocal_leader"))&&p.injury&&p.injury.games>0;});},
    apply:function(t){t.roster.forEach(function(p){p.systemFit=cl((p.systemFit||30)-1,0,100);});},
    msg:"Captain sidelined with injury — systemFit growth slowed across roster until return.",color:"red"},
  {id:"blowout_meeting",label:"Team Meeting After Blowout",icon:"📋",
    check:function(t){return(t.lastMargin||0)<=-21;},
    apply:function(t){t.roster.forEach(function(p){p.morale=cl((p.morale||70)+1,30,99);});t.blowoutMeeting=true;},
    msg:"Coaching staff called emergency meeting after blowout loss. Team refocused — morale steadied.",color:"gold"},
  {id:"media_leak",label:"Media Leak: Star Unhappy",icon:"📺",chain:"star_demands",
    check:function(t){return(t.lastEvent||"")==="star_demands"&&(t.losses||0)>=(t.wins||0)&&
      t.roster.some(function(p){return(p.cliqueId||0)===2&&(p.chemistry||60)<35;});},
    apply:function(t){t.roster.forEach(function(p){p.morale=cl((p.morale||70)-1,30,99);});
      var unhappy=t.roster.find(function(p){return(p.cliqueId||0)===2&&(p.chemistry||60)<35;});
      if(unhappy)unhappy.tradeValue=(unhappy.tradeValue||100)-10;},
    msg:"Media leaked star's unhappiness — national story. Morale dipped, trade value dropped for disgruntled star.",color:"red"},
  {id:"choice_team_meeting",label:"Call Team Meeting?",icon:"🗣️",choice:true,
    check:function(t){return(t.losses||0)>=4&&(t.streak||0)<=-2;},
    msg:"After a rough stretch, do you call a team meeting?",color:"gold",
    options:[
      {label:"📢 Call Meeting",desc:"+3 morale, but -2 chemistry risk",action:"call_meeting"},
      {label:"🤫 Stay Quiet",desc:"No change — let them figure it out",action:"stay_quiet"}
    ]},
  {id:"choice_back_star",label:"Back the Star?",icon:"⭐",choice:true,
    check:function(t){return t.roster.some(function(p){return p.contractDispute&&p.ovr>=82;});},
    msg:"Your star is unhappy about his contract. Do you publicly back him?",color:"orange",
    options:[
      {label:"💪 Back the Star",desc:"+6 star chemistry, -2 team chemistry",action:"back_star"},
      {label:"🏢 Stay Neutral",desc:"+1 team chemistry, star stays upset",action:"stay_neutral"}
    ]},
  {id:"choice_fine_conduct",label:"Fine for Conduct?",icon:"⚖️",choice:true,
    check:function(t){return t.roster.some(function(p){return hasTrait95(p,"cancer")&&(p.chemistry||60)<35;});},
    msg:"Locker room cancer caught badmouthing coaches. Fine them?",color:"red",
    options:[
      {label:"💰 Fine Player",desc:"-3 morale, +2 discipline (fewer penalties)",action:"fine_player"},
      {label:"🤝 Private Talk",desc:"+1 cancer chemistry, -1 team morale",action:"private_talk"}
    ]},
  {id:"choice_trade_demand",label:"Star Demands Trade",icon:"🚪",choice:true,
    check:function(t){return t.roster.some(function(p){return p.ovr>=85&&(p.morale||70)<40&&p.contract&&p.contract.years>=1;});},
    msg:"Your franchise star has officially requested a trade. The locker room is watching how you handle this.",color:"red",
    crisis:true,crisisTier:"URGENT",
    headline:"STAR DEMANDS OUT",
    subtext:"This will define your tenure. Handle it right or lose the locker room entirely.",
    options:[
      {label:"🔒 Lock Him In",desc:"Emergency meeting + max extension offer. +8 star morale, -$10M cap space",action:"lock_star_in"},
      {label:"📣 Go Public",desc:"Call him out publicly. Forces his hand — might resolve it or blow up badly",action:"go_public_trade"},
      {label:"📞 Listen to Offers",desc:"Tell him you'll shop him. Trade value maintained, locker room unease",action:"listen_offers"}
    ]},
  {id:"choice_faction_fight",label:"Locker Room Faction War",icon:"⚔️",choice:true,
    check:function(t){
      var vets=t.roster.filter(function(p){return p.age>=28;}).length;
      var rooks=t.roster.filter(function(p){return p.age<=23;}).length;
      var avgMorale=t.roster.reduce(function(s,p){return s+(p.morale||70);},0)/Math.max(1,t.roster.length);
      return vets>=4&&rooks>=4&&avgMorale<55&&(t.losses||0)>=4;},
    msg:"Veterans and rookies are at each other's throats. Two factions have formed and it's getting ugly in practice.",color:"orange",
    crisis:true,crisisTier:"CRITICAL",
    headline:"LOCKER ROOM CIVIL WAR",
    subtext:"Two factions. One team. Your call as head coach will determine which group rallies behind you.",
    options:[
      {label:"🧓 Back the Vets",desc:"Veteran experience stabilizes ship. Rooks morale -5, vets +8, one vet dev boost",action:"back_vets"},
      {label:"⚡ Back the Young Core",desc:"Inject energy + hunger. Vets morale -4, young core +10, one rook dev boost",action:"back_youngcore"},
      {label:"🤝 Mandatory Team Bonding",desc:"Force unity. Both groups +3 morale, -2 practice efficiency this week",action:"force_bonding"}
    ]},
  {id:"choice_fan_blowback",label:"Fan Base Turns on Team",icon:"📢",choice:true,
    check:function(t){return (t.losses||0)>=7&&(t.streak||0)<=-4;},
    msg:"Boo birds are out. Local media calling for coaching changes. Fans booing players off the field. The city has turned.",color:"red",
    crisis:true,crisisTier:"CRITICAL",
    headline:"CITY HAS TURNED",
    subtext:"Losing streaks kill fan bases. How you respond to public pressure will echo through your dynasty.",
    options:[
      {label:"🎙️ Hold Press Conference",desc:"Face the music. +5 owner confidence, team morale -2 but respect earned",action:"face_music"},
      {label:"🚪 Close the Doors",desc:"Shut out media. Focus internally. Team morale +3, owner confidence -3",action:"close_doors"},
      {label:"🔥 Shake Up the Depth Chart",desc:"Bench struggling starters. Shock the system — some thrive, some crack",action:"shake_depth"}
    ]},
  {id:"choice_redemption_moment",label:"Redemption Arc Moment",icon:"✨",choice:true,
    check:function(t){
      var hasSlump=t.roster.some(function(p){return p._arcState==="SLUMP"&&(p.morale||70)<50&&p.ovr>=78;});
      var winStreak=(t.streak||0)>=3;
      return hasSlump&&winStreak;},
    msg:"A struggling star is on the brink of a redemption moment. Three-game win streak has the city buzzing again. Do you give them the spotlight?",color:"gold",
    crisis:true,crisisTier:"OPPORTUNITY",
    headline:"REDEMPTION ON THE LINE",
    subtext:"This is a franchise-defining moment. The right call could create a legend.",
    options:[
      {label:"🌟 Give Them the Spotlight",desc:"Feature them this week. If they deliver: +15 morale, arc resets to ELITE",action:"redemption_spotlight"},
      {label:"📊 Ease Them Back Slowly",desc:"Protect their confidence. Steady +5 morale over 3 weeks, safer floor",action:"redemption_slow"},
      {label:"🔄 Let It Happen Organically",desc:"No spotlight, no pressure. Natural arc resolution, lower peak",action:"redemption_organic"}
    ]}
];
export function checkLockerEvents(team,isUser){
  var triggered=null;
  for(var i=0;i<LOCKER_EVENTS.length;i++){
    var ev=LOCKER_EVENTS[i];
    if(ev.chain){
      if((team.lastEvent||"")===ev.chain&&ev.check(team)&&RNG.ai()<0.45){
        ev.apply(team);triggered=ev;break;
      }
      continue;
    }
    if(ev.choice){
      if(ev.check(team)&&RNG.ai()<0.30){
        triggered=ev;break;
      }
      continue;
    }
    if(ev.check(team)&&RNG.ai()<0.35){
      ev.apply(team);triggered=ev;break;
    }
  }
  team.lastEvent=triggered?triggered.id:"";
  return triggered;
}
