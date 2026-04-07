/**
 * MFD MFSN Sports Network — Show & Content Data
 *
 * The in-game sports network broadcast system:
 * draft commentary lines, show structure, content templates,
 * weekly show format, core broadcast data,
 * draft grades, and pre-game predictions.
 */

import { T } from "../config/theme.js";
import { RNG } from "../utils/rng.js";

export var MFSN_DRAFT_LINES=[
  "🎙️ MFSN: This is THE night every GM has circled on their calendar.",
  "📡 Draft coverage brought to you live from the MFSN studios.",
  "🎤 Our analysts are calling tonight one of the deepest classes in years.",
  "⚡ Multiple trade rumors swirling as teams get set to go on the clock.",
  "🔥 Every scout in football has their big board locked and loaded.",
  "📊 The analytics teams have been grinding film for months — it all comes down to tonight.",
  "💼 GMs are making the calls that will define their franchises for a decade.",
  "🏟️ The war rooms are ready. The boards are set. Let's get this draft started."
];

export var MFSN_SHOW={
  analysts:[
    {name:"Rod Pemberton",icon:"🎙️",style:"hype",
     steal:["ROD IS ON HIS FEET! That's the pick of the draft so far!","STEAL ALERT! I had him going top-10. Unbelievable value!","Rod is losing his mind — this pick is a HEIST!"],
     reach:["Ooh. Rod doesn't love this one. That's a reach.","Rod raises an eyebrow. 'I had him in the third...'","Bold call. Rod respects the conviction, not the tape."],
     need:["Exactly what they needed! Rod called it in the pre-show!","Rod had this on his draft board as a priority need. Nailed it.","Addresses the biggest hole on that roster. Smart football."],
     value:["Rod approves. Good player, right price.","Solid pick. Rod gives it a thumbs up.","Clean selection. No complaints from Rod."],
     reaction:["🎙️","🏈","⚡","🔥"]},
    {name:"Diane Holloway",icon:"📊",style:"analyst",
     steal:["The analytics LOVE this. Contract value off the charts.","Diane's model had him as a top-5 value play. Team cashed in.","Expected contract value: elite. This front office did their homework."],
     reach:["Diane's model flags a reach. AV projection doesn't support this slot.","The numbers say overdraft. Diane is skeptical.","Contract efficiency takes a hit here. Diane sighs."],
     need:["Need score: maximum. This fills their biggest positional gap.","Diane's positional value chart lights up green. Perfect fit.","The team need index screams for this position. Well-executed."],
     value:["Analytics check out. Diane nods.","Efficiency model approves. Solid expected value.","Clean process. Diane stamps it."],
     reaction:["📊","📈","🧮","✅"]},
    {name:"Marcus Steele",icon:"🔥",style:"upside",
     steal:["MARCUS IS GOING CRAZY! The ceiling on this kid is INSANE!","Upside pick of the DRAFT. Marcus called it!","If he develops? We'll be talking about this pick for years."],
     reach:["Marcus loves the upside but... that's a lot of draft capital.","He's got potential, but Marcus isn't sure it's worth this spot.","High-risk, high-reward. Marcus is intrigued but nervous."],
     need:["Need pick AND upside? Marcus is all in.","Fits the scheme and has the ceiling to be a star. Marcus loves it.","Safe floor, massive ceiling. Marcus calls it the total package."],
     value:["Marcus sees the upside. Good selection.","Solid pick. Marcus wants to see how he develops.","Good player. Marcus will be watching Year 2 closely."],
     reaction:["🔥","💥","🚀","⭐"]},
    {name:"Lena Voss",icon:"🧠",style:"scheme",
     steal:["Lena immediately IDs the scheme fit. This is MASTERFUL roster building.","That player was made for their system. Lena is impressed.","Tape study pays off. Lena called this team's interest three weeks ago."],
     reach:["Lena questions the scheme fit. Their system doesn't maximize this skillset.","The tape is good, but does it translate to their offense? Lena is unsure.","Interesting choice. Lena needs to see how the staff deploys him."],
     need:["Scheme fit: perfect. Lena had this player circled for this team all week.","Lena's film study confirms it — ideal system fit. Great process.","Their coaching staff will love working with this player. Lena approves."],
     value:["Lena checks out the scheme alignment. Good enough.","Film says he fits. Lena is satisfied.","Smart selection for their system. Lena nods."],
     reaction:["🧠","📋","🎯","🏟️"]}
  ],
  verdicts:{
    "A+":"STEAL OF THE DRAFT",
    "A":"EXCELLENT VALUE",
    "B+":"STRONG PICK",
    "B":"SOLID SELECTION",
    "C":"ACCEPTABLE",
    "C-":"QUESTIONABLE REACH",
    "D":"SIGNIFICANT REACH"
  },
  verdictColors:{
    "A+":"#22c55e","A":"#4ade80","B+":"#86efac","B":"#fbbf24","C":"#f59e0b","C-":"#f97316","D":"#ef4444"
  },
  getAnalyst:function(pickNum){
    // Rotate analysts by pick number for variety
    return MFSN_SHOW.analysts[pickNum%MFSN_SHOW.analysts.length];
  },
  buildPickCard:function(aiDnEntry,pickNum){
    if(!aiDnEntry)return null;
    var analyst=MFSN_SHOW.getAnalyst(pickNum);
    var grade=aiDnEntry.grade||"B";
    var isSteal=grade==="A+"||grade==="A";
    var isReach=grade==="C-"||grade==="D";
    var fillsNeed=aiDnEntry.reactions&&aiDnEntry.reactions.some(function(r){return r.emoji==="✅";});
    var linePool=isSteal?analyst.steal:isReach?analyst.reach:fillsNeed?analyst.need:analyst.value;
    var lineIdx=Math.floor(RNG.ui()*linePool.length);
    var line=linePool[lineIdx];
    var reactionEmoji=analyst.reaction[Math.floor(RNG.ui()*analyst.reaction.length)];
    return{
      analyst:analyst.name,
      analystIcon:analyst.icon,
      reactionEmoji:reactionEmoji,
      line:line,
      grade:grade,
      verdict:MFSN_SHOW.verdicts[grade]||"SOLID PICK",
      verdictColor:MFSN_SHOW.verdictColors[grade]||"#fbbf24",
      team:aiDnEntry.team,
      teamIcon:aiDnEntry.icon,
      player:aiDnEntry.player,
      pos:aiDnEntry.pos,
      ovr:aiDnEntry.ovr,
      pot:aiDnEntry.pot,
      pickNum:aiDnEntry.pickNum,
      round:aiDnEntry.round,
      reactions:aiDnEntry.reactions||[],
      fillsNeed:fillsNeed,
      isSteal:isSteal,
      isReach:isReach,
      timestamp:Date.now()
    };
  }
};

