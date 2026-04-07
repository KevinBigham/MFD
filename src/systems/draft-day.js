/**
 * MFD Draft Day Systems
 *
 * Prospect character assignment, bust/steal probability calculation,
 * draft day trade-up logic, and draft evaluation comparison.
 */
import { RNG } from '../utils/index.js';

export var PROSPECT_CHARACTER={
  types:[
    {id:"leader",label:"Leader",icon:"👑",effect:"team",desc:"Natural captain. Lifts teammates' morale.",weight:8},
    {id:"film_junkie",label:"Film Junkie",icon:"📽️",effect:"dev",desc:"Studies obsessively. Faster development.",weight:10},
    {id:"raw_talent",label:"Raw Talent",icon:"💎",effect:"ceiling",desc:"Incredible physical tools but needs coaching.",weight:7},
    {id:"pro_ready",label:"Pro Ready",icon:"🎓",effect:"floor",desc:"Polished technique. Can start Day 1.",weight:8},
    {id:"boom_or_bust",label:"Boom or Bust",icon:"💥",effect:"variance",desc:"Could be All-Pro or out of the league in 3 years.",weight:6},
    {id:"injury_prone",label:"Injury Prone",icon:"🩹",effect:"health",desc:"Concerning medical history. Higher injury risk.",weight:5},
    {id:"character_concern",label:"Character Concern",icon:"🚩",effect:"risk",desc:"Off-field issues. May affect locker room.",weight:4},
    {id:"small_school",label:"Small School Gem",icon:"🏫",effect:"hidden",desc:"Dominated weaker competition. Pro translation uncertain.",weight:6},
    {id:"workout_warrior",label:"Workout Warrior",icon:"🏋️",effect:"combine",desc:"Elite combine numbers may not translate to game performance.",weight:5},
    {id:"football_iq",label:"High Football IQ",icon:"🧠",effect:"mental",desc:"Exceptional processing speed and awareness.",weight:8}
  ],
  assign:function(prospect,tierStr){
    var types=PROSPECT_CHARACTER.types;
    var pool=[];
    types.forEach(function(t){
      var w=t.weight;
      if(tierStr==="star"&&(t.id==="leader"||t.id==="pro_ready"||t.id==="film_junkie"))w+=4;
      if(tierStr==="bad"&&(t.id==="character_concern"||t.id==="boom_or_bust"||t.id==="small_school"))w+=3;
      if(tierStr==="avg"&&(t.id==="raw_talent"||t.id==="workout_warrior"))w+=2;
      for(var i=0;i<w;i++)pool.push(t);
    });
    return pool[Math.floor(RNG.draft()*pool.length)];
  }
};
export var BUST_STEAL_CALC={
  calc:function(prospect){
    if(!prospect)return{bustPct:0,stealPct:0,riskLabel:"Unknown"};
    var bustRisk=15;// Base 15% bust rate
    var stealChance=10;// Base 10% steal chance
    var char75=prospect.character75||null;
    if(char75){
      if(char75.id==="character_concern")bustRisk+=20;
      if(char75.id==="boom_or_bust"){bustRisk+=12;stealChance+=12;}
      if(char75.id==="injury_prone")bustRisk+=15;
      if(char75.id==="workout_warrior")bustRisk+=8;
      if(char75.id==="pro_ready"){bustRisk-=10;stealChance-=5;}
      if(char75.id==="film_junkie"){bustRisk-=8;stealChance+=5;}
      if(char75.id==="leader"){bustRisk-=6;stealChance+=3;}
      if(char75.id==="football_iq"){bustRisk-=8;stealChance+=4;}
      if(char75.id==="small_school")stealChance+=8;
      if(char75.id==="raw_talent"){bustRisk+=5;stealChance+=10;}
    }
    if(prospect.isGem)stealChance+=15;
    if(prospect.isBust)bustRisk+=15;
    if(prospect.age>=23)bustRisk+=5;
    if(prospect.combine&&prospect.combine.forty<=4.45&&(prospect.ovr||50)<70)bustRisk+=5;// Athletic but low OVR = red flag
    if(prospect.combine&&prospect.combine.forty<=4.45&&(prospect.ovr||50)>=75)stealChance+=5;
    if(prospect.pot&&prospect.ovr&&prospect.pot-prospect.ovr>=12)stealChance+=8;
    if(prospect.pot&&prospect.ovr&&prospect.pot-prospect.ovr<=3)bustRisk+=5;
    bustRisk=Math.max(2,Math.min(75,bustRisk));
    stealChance=Math.max(2,Math.min(65,stealChance));
    var riskLabel=bustRisk>=40?"HIGH RISK":bustRisk>=25?"MODERATE RISK":bustRisk>=15?"LOW RISK":"SAFE BET";
    return{bustPct:bustRisk,stealPct:stealChance,riskLabel:riskLabel};
  }
};
export var DRAFT_DAY_TRADES={
  shouldTradeUp:function(team,prospect,currentPick,targetPick,allTeams){
    if(!team||!prospect||!allTeams)return null;
    var need=0;var posList=["QB","RB","WR","TE","OL","DL","LB","CB","S"];
    posList.forEach(function(pos){
      if(pos===prospect.pos){
        var sts=(team.roster||[]).filter(function(p){return p.pos===pos&&!(p.injury&&p.injury.games>0);}).sort(function(a,b){return b.ovr-a.ovr;});
        var bestOvr=sts.length>0?sts[0].ovr:40;
        need=Math.max(0,80-bestOvr);
      }
    });
    if(need<15||(prospect.ovr||50)<72)return null;
    var pickGap=currentPick-targetPick;
    if(pickGap<=0||pickGap>20)return null;// Can't trade backwards or too far
    var cost=Math.min(3,Math.ceil(pickGap/5));
    var futurePicks=(team.draftPicks||[]).filter(function(pk){return pk.round>=3;});
    if(futurePicks.length<cost)return null;// Not enough capital
    var isQBNeed=prospect.pos==="QB"&&need>=20;
    if(!isQBNeed&&need<20)return null;
    return{targetPick:targetPick,cost:cost,prospect:{name:prospect.name,pos:prospect.pos,ovr:prospect.ovr},picks:futurePicks.slice(0,cost)};
  },
  makeOffer:function(aiTeam,userPick,pickNum){
    if(!aiTeam||!userPick)return null;
    var offer={from:aiTeam.abbr,fromIcon:aiTeam.icon,fromId:aiTeam.id,pickNum:pickNum};
    var futurePicks=(aiTeam.draftPicks||[]).filter(function(pk){return pk.round>=2;});
    offer.picks=futurePicks.slice(0,Math.min(2,futurePicks.length));
    var tradeable=(aiTeam.roster||[]).filter(function(p){return(p.ovr||50)>=65&&(p.ovr||50)<=78&&p.contract&&p.contract.years>=2;});
    if(tradeable.length>0&&RNG.ai()<0.3){
      var tp=tradeable[Math.floor(RNG.ai()*tradeable.length)];
      offer.player={name:tp.name,pos:tp.pos,ovr:tp.ovr,id:tp.id};
    }
    return offer;
  }
};
export var DRAFT_EVAL={
  compareSafety:function(dA,dB){
    var getScore=function(d){
      if(!d)return 0;
      var pts=0;
      pts+=(d.conf||0);// Confidence is king
      if(d.tells)pts+=(d.tells.length*10);// Intel = value (even bad news is info)
      if(d.redFlags)pts-=(d.redFlags.length*15);// Red flags reduce safety
      if(d.verified)pts+=25;// Verified = massive trust
      return pts;
    };
    return getScore(dA)-getScore(dB);
  }
};
