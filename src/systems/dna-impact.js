/**
 * MFD DNA Impact Reporting
 *
 * Analyzes league DNA modifiers (injury rate, dev speed, parity,
 * trade frequency, upset chance) and generates insight reports.
 */

export function buildDNAImpactReport(dna,teams,season){
  if(!dna||!teams)return null;
  var insights=[];
  if(dna.injuryRate!==1.0){
    var totalInjured=0;teams.forEach(function(t){t.roster.forEach(function(p){if(p.injury&&p.injury>0)totalInjured++;});});
    var avgInjPct=Math.round(totalInjured/teams.length*100)/100;
    insights.push({emoji:"🏥",label:"Injury Rate ("+dna.injuryRate.toFixed(1)+"×)",
      text:dna.injuryRate>1?"Higher injury rate — "+avgInjPct+" avg injuries/team. Depth matters more.":
        "Lower injury rate — "+avgInjPct+" avg injuries/team. Stars stay healthy."});
  }
  if(dna.devSpeed!==1.0){
    var youngStars=0;teams.forEach(function(t){t.roster.forEach(function(p){if(p.age<=24&&p.ovr>=75)youngStars++;});});
    insights.push({emoji:"📈",label:"Dev Speed ("+dna.devSpeed.toFixed(1)+"×)",
      text:dna.devSpeed>1?youngStars+" young stars (≤24, 75+ OVR) emerged. Fast development rewarded youth investment.":
        "Slow development — only "+youngStars+" young stars. Veterans hold their value longer."});
  }
  if(dna.parity!==1.0){
    var topWins=Math.max.apply(null,teams.map(function(t){return t.wins;}));
    var botWins=Math.min.apply(null,teams.map(function(t){return t.wins;}));
    var spread=topWins-botWins;
    insights.push({emoji:"⚖️",label:"Parity ("+dna.parity.toFixed(1)+"×)",
      text:dna.parity>1?"Competitive balance — only "+spread+" win spread top to bottom. Any given Sunday.":
        "Hierarchy reigns — "+spread+" win spread. Superteams dominate."});
  }
  if(dna.tradeFreq!==1.0){
    var tradeCount=(season.ledger||[]).filter(function(l){return l.type==="TRADE";}).length;
    insights.push({emoji:"🔄",label:"Trade Freq ("+dna.tradeFreq.toFixed(1)+"×)",
      text:dna.tradeFreq>1?tradeCount+" trades this season. Active market reshuffled rosters.":
        tradeCount+" trades. Quiet market — teams held firm."});
  }
  if(dna.upsetChance!==1.0){
    insights.push({emoji:"😱",label:"Upset Volatility ("+dna.upsetChance.toFixed(1)+"×)",
      text:dna.upsetChance>1?"Chaos reigned — underdogs had extra juice all season.":
        "Chalk held — favorites won more often than normal."});
  }
  if(insights.length===0)insights.push({emoji:"📋",label:"Default DNA",text:"Standard simulation — no DNA modifiers active."});
  return{insights:insights,year:season.year};
}