export var MFSN_CONTENT_991={
  openingLines:[
    "🎙️ MFSN: Welcome to the most anticipated matchup of the week!",
    "📡 We are LIVE as the teams take the field! This one promises to be a classic.",
    "🎤 MFSN is in the building! The energy in this stadium is absolutely electric.",
    "📺 Good evening and welcome to MFSN prime time football — we have a game for you tonight.",
    "🎙️ MFSN: The teams are out for warmups and the buzz inside this venue is something special.",
    "📡 Tonight's matchup has all the makings of an instant classic. MFSN has you covered.",
    "🎤 The lights are on, the crowd is in, and MFSN is ready. Let's play football.",
    "📺 This is the game every analyst has been talking about all week. Now we settle it.",
    "🎙️ MFSN: We've seen highlights, we've read the matchup data — tonight we get the truth.",
    "📡 Championship implications could be written in the outcome of this game. Let's find out.",
    "🎤 Two teams. One winner. MFSN brings you every play of what should be a memorable night.",
    "📺 The pregame show is in the books. It's time for football. MFSN goes live.",
    "🎙️ MFSN: This is what fall weekends were made for. Football. Live. Right now.",
    "📡 The coin toss is complete. Kickoff is moments away. MFSN coverage begins.",
    "🎤 Forty-five thousand fans on their feet. MFSN in your living room. Let's get it started."
  ],
  powerRankingsIntro:[
    "🏆 MFSN Power Rankings: Every week we reassess — every week the board gets shaken.",
    "📊 The MFSN Analytics Desk has processed the numbers. Here's where everyone stands.",
    "🔢 Power Rankings Tuesday — where reputations are built and bubble teams get burst.",
    "📈 The rankings are in and the debate has already started in the war room.",
    "🏆 MFSN Power Rankings Presented by the numbers: who rose, who fell, who held steady.",
    "📊 Every performance rewrites the narrative. This week's rankings reflect that.",
    "🔢 The polls are closed. The votes are tallied. MFSN reveals the hierarchy.",
    "📈 New week, new rankings — the chase for the top spot never stops on MFSN.",
    "🏆 After a wild week of results, the MFSN Power Rankings have been recalibrated.",
    "📊 The Power Rankings — half science, half art. Presented for your approval."
  ],
  hotTakeLines:[
    "🔥 MFSN Hot Take: Their offensive line is the reason they keep winning — not the skill players.",
    "💥 Unpopular opinion from the MFSN desk: that loss might be the best thing that happened to them.",
    "🔥 The analytics say one thing. The eye test says another. Both might be right.",
    "💥 MFSN Take: They're being wildly underseeded and this is going to matter in January.",
    "🔥 Hot take incoming: their backup is more ready than anyone in this building will admit.",
    "💥 The injury is devastating, yes — but this team is better positioned to absorb it than people think.",
    "🔥 MFSN Analyst: The defense has been the story all season and nobody's talking about them.",
    "💥 Controversial but defensible: they should be starting the rookie right now.",
    "🔥 The trade rumors are a distraction. This roster, properly deployed, can win a title.",
    "💥 Mark this day: they just had the best game of the season and finished on the wrong side.",
    "🔥 MFSN calls it: the next two weeks define whether this team is real or a mirage.",
    "💥 The coaching staff gets too much credit on wins and too much blame on losses. The players decide games."
  ],
  rivalryWatch:[
    "⚔️ MFSN Rivalry Watch: Bad blood has been building all week. The locker room is ready.",
    "🔥 When these two teams meet, regular season records become irrelevant. It's personal.",
    "⚔️ The rivalry game has its own rules. History matters. Pride matters. Scoreboard matters.",
    "🔥 MFSN has tracked every game in this series. The lead has changed hands multiple times.",
    "⚔️ Rivalry week is unlike any other week. Preparation is different. Emotion is different.",
    "🔥 Both coaching staffs spent extra time on motivation this week. The players don't need it.",
    "⚔️ The trash talk started on Monday. By game time it's usually something beautiful.",
    "🔥 MFSN Rivalry Index: elevated. These teams genuinely dislike each other and play like it.",
    "⚔️ When rivals meet, the form book goes out the window. Expect the unexpected tonight.",
    "🔥 The series history adds weight to every play. These players know what this game means."
  ],
  injuryReport:[
    "🚑 MFSN Injury Update: The team listed him as questionable and he will test it during warmups.",
    "⚠️ Late breaking: the injury is more significant than the team initially let on.",
    "🚑 The injury report came in and the implications for tonight's game are significant.",
    "⚠️ MFSN Source: the backup has been working first-team reps all week. Draw your own conclusions.",
    "🚑 The player is officially out — next man up and the depth chart gets a real test.",
    "⚠️ Questionable means questionable. He'll make a game-time decision with the training staff.",
    "🚑 The loss of that player changes the game plan. Both teams adjust accordingly.",
    "⚠️ MFSN Injury Tracker: two starters downgraded within the last hour. Big news."
  ],
  closingLines:[
    "🎙️ MFSN: That's the final gun and WHAT a game that was. We'll see you next week.",
    "📡 The scoreboard doesn't lie. One team earned this and the other has work to do.",
    "🎤 From the MFSN team — another game for the books. Talk about it all week.",
    "📺 A performance that will be remembered. MFSN signs off on a memorable night.",
    "🎙️ MFSN Final: the team executed when it mattered. They'll hear about this one for a while.",
    "📡 Post-game analysis is coming but first — let this result breathe for a moment.",
    "🎤 That's football. From MFSN, goodnight and great game.",
    "📺 MFSN thanks the teams, the players, the coaches, and the fans. See you next week.",
    "🎙️ On behalf of the entire MFSN broadcast team — what a night. What a sport.",
    "📡 The final whistle sounds. The recap starts now. What a game, what a night on MFSN."
  ]
};


