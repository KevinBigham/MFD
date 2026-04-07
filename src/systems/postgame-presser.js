/**
 * MFD Postgame Presser & Headlines
 *
 * Interactive postgame press conference questions with morale/owner/rivalry
 * effects, plus dynamic headline generator for weekly news.
 */

export var PRESS_QUESTIONS=[
  {id:"bad_loss",trigger:function(r){return r.lost&&r.margin>=14;},
    q:"Your team got blown out by {margin} points. What happened out there?",
    opts:[
      {id:"blame",label:"🔥 \"We didn't execute. Some guys weren't ready.\"",fx:{morale:-3,ownerApproval:2,rivalHeat:0}},
      {id:"own_it",label:"🤝 \"That's on me. I'll fix the gameplan.\"",fx:{morale:3,ownerApproval:-1,rivalHeat:0}},
      {id:"deflect",label:"😤 \"Refs didn't help. We'll bounce back.\"",fx:{morale:1,ownerApproval:0,rivalHeat:2}}
    ]},
  {id:"close_loss",trigger:function(r){return r.lost&&r.margin<=7;},
    q:"A tough {margin}-point loss. How do you keep the locker room together?",
    opts:[
      {id:"rally",label:"💪 \"We're close. One play away. We'll get there.\"",fx:{morale:2,ownerApproval:1,rivalHeat:0}},
      {id:"tough_love",label:"🔥 \"Close isn't good enough. Time to earn it.\"",fx:{morale:-1,ownerApproval:2,rivalHeat:0}},
      {id:"next_up",label:"➡️ \"Already looking at next week's film.\"",fx:{morale:0,ownerApproval:1,rivalHeat:-1}}
    ]},
  {id:"big_win",trigger:function(r){return r.won&&r.margin>=14;},
    q:"Dominant {margin}-point win tonight. How does it feel?",
    opts:[
      {id:"humble",label:"🙏 \"Credit to the guys. They executed the gameplan.\"",fx:{morale:2,ownerApproval:1,rivalHeat:0}},
      {id:"swagger",label:"😎 \"That's what championship teams look like.\"",fx:{morale:1,ownerApproval:2,rivalHeat:3}},
      {id:"focused",label:"🎯 \"Good teams don't celebrate one win. Next game.\"",fx:{morale:0,ownerApproval:2,rivalHeat:-1}}
    ]},
  {id:"close_win",trigger:function(r){return r.won&&r.margin<=7;},
    q:"A nail-biter — won by {margin}. Thoughts on the finish?",
    opts:[
      {id:"gritty",label:"💎 \"That's a character win. Gritty.\"",fx:{morale:3,ownerApproval:1,rivalHeat:0}},
      {id:"critical",label:"📋 \"We almost gave that away. Film session tomorrow.\"",fx:{morale:-1,ownerApproval:2,rivalHeat:0}},
      {id:"clutch",label:"⭐ \"When it mattered most, our guys delivered.\"",fx:{morale:2,ownerApproval:1,rivalHeat:1}}
    ]},
  {id:"rivalry_any",trigger:function(r){return r.isRivalry;},
    q:"Rivalry game. The fans were electric. What does this matchup mean to you?",
    opts:[
      {id:"respect",label:"🤝 \"Great opponent. We both elevated our game.\"",fx:{morale:1,ownerApproval:1,rivalHeat:-2}},
      {id:"fire",label:"🔥 \"This is OUR house. They know it now.\"",fx:{morale:2,ownerApproval:0,rivalHeat:4}},
      {id:"business",label:"📊 \"Every game counts the same. On to the next.\"",fx:{morale:0,ownerApproval:1,rivalHeat:0}}
    ]}
];
export var HEADLINES={
  generate:function(teams,myId,season,sched){
    var headlines=[];
    var my2=teams.find(function(t){return t.id===myId;});
    teams.forEach(function(t){
      if((t.streak||0)>=4)headlines.push({emoji:"🔥",text:t.icon+t.abbr+" on a "+t.streak+"-game win streak!",priority:3});
      if((t.streak||0)<=-4)headlines.push({emoji:"💀",text:t.icon+t.abbr+" in freefall — "+Math.abs(t.streak)+"-game losing streak",priority:3});
    });
    var sorted=teams.slice().sort(function(a,b){return b.wins!==a.wins?b.wins-a.wins:b.pf-a.pf;});
    if(season.week>=8){
      var bubble=sorted.slice(5,8);// Teams 6-8 (on the bubble)
      bubble.forEach(function(bt){
        if(bt.wins>=Math.floor(season.week*0.45))
          headlines.push({emoji:"🏈",text:bt.icon+bt.abbr+" ("+bt.wins+"-"+bt.losses+") fighting for playoff spot",priority:2});
      });
    }
    if(my2){
      my2.roster.filter(function(p){return p.age<=23&&p.isStarter&&p.ovr>=72;}).slice(0,2).forEach(function(rk){
        var weekPff=rk.pffWeek||0;
        if(weekPff>=80)headlines.push({emoji:"⭐",text:"Rookie Watch: "+rk.name+" ("+rk.pos+") graded "+weekPff+" this week!",priority:2});
      });
    }
    if(my2){
      my2.roster.forEach(function(p){
        if(p.stats&&p.stats.passYds>=3500&&p.stats.passYds<4000)
          headlines.push({emoji:"📈",text:p.name+" closing in on 4,000 passing yards ("+p.stats.passYds+")",priority:2});
        if(p.stats&&p.stats.rushYds>=900&&p.stats.rushYds<1000)
          headlines.push({emoji:"📈",text:p.name+" approaching 1,000 rushing yards ("+p.stats.rushYds+")",priority:2});
        if(p.stats&&p.stats.recYds>=800&&p.stats.recYds<1000)
          headlines.push({emoji:"📈",text:p.name+" tracking toward 1,000 receiving yards ("+p.stats.recYds+")",priority:2});
        if(p.stats&&p.stats.sacks>=8)
          headlines.push({emoji:"💪",text:p.name+" leads the team with "+p.stats.sacks+" sacks — DPOY candidate?",priority:2});
      });
    }
    if(my2&&my2._prevRank){
      var curRank=sorted.findIndex(function(t){return t.id===myId;})+1;
      var delta=my2._prevRank-curRank;
      if(delta>=3)headlines.push({emoji:"📈",text:"Your team jumped "+delta+" spots in the power rankings to #"+curRank+"!",priority:3});
      if(delta<=-3)headlines.push({emoji:"📉",text:"You dropped "+Math.abs(delta)+" spots in the rankings to #"+curRank,priority:3});
    }
    if(season.week>=8&&season.week<=11){
      var contenders=sorted.slice(0,4);
      contenders.forEach(function(ct){
        if(ct.id!==myId){
          var need=ct.roster.filter(function(p){return p.isStarter&&p.ovr<65;});
          if(need.length>0)headlines.push({emoji:"📞",text:ct.icon+ct.abbr+" reportedly shopping for "+need[0].pos+" help before deadline",priority:1});
        }
      });
    }
    return headlines.sort(function(a,b){return b.priority-a.priority;}).slice(0,6);
  }
};
