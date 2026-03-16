/**
 * MFD Hall of Fame System
 *
 * Module-level Hall of Fame log, personality-based HOF speeches,
 * legacy score calculation (rings, MVPs, elite seasons, yards),
 * automatic HOF induction, and cap fix suggestions.
 */
import { AWARD_HISTORY_LOG } from './award-history.js';
import { RNG } from '../utils/rng.js';

export var HALL_OF_FAME_LOG=[];// [{name, pos, teams, inducted, score, highlights}]
export var HOF_SPEECHES={
  workEthic:[
    "They said I wasn't big enough or fast enough. So I just worked harder than all of them.",
    "The rings are nice, but what I'll miss most is the 5 AM film sessions. The empty gym.",
    "Talent sets the floor, but sweat sets the ceiling. I left every drop I had on that field.",
    "I didn't take a single play off in my entire career. Not in practice, not on Sunday.",
    "To the young guys watching: there is no shortcut. You have to fall in love with the work."
  ],
  ambition:[
    "I told my coach on day one: I'm not here to just make the roster. I'm here to make history.",
    "You have to believe you're the best before anyone else does. I always knew I'd end up here.",
    "I chased perfection every single season. Sometimes we caught it. Sometimes we caught championships.",
    "Greatness isn't given, it's taken. I wanted to be the greatest to ever put on the cleats.",
    "I was never satisfied. Even after a Championship, all I could think about was the next one."
  ],
  greed:[
    "It's a business, and I always handled my business. But today is about the legacy we built.",
    "They called me selfish when I asked for what I was worth. But look at the banner. We all won.",
    "I always bet on myself. The contracts were nice, but this gold jacket? This is forever.",
    "You have to maximize your value in this league. I maximized mine on the field and in the office.",
    "I demanded a lot from my teams, but I gave them everything on Sundays. The investment paid off."
  ],
  loyalty:[
    "I had chances to leave. I had chances to chase a ring somewhere else. But this city is my home.",
    "To the fans: we bled together, we cried together, and we won together. I am one of you.",
    "You don't build a dynasty by jumping ship when things get hard. You plant your feet and build.",
    "I wore one jersey my entire career. In today's game, that means everything to me.",
    "My teammates are my brothers. I would have run through a brick wall for any of them."
  ],
  pressure:[
    "When the clock was ticking down, and the stadium was screaming... that's when I felt the most peace.",
    "Some guys run from the moment. I lived for the fourth quarter. I wanted the ball in my hands.",
    "The bright lights never blinded me. They just showed me exactly where I needed to go.",
    "Pressure is a privilege. If they are counting on you to win it, it means you're exactly where you belong.",
    "You don't become a Hall of Famer in the first quarter. You earn this jacket when the game is on the line."
  ],
  fallback:[
    "I gave everything I had to this game, and this game gave everything back.",
    "Nobody hands you a Hall of Fame career. You earn it one play at a time.",
    "I always said: be ready when your number is called. Mine was called a lot.",
    "To every coach, teammate, and fan who believed in me — this jacket is for all of us."
  ]
};
function resolveHofRng(rngFn){
  return typeof rngFn==="function"?rngFn:RNG.draft;
}
export function getHOFSpeech(trait,rng2){
  var pool=HOF_SPEECHES[trait||"fallback"]||HOF_SPEECHES.fallback;
  var speechRng=resolveHofRng(rng2);
  return pool[Math.floor(speechRng()*pool.length)];
}
export function calcLegacyScore(playerName,history){
  var score=0;var highlights=[];
  var rings=0;var mvps=0;var dpoys=0;var roys=0;var totalYds=0;
  var seasonsPlayed=0;var peakOvr=0;var teamsArr={};
  var eliteSeasons=0;// Each elite season worth +8 pts — allows OL/DL/K to reach HOF via dominance
  history.forEach(function(h){
    if(!h.teams)return;
    h.teams.forEach(function(t){
      t.roster.forEach(function(p){
        if(p.name!==playerName)return;
        seasonsPlayed++;teamsArr[t.abbr]=true;
        if(p.ovr>peakOvr)peakOvr=p.ovr;
        if((p.ovr||0)>=90)eliteSeasons++;
        var st=p.stats||{};
        totalYds+=(st.passYds||0)+(st.rushYds||0)+(st.recYds||0);
        var pos=p.pos||"";
        var isSkill=(pos==="QB"||pos==="RB"||pos==="WR"||pos==="TE");
        if(!isSkill){
          totalYds+=(st.sacks||0)*50+(st.tackles||0)*2+(st.ffum||0)*30+(st.defINT||0)*40;
          if(pos==="K"||pos==="P")totalYds+=(st.fgMade||0)*20;
        }
      });
    });
    if(h.champId&&h.teams.some(function(t){return t.roster.some(function(p){return p.name===playerName;})&&(t.id===h.champId||t.abbr===h.champAbbr);})){
      rings++;highlights.push("💍 Champion Yr"+h.year);
    }
  });
  AWARD_HISTORY_LOG.forEach(function(ah){
    if(ah.mvp&&ah.mvp.name===playerName){mvps++;highlights.push("🏆 MVP Yr"+ah.year);}
    if(ah.dpoy&&ah.dpoy.name===playerName){dpoys++;highlights.push("🛡️ DPOY Yr"+ah.year);}
    if(ah.roy&&ah.roy.name===playerName){roys++;highlights.push("🌱 ROY Yr"+ah.year);}
  });
  score=(rings*20)+(mvps*25)+(dpoys*20)+(roys*10)+Math.floor(totalYds/1000)*3;
  score+=Math.min(32,eliteSeasons*8);// +8 per elite season, capped at 32 (4 seasons max bonus)
  if(peakOvr>=85&&eliteSeasons===0)score+=5;// Safety net for near-elite careers
  if(seasonsPlayed>=8)score+=10;
  if(eliteSeasons>=4)highlights.push("⭐ "+eliteSeasons+"-time Elite Season");
  return{score:score,rings:rings,mvps:mvps,dpoys:dpoys,roys:roys,
    totalYds:totalYds,peakOvr:peakOvr,seasons:seasonsPlayed,eliteSeasons:eliteSeasons,
    teams:Object.keys(teamsArr),highlights:highlights};
}
export function autoHallOfFame(teams,history,year,rngFn){
  if(history.length<5)return[];// Need at least 5 seasons
  var speechRng=resolveHofRng(rngFn);
  var currentNames={};
  teams.forEach(function(t){t.roster.forEach(function(p){currentNames[p.name]=true;});});
  var inducted=[];
  var lastSeason=history[history.length-1];
  if(!lastSeason||!lastSeason.teams)return[];
  var checked={};
  lastSeason.teams.forEach(function(ht){
    ht.roster.forEach(function(p){
      if(currentNames[p.name]||checked[p.name])return;
      checked[p.name]=true;
      if(HALL_OF_FAME_LOG.some(function(h){return h.name===p.name;}))return;
      var legacy=calcLegacyScore(p.name,history);
      if(legacy.score>=80){
        var hofSpeech=getHOFSpeech(p.trait||p.dominantTrait||"fallback",speechRng);
        var mfsnReaction=legacy.rings>=3?"A dynasty legend takes their rightful place in Canton.":legacy.mvps>=2?"Multiple MVP honors. The case was never in doubt.":legacy.eliteSeasons>=4?"Four seasons of elite dominance. That's a Hall of Fame career.":"A generational talent takes their rightful place in Canton.";
        var entry={name:p.name,pos:p.pos,teams:legacy.teams,inducted:year,
          score:legacy.score,peakOvr:legacy.peakOvr,highlights:legacy.highlights,
          rings:legacy.rings,mvps:legacy.mvps,seasons:legacy.seasons,totalYds:legacy.totalYds,
          eliteSeasons:legacy.eliteSeasons,trait:p.trait||p.dominantTrait||"fallback",
          speech:hofSpeech,mfsnReaction:mfsnReaction};// v93: ceremony data
        HALL_OF_FAME_LOG.push(entry);
        inducted.push(entry);
      }
    });
  });
  return inducted;
}
export function buildCapFixes(team,year){
  if(!team)return[];
  var fixes=[];var cap=150+(year-2026)*2;// salary cap
  var used=0;team.roster.forEach(function(p){used+=((p.contract&&p.contract.salary)||0);});
  var dead=team.deadCap||0;var room=cap-used-dead;
  if(room>10)return[];// No fix needed
  var restructureCands=team.roster.filter(function(p){
    return p.contract&&p.contract.salary>=6&&(p.contract.years||0)>=2&&p.ovr>=70;
  }).sort(function(a,b){return b.contract.salary-a.contract.salary;}).slice(0,3);
  restructureCands.forEach(function(p){
    var savings=Math.round(p.contract.salary*0.3*10)/10;
    fixes.push({type:"restructure",emoji:"🔄",player:p.name,pos:p.pos,ovr:p.ovr,
      desc:"Convert $"+savings+"M to signing bonus (spread over "+p.contract.years+" yrs)",
      savings:savings,risk:"Adds future dead money if cut"});
  });
  var cutCands=team.roster.filter(function(p){
    return p.contract&&p.contract.salary>=3&&p.ovr<=72;
  }).sort(function(a,b){return (a.ovr-b.ovr)||(b.contract.salary-a.contract.salary);}).slice(0,3);
  cutCands.forEach(function(p){
    var deadHit=Math.round(((p.contract.guaranteed||0)-(p.contract.salary||0)*0.2)*10)/10;
    if(deadHit<0)deadHit=0;
    var netSavings=Math.round((p.contract.salary-deadHit)*10)/10;
    if(netSavings<=0)return;
    fixes.push({type:"cut",emoji:"✂️",player:p.name,pos:p.pos,ovr:p.ovr,
      desc:"Release for $"+netSavings+"M savings"+(deadHit>0?" (dead: $"+deadHit+"M)":""),
      savings:netSavings,risk:deadHit>0?"$"+deadHit+"M dead cap hit":"Clean release"});
  });
  var tradeCands=team.roster.filter(function(p){
    return p.contract&&p.contract.salary>=5&&p.ovr>=72&&p.ovr<=82;
  }).sort(function(a,b){return b.contract.salary-a.contract.salary;}).slice(0,2);
  tradeCands.forEach(function(p){
    fixes.push({type:"trade",emoji:"🤝",player:p.name,pos:p.pos,ovr:p.ovr,
      desc:"Trade to shed $"+p.contract.salary+"M (get picks/players back)",
      savings:p.contract.salary,risk:"Lose "+p.ovr+" OVR "+p.pos});
  });
  return fixes.sort(function(a,b){return b.savings-a.savings;});
}