export var MFSN_WEEKLY975={
  anchors:[
    {name:"Marcus Cole",icon:"🎙️",style:"bombastic",catchphrase:"THAT'S A FRANCHISE-ALTERING MOMENT!"},
    {name:"Diana Chen",icon:"📊",style:"analytical",catchphrase:"The numbers don't lie, people."},
    {name:"Big Trev",icon:"🏈",style:"folksy",catchphrase:"That's old-school football right there."}
  ],
  segments:["HEADLINE","YOUR_TEAM","POWER_RANKINGS","STORYLINES","HOT_SEAT","PRESS_CONFERENCE"],
  buildShow:function(teams,myId,week,gameResult,arcSpots,powerRanks,storylineEvents,season){
    var my=(teams||[]).find(function(t){return t.id===myId;});
    if(!my||week<1)return null;
    var anchor=MFSN_WEEKLY975.anchors[week%MFSN_WEEKLY975.anchors.length];
    // v99.2: Pick opening line from MFSN_CONTENT_991 if available
    var openL=MFSN_CONTENT_991&&MFSN_CONTENT_991.openingLines;
    var showOpener=openL&&openL.length?openL[week%openL.length]:null;
    var show={week:week,year:season&&season.year?season.year:null,anchor:anchor,segments:[],generated:true,opener:showOpener};
    var sorted=(teams||[]).slice().sort(function(a,b){
      var aw=a&&a.wins||0,bw=b&&b.wins||0;
      if(bw!==aw)return bw-aw;
      return ((b.pf||0)-(b.pa||0))-((a.pf||0)-(a.pa||0));
    });
    var headlines975=[];
    if(sorted[0])headlines975.push(sorted[0].icon+sorted[0].abbr+" leads the league at "+(sorted[0].wins||0)+"-"+(sorted[0].losses||0));
    if(sorted.length>1){
      var bottomTeam=sorted[sorted.length-1];
      if(bottomTeam&&sorted[0]&&bottomTeam.id!==sorted[0].id){
        headlines975.push(bottomTeam.icon+bottomTeam.abbr+" trying to climb out of "+(bottomTeam.wins||0)+"-"+(bottomTeam.losses||0));
      }
    }
    if(powerRanks&&powerRanks.length>0){
      var prTop=powerRanks[0];
      if(prTop)headlines975.push("Power Rankings: #1 "+prTop.icon+prTop.team+" ("+prTop.wins+"-"+prTop.losses+")");
      var topMover=(powerRanks.slice().sort(function(a,b){return (b.trendDelta||0)-(a.trendDelta||0);})[0]||null);
      if(topMover&&(topMover.trendDelta||0)>=2&&topMover.trend!=="same"){
        headlines975.push((topMover.trend==="up"?"📈":"📉")+" "+topMover.icon+topMover.team+" moves "+(topMover.trend==="up"?"up":"down")+" "+topMover.trendDelta+" spots");
      }
    }
    if(storylineEvents&&storylineEvents.headlines&&storylineEvents.headlines.length){
      storylineEvents.headlines.slice(0,2).forEach(function(h){
        if(typeof h==="string"&&headlines975.length<6)headlines975.push(h);
      });
    }
    if(headlines975.length===0)headlines975.push("Around the league: another wild week in pro football.");
    show.segments.push({type:"HEADLINE",title:"📰 TOP STORIES",items:headlines975.slice(0,6)});
    if(gameResult&&gameResult.result){
      var won=gameResult.isHome?(gameResult.result.home>gameResult.result.away):(gameResult.result.away>gameResult.result.home);
      var userScore=gameResult.isHome?gameResult.result.home:gameResult.result.away;
      var oppScore=gameResult.isHome?gameResult.result.away:gameResult.result.home;
      var streak=my.streak||0;
      var streakText=streak>=3?"🔥 "+streak+"-game win streak!":streak<=-3?"❄️ "+Math.abs(streak)+"-game losing streak.":"";
      var anchorReaction="";
      if(won){
        anchorReaction=anchor.style==="bombastic"?anchor.catchphrase:
          anchor.style==="analytical"?"Exactly what the analytics predicted.":
          "They just play good, clean football.";
      }else{
        anchorReaction=anchor.style==="bombastic"?"WHAT ARE WE DOING OUT THERE?!":
          anchor.style==="analytical"?"The underlying metrics tell a concerning story.":
          "That's a tough one to swallow.";
      }
      show.segments.push({
        type:"YOUR_TEAM",
        title:"🏈 "+(my.icon||"")+my.abbr+" RECAP",
        result:(won?"W":"L")+" "+userScore+"-"+oppScore+" vs "+(gameResult.oppAbbr||"???"),
        record:(my.wins||0)+"-"+(my.losses||0),
        streak:streakText,
        won:won,
        anchorTake:anchorReaction
      });
    }else{
      show.segments.push({
        type:"YOUR_TEAM",
        title:"🏈 "+(my.icon||"")+my.abbr+" RECAP",
        result:"BYE WEEK",
        record:(my.wins||0)+"-"+(my.losses||0),
        streak:"",
        won:null,
        anchorTake:"A week to heal up, self-scout, and get ready for the stretch run."
      });
    }
    if(powerRanks&&powerRanks.length>0){
      var myRank=powerRanks.find(function(r){return r&&((r.isUser)||r.team===my.abbr);})||null;
      var topMovers=powerRanks.filter(function(r){return r&&(r.trendDelta||0)>=2;})
        .sort(function(a,b){return (b.trendDelta||0)-(a.trendDelta||0);}).slice(0,3);
      show.segments.push({
        type:"POWER_RANKINGS",
        title:"📊 POWER RANKINGS",
        myRank:myRank?myRank.rank:null,
        myTrend:myRank?myRank.trend:null,
        myTrendIcon:myRank?myRank.trendIcon:null,
        myBlurb:myRank?myRank.blurb:null,
        topMovers:topMovers
      });
    }
    if(arcSpots&&arcSpots.length>0){
      show.segments.push({
        type:"STORYLINES",
        title:"🌟 PLAYER STORYLINES",
        items:arcSpots.slice(0,3).map(function(s){
          return{
            name:s.name||s.playerName||"Player",
            badge:s.badge||s.arcKey||"🌟",
            badgeColor:s.badgeColor||T.gold,
            text:s.text||s.line||"",
            pos:s.pos||""
          };
        })
      });
    }
    if((my.ownerMood||70)<50){
      var mood=my.ownerMood||70;
      show.segments.push({
        type:"HOT_SEAT",
        title:"🪑 HOT SEAT WATCH",
        data:{
          mood:mood,
          text:mood<30?"🔥 The owner is FUMING. Changes could be imminent.":
            mood<40?"⚠️ Ownership patience is wearing thin.":
            "👀 The front office is watching closely."
        }
      });
    }
    var pressQ=MFSN_WEEKLY975.generatePressQuestion(my,week,gameResult,season);
    if(pressQ)show.segments.push({type:"PRESS_CONFERENCE",title:"🎤 PRESS CONFERENCE",data:pressQ});
    return show;
  },
  generatePressQuestion:function(team,week,gameResult,season){
    if(!team)return null;
    var questions=[];
    var won=!!(gameResult&&gameResult.result&&(gameResult.isHome?(gameResult.result.home>gameResult.result.away):(gameResult.result.away>gameResult.result.home)));
    if(gameResult&&won&&(team.streak||0)>=3){
      questions.push({
        q:"You're on a "+team.streak+"-game win streak. Is this team for real?",
        opts:[
          {text:"We're building something special here.",effect:{morale:3,chemistry:2,ownerMood:2}},
          {text:"One game at a time. We haven't accomplished anything yet.",effect:{morale:1,chemistry:1}},
          {text:"The league better take notice.",effect:{morale:5,ownerMood:3,chemistry:-1}}
        ]
      });
    }
    if(gameResult&&!won&&((team.losses||0)>=((team.wins||0)+3))){
      questions.push({
        q:"This season is slipping away. What's your message to the locker room?",
        opts:[
          {text:"We're going to fight for every game left.",effect:{morale:3,chemistry:2}},
          {text:"It's time for everyone to look in the mirror.",effect:{morale:-2,chemistry:1,ownerMood:1}},
          {text:"I take full responsibility. The players aren't the issue.",effect:{morale:5,chemistry:3,ownerMood:-2}}
        ]
      });
    }
    if(gameResult&&!won){
      questions.push({
        q:"Tough loss today. Where does the team go from here?",
        opts:[
          {text:"We'll fix it in practice. This group is resilient.",effect:{morale:2,chemistry:1}},
          {text:"I need to be better. It starts with me.",effect:{morale:3,ownerMood:-1}},
          {text:"Next question.",effect:{morale:-1,ownerMood:2}}
        ]
      });
    }
    if(gameResult&&won){
      questions.push({
        q:"Great win today. What stood out to you?",
        opts:[
          {text:"The preparation this week was outstanding.",effect:{morale:2,chemistry:1}},
          {text:"We made plays when it mattered. That's what winners do.",effect:{morale:3}},
          {text:"I'll have to watch the film. We still have things to clean up.",effect:{morale:1,ownerMood:1}}
        ]
      });
    }
    if(week>=10&&(team.wins||0)>=7){
      questions.push({
        q:"The playoffs are within reach. Are you managing expectations?",
        opts:[
          {text:"We expect to be there. This roster is built for January.",effect:{morale:3,ownerMood:2}},
          {text:"Control what we can control. Win the next game.",effect:{morale:2,chemistry:1}},
          {text:"We're not looking ahead. That's how you get beat.",effect:{morale:1,chemistry:2}}
        ]
      });
    }
    if(week>=8&&week<=10){
      questions.push({
        q:"The trade deadline is approaching. Are you a buyer or a seller?",
        opts:[
          {text:"We're always looking to improve this roster.",effect:{morale:1,ownerMood:1}},
          {text:"We like what we have. Our guys earned their spots.",effect:{morale:3,chemistry:2}},
          {text:"I'm not going to tip my hand to other GMs.",effect:{ownerMood:1}}
        ]
      });
    }
    if(!gameResult){
      questions.push({
        q:"Bye week this week. What was the focus behind closed doors?",
        opts:[
          {text:"Recovery and fundamentals. Fresh legs matter in November.",effect:{morale:2,chemistry:1}},
          {text:"Self-scouting. We found a few tendencies we need to break.",effect:{ownerMood:1,chemistry:1}},
          {text:"We challenged the room. Complacency kills seasons.",effect:{morale:-1,ownerMood:2,chemistry:2}}
        ]
      });
    }
    if(questions.length===0){
      questions.push({
        q:"What's your message to the fanbase right now?",
        opts:[
          {text:"Stay with us. This team's best football is ahead.",effect:{morale:2,ownerMood:1}},
          {text:"We're building the right way and the results will come.",effect:{chemistry:2,ownerMood:1}},
          {text:"Judge us in January.",effect:{ownerMood:2,morale:1}}
        ]
      });
    }
    return questions[Math.floor(RNG.ui()*questions.length)]||null;
  }
};

export var MFSN_BROADCAST={
  pbpTemplates:{
    pass_complete:[
      {w:3,t:"{QB} steps up and finds {WR} over the middle — {YDS} yards!"},
      {w:2,t:"{QB} with time... threading the needle to {WR} for {YDS}!"},
      {w:2,t:"Quick slant to {WR}, {YDS} yards — first down!"},
      {w:1,t:"{QB} launches it deep — {WR} hauls it in! {YDS} yards!"},
      {w:1,t:"Pump fake, then {QB} finds {WR} in stride — {YDS} yards!"}
    ],
    pass_td:[
      {w:3,t:"{QB} FIRES to the corner — {WR} IS IN! TOUCHDOWN!"},
      {w:2,t:"Back of the end zone — {WR} toe drags it! SIX POINTS!"},
      {w:2,t:"{QB} rolls right, lofts it — {WR} takes it in! TOUCHDOWN!"},
      {w:1,t:"Bullet from {QB}! {WR} through traffic — SCORE!"}
    ],
    rush_gain:[
      {w:3,t:"{RB} hits the gap — {YDS} yards on the carry!"},
      {w:2,t:"{RB} breaks a tackle! {YDS} yards downfield!"},
      {w:1,t:"Strong run by {RB} — {YDS} yards, moving the chains!"}
    ],
    rush_td:[
      {w:2,t:"{RB} POWERS through! TOUCHDOWN — what a run!"},
      {w:1,t:"{RB} spins, breaks free — INTO THE END ZONE! SIX!"}
    ],
    sack:[
      {w:2,t:"{PASS_RUSHER} bulls through — SACK on {QB}! Loss of {YDS} yards!"},
      {w:2,t:"Pressure! {PASS_RUSHER} gets home — sack, {QB} goes down!"},
      {w:1,t:"{PASS_RUSHER} with a MONSTER sack — {QB} never saw him coming!"}
    ],
    interception:[
      {w:1,t:"{QB} forces it — PICKED OFF by {DB}! What a read!"},
      {w:1,t:"INTERCEPTION! {DB} reads {QB} perfectly — turnover!"}
    ],
    field_goal:[
      {w:2,t:"Kick is GOOD! Three points on the board!"},
      {w:1,t:"{K} with the boot — right down the middle! It's GOOD!"}
    ]
  },
  pickTemplate:function(templates){
    var total=templates.reduce(function(s,t){return s+(t.w||1);},0);
    var r=RNG.ui()*total;
    for(var i=0;i<templates.length;i++){r-=(templates[i].w||1);if(r<=0)return templates[i].t;}
    return templates[0].t;
  },
  fill:function(tmpl,data){
    return tmpl
      .replace("{QB}",data.qb||"the QB")
      .replace("{WR}",data.receiver||"the receiver")
      .replace("{RB}",data.rusher||"the runner")
      .replace("{PASS_RUSHER}",data.passRusher||"the pass rusher")
      .replace("{DB}",data.db||"the defender")
      .replace("{K}",data.kicker||"the kicker")
      .replace("{YDS}",String(Math.abs(data.yards||7)));
  },
  generateHighlights:function(result,hTeam,aTeam,isUserHome){
    var plays=[];
    var uRec=result&&result.recap?result.recap[isUserHome?"home":"away"]:null;
    var oRec=result&&result.recap?result.recap[isUserHome?"away":"home"]:null;
    var userT=isUserHome?hTeam:aTeam;var oppT2=isUserHome?aTeam:hTeam;
    function starter(roster,pos){return(roster&&roster.filter(function(p){return p.pos===pos&&p.isStarter;})[0])||{name:pos};}
    var qb=starter(userT&&userT.roster,"QB");var wr=starter(userT&&userT.roster,"WR");
    var rb=starter(userT&&userT.roster,"RB");var dl=starter(oppT2&&oppT2.roster,"DL");
    var cb=starter(userT&&userT.roster,"CB");var k=starter(userT&&userT.roster,"K");
    var d={qb:qb.name,receiver:wr.name,rusher:rb.name,passRusher:dl.name,db:cb.name,kicker:k.name};
    var passYds=(uRec&&uRec.passYds)||0;var rushYds=(uRec&&uRec.rushYds)||0;
    var tds=((uRec&&uRec.passTD)||0)+((uRec&&uRec.rushTD)||0);
    var sacks=(oRec&&oRec.sacks)||0;var defINTs=(uRec&&uRec.defINT)||0;
    if(passYds>150)plays.push({icon:"✈️",text:MFSN_BROADCAST.fill(MFSN_BROADCAST.pickTemplate(MFSN_BROADCAST.pbpTemplates.pass_complete),assign({},d,{yards:Math.round(passYds/Math.max(1,14))}))});
    if(rushYds>60)plays.push({icon:"🏃",text:MFSN_BROADCAST.fill(MFSN_BROADCAST.pickTemplate(MFSN_BROADCAST.pbpTemplates.rush_gain),assign({},d,{yards:Math.round(rushYds/Math.max(1,18))}))});
    if(tds>0)plays.push({icon:"🏈",text:MFSN_BROADCAST.fill(MFSN_BROADCAST.pickTemplate(RNG.ui()<0.6?MFSN_BROADCAST.pbpTemplates.pass_td:MFSN_BROADCAST.pbpTemplates.rush_td),d)});
    if(sacks>0)plays.push({icon:"💥",text:MFSN_BROADCAST.fill(MFSN_BROADCAST.pickTemplate(MFSN_BROADCAST.pbpTemplates.sack),assign({},d,{yards:7}))});
    if(defINTs>0)plays.push({icon:"🦅",text:MFSN_BROADCAST.fill(MFSN_BROADCAST.pickTemplate(MFSN_BROADCAST.pbpTemplates.interception),d)});
    if(plays.length<2)plays.push({icon:"⚡",text:qb.name+" and the offense put together a workmanlike performance."});
    return plays;
  },
  halftimeScript:function(userScore,oppScore,userTeam,oppTeam){
    var margin=userScore-oppScore;
    if(margin>14)return userTeam.abbr+" is in COMPLETE control at the half — up "+margin+". The offense is clicking on all cylinders.";
    if(margin>7)return "Leads "+userScore+"-"+oppScore+" at the break. Solid first half for "+userTeam.abbr+". Defense setting the tone.";
    if(margin>0)return "A "+margin+"-point edge at halftime. Tight game — second half will decide it all.";
    if(margin===0)return "All tied at "+userScore+" apiece at the half. Everything to play for. Adjustments will be key.";
    if(margin>-8)return "Down "+Math.abs(margin)+" at halftime. Time for a gut check from "+userTeam.abbr+". Adjustments needed.";
    return "Down "+Math.abs(margin)+" at the half — "+userTeam.abbr+" facing an uphill battle. 30 minutes to rewrite the story.";
  },
  postgameOpener:function(userScore,oppScore,userTeam,oppTeam,week){
    var won=userScore>oppScore;var margin=Math.abs(userScore-oppScore);
    var suffix=margin>=21?" — dominant from start to finish":margin>=14?" — a convincing victory":margin<=3?" — survived a nail-biter":margin<=7?" — held on for the win":"";
    if(won)return "FINAL: "+userTeam.abbr+" defeats "+oppTeam.abbr+" "+userScore+"-"+oppScore+suffix+". Week "+week+" belongs to "+userTeam.city+".";
    return "FINAL: "+oppTeam.abbr+" hands "+userTeam.abbr+" a "+oppScore+"-"+userScore+" loss"+suffix+". A tough one for "+userTeam.city+" to digest.";
  },
  analystTake:function(won,recap){
    var tos=recap?((recap.ints||0)+(recap.fumbles||0)):0;
    var passYds=recap?recap.passYds||0:0;
    if(won&&passYds>280)return "\"That passing game was surgical today. If they keep that up, this team goes deep in the playoffs.\"";
    if(won&&tos===0)return "\"Zero turnovers. You take care of the football, you win football games. Simple as that.\"";
    if(!won&&tos>=2)return "\""+tos+" turnovers is just too many. You cannot win in this league giving the ball away.\"";
    if(!won&&passYds<150)return "\"The passing game sputtered all day. They need to figure that out — and fast.\"";
    if(won)return "\"Credit to the coaching staff. They made the right adjustments at halftime. That separates good teams from great ones.\"";
    return "\"Back to the drawing board. Tough loss, but there's film to study and a week to get right.\"";
  }
};

export var MFSN_DRAFT_GRADES={
  gradeScale:[
    {min:88,letter:"A+",desc:"Historic haul. MFSN calls it a masterclass."},
    {min:80,letter:"A",desc:"Excellent class. Multiple contributors expected."},
    {min:72,letter:"B+",desc:"Solid draft. Clear value at key positions."},
    {min:63,letter:"B",desc:"Decent work. Depth addressed, upside exists."},
    {min:54,letter:"C+",desc:"Average. Some reaches, some value picks."},
    {min:45,letter:"C",desc:"Underwhelming. Needs remain unaddressed."},
    {min:35,letter:"D",desc:"Poor class. Overdrafted, bad fits throughout."},
    {min:0,letter:"F",desc:"MFSN torches this draft. What were they thinking?"}
  ],
  analysts:[
    {name:"Rod Pemberton",icon:"🎙️",bias:"loves_athletes"},
    {name:"Diane Holloway",icon:"📊",bias:"loves_value"},
    {name:"Marcus Steele",icon:"🔥",bias:"loves_upside"},
    {name:"Lena Voss",icon:"🧠",bias:"loves_need"}
  ],
  scoreDraft:function(picks,team){
    if(!picks||picks.length===0)return{score:50,letter:"C",desc:"Nothing to grade."};
    var needs=getTeamNeeds?getTeamNeeds(team):{};
    var totalScore=0;
    picks.forEach(function(p){
      var base=p.ovr>=85?25:p.ovr>=78?20:p.ovr>=72?15:p.ovr>=65?10:p.ovr>=58?6:3;
      var needBonus=(needs&&needs[p.pos]&&needs[p.pos]>=7)?5:0;
      var pickSlotBonus=(p._draftRound||4)<=2?3:(p._draftRound||4)>=5?1:2;
      var devBonus=p.devTrait==="superstar"?8:p.devTrait==="star"?4:0;
      totalScore+=(base+needBonus+pickSlotBonus+devBonus);
    });
    var normalized=Math.min(99,Math.round(totalScore/picks.length));
    var g=MFSN_DRAFT_GRADES.gradeScale.find(function(gs){return normalized>=gs.min;})||MFSN_DRAFT_GRADES.gradeScale[MFSN_DRAFT_GRADES.gradeScale.length-1];
    return{score:normalized,letter:g.letter,desc:g.desc};
  },
  generate:function(picks,team,year,rng2){
    var gradeResult=MFSN_DRAFT_GRADES.scoreDraft(picks,team);
    var analyst=MFSN_DRAFT_GRADES.analysts[Math.floor(rng2()*MFSN_DRAFT_GRADES.analysts.length)];
    var topPick=picks.slice().sort(function(a,b){return b.ovr-a.ovr;})[0];
    var sleeper=picks.find(function(p){return p.isGem&&(p._draftRound||4)>=4;})||picks[picks.length-1];
    var takes={
      "A+":["Best draft class I've seen in years. "+team.abbr+" is a dynasty in the making.","Every pick has a role. This front office knows exactly what they're building."],
      "A":["Top to bottom, this is an excellent class. Multiple starters in this group.","Addressed every major need. "+team.abbr+" gets an A from me."],
      "B+":["Strong effort. Especially love the "+(topPick?topPick.pos:"first-round")+" pick.","Nothing flashy, but the value is undeniable. Strong B+."],
      "B":["Nothing flashy, but smart. "+team.abbr+" added depth where they needed it.","Some reaches, but the value picks balance it out. Solid B."],
      "C+":["Mixed bag. The "+(topPick?topPick.name+" pick was fine":"top pick was okay")+", but board falls off after Round 2.","Average class. Hope the coaching staff can develop the upside."],
      "C":[""+team.abbr+" needed more from this draft. Several positions still unaddressed.","You'd expect more value here. Giving a C and being generous."],
      "D":["Honestly? Baffled by some of these selections. Too many reaches.","This class has more questions than answers. A D, and only because I'm in a good mood."],
      "F":["MFSN BREAKING: "+team.abbr+" holds the worst draft in recent memory.","I've been doing this 20 years. This might be the worst draft I've ever graded."]
    };
    var takePools=takes[gradeResult.letter]||takes["C"];
    var takeIdx=Math.floor(rng2()*takePools.length);
    return{year:year,analyst:analyst.name,analystIcon:analyst.icon,grade:gradeResult.letter,score:gradeResult.score,desc:gradeResult.desc,take:takePools[takeIdx],topPick:topPick?{name:topPick.name,pos:topPick.pos,ovr:topPick.ovr,devTrait:topPick.devTrait}:null,sleeper:sleeper&&(sleeper._draftRound||4)>=4?{name:sleeper.name,pos:sleeper.pos,round:sleeper._draftRound}:null,revisitYear:year+2};
  },
  revisit:function(originalGrade,currentRoster,year){
    if(!originalGrade||year<originalGrade.revisitYear)return null;
    var drafted=currentRoster.filter(function(p){return p._draftYear===originalGrade.year;});
    if(drafted.length===0)return null;
    var starters=drafted.filter(function(p){return p.isStarter&&p.ovr>=72;}).length;
    var verdict=starters>=3?"We nailed it — "+starters+" starters from that class.":starters>=2?"Decent. "+starters+" contributors emerged.":starters===1?"One starter. Underperformed our "+originalGrade.grade+" grade.":"Complete bust. That "+originalGrade.grade+" grade aged poorly.";
    return{year:year,originalGrade:originalGrade.grade,starters:starters,verdict:verdict};
  }
};

export var MFSN_PREDICTIONS={
  generate:function(teams,myId,year,rng2){
    var sorted=teams.slice().sort(function(a,b){
      var aOvr=a.roster?Math.round(a.roster.reduce(function(s,p){return s+p.ovr;},0)/Math.max(1,a.roster.length)):60;
      var bOvr=b.roster?Math.round(b.roster.reduce(function(s,p){return s+p.ovr;},0)/Math.max(1,b.roster.length)):60;
      return bOvr-aOvr;
    });
    var myRank=sorted.findIndex(function(t){return t.id===myId;})+1;
    var myT=teams.find(function(t){return t.id===myId;});
    var projWins=myRank<=4?Math.round(11+rng2()*3):myRank<=8?Math.round(9+rng2()*3):myRank<=16?Math.round(7+rng2()*3):Math.round(4+rng2()*4);
    projWins=Math.min(17,Math.max(2,projWins));
    var sbOdds=myRank<=2?"+"+Math.round(400+rng2()*200):myRank<=6?"+"+Math.round(800+rng2()*400):myRank<=12?"+"+Math.round(1500+rng2()*1000):"+"+Math.round(3000+rng2()*2000);
    var statPreds=[];
    if(myT&&myT.roster){
      var qb=myT.roster.filter(function(p){return p.pos==="QB"&&p.isStarter;}).sort(function(a,b){return b.ovr-a.ovr;})[0];
      var rb=myT.roster.filter(function(p){return p.pos==="RB"&&p.isStarter;}).sort(function(a,b){return b.ovr-a.ovr;})[0];
      var wr=myT.roster.filter(function(p){return p.pos==="WR"&&p.isStarter;}).sort(function(a,b){return b.ovr-a.ovr;})[0];
      if(qb){var passYdPred=Math.round((3200+qb.ovr*15+rng2()*500)/100)*100;statPreds.push({name:qb.name,pos:"QB",stat:"pass yds",pred:passYdPred,odds:qb.ovr>=82?"-115":"+"+(Math.round(100+rng2()*150))});}
      if(rb){var rushYdPred=Math.round((600+rb.ovr*8+rng2()*200)/50)*50;statPreds.push({name:rb.name,pos:"RB",stat:"rush yds",pred:rushYdPred,odds:rb.ovr>=80?"-110":"+"+(Math.round(120+rng2()*200))});}
      if(wr){var recYdPred=Math.round((500+wr.ovr*7+rng2()*200)/50)*50;statPreds.push({name:wr.name,pos:"WR",stat:"rec yds",pred:recYdPred,odds:wr.ovr>=80?"-105":"+"+(Math.round(130+rng2()*180))});}
    }
    var abbr=myT?myT.abbr:"TEAM";
    var takes=myRank<=3?["MFSN POWER RANKING: "+abbr+" is a legit Championship contender. Don't sleep.","Our analysts have "+abbr+" as a top-3 team. "+abbr+" to win it all: "+sbOdds+".","Vegas agrees — "+abbr+" is the real deal this season."]:myRank<=8?[abbr+" is a dark horse. If they stay healthy, watch out.","MFSN PROJECTION: "+abbr+" goes "+projWins+"-"+(17-projWins)+". Sneaky good.","Analysts are split on "+abbr+". We're going playoff bubble."]:["Tough road ahead for "+abbr+". MFSN projects "+projWins+" wins. Prove us wrong.","Rebuilding? Retooling? "+abbr+" needs a miracle to make the playoffs.","MFSN has "+abbr+" in the bottom half. Low expectations — perfect setup for a surprise."];
    return{year:year,projWins:projWins,sbOdds:sbOdds,myRank:myRank,statPreds:statPreds,headline:takes[Math.floor(rng2()*takes.length)],topSBFav:sorted[0]?sorted[0].abbr:"???",topSBFavOdds:"+"+Math.round(200+rng2()*200),generated:true};
  },
  resolve:function(pred,team,actualWins){
    if(!pred)return null;
    var diff=Math.abs(actualWins-pred.projWins);
    var verdict=diff<=1?"MFSN nailed it — predicted "+pred.projWins+", got "+actualWins+".":diff<=3?"MFSN was close — off by "+diff+" wins.":actualWins>pred.projWins?"MFSN WRONG: "+team.abbr+" EXCEEDED expectations by "+diff+" wins. 👀":"MFSN WRONG: "+team.abbr+" fell short of "+pred.projWins+" win prediction.";
    return{verdict:verdict,projWins:pred.projWins,actualWins:actualWins,diff:diff,beat:actualWins>=pred.projWins};
  }
};
