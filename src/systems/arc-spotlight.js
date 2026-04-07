/**
 * MFD Arc Spotlight
 *
 * Broadcast commentary system for player arc states.
 * 8 arc types with won/lost line pools and badge styling.
 */
import { RNG } from '../utils/rng.js';

export var ARC_SPOTLIGHT={
  lines:{
    BREAKOUT:{
      won:[
        "{name} IS THE REAL DEAL. Another week, another statement performance. The {pos} market just got reset.",
        "You cannot stop {name} right now. Whatever they're paying this kid — it's not enough.",
        "BREAKOUT WATCH is officially over. {name} has arrived. Full stop.",
        "Week after week, {name} keeps proving the skeptics wrong. That\u2019s what franchise players do."
      ],
      lost:[
        "{name} is showing flashes even in the loss. This kid's arc doesn't stop — just a speed bump.",
        "Don't let the L fool you. {name} was the brightest thing out there today. Future is bright.",
        "Hard to break out when your team's struggling. {name} still stands out. That's rare."
      ],
      badge:"\ud83c\udf31 BREAKOUT",badgeColor:"#34d399"
    },
    ELITE:{
      won:[
        "ELITE. Not a conversation anymore. {name} is the best {pos} in this league and it isn't close.",
        "When the game was on the line, {name} delivered. That\u2019s what All-Pro looks like.",
        "{name} just put on a masterclass. The film room is going to have a lot to say about that one.",
        "Hall of Fame trajectory. {name} keeps piling up the kind of performances that define legacies."
      ],
      lost:[
        "{name} still balled out. Can\u2019t blame them for this one. Team needs to build around this player.",
        "Even in a rough one, {name} showed why they\u2019re the best. Carries a heavy load alone too often.",
        "The {pos} position has one clear king right now and it\u2019s {name}. Today doesn\u2019t change that."
      ],
      badge:"\u2b50 ELITE",badgeColor:"#fbbf24"
    },
    SLUMP:{
      won:[
        "Let\u2019s see if today was the turning point for {name}. They needed a game like that.",
        "{name} had flashes today — but is it enough to break out of the funk? Time will tell.",
        "Maybe this is the reset {name} needed. One win doesn\u2019t fix a slump, but it\u2019s a start."
      ],
      lost:[
        "Rough go again for {name}. The slump is real and the questions are getting louder.",
        "At what point does the coaching staff make a change? {name} needs to find something — and fast.",
        "There\u2019s a player in there. The {name} from earlier in their career still exists. But right now? Nowhere to be found."
      ],
      badge:"\ud83d\udcc9 SLUMP",badgeColor:"#ef4444"
    },
    COMEBACK:{
      won:[
        "REDEMPTION ROAD continues for {name}. They said the story was over — they were wrong.",
        "You can\u2019t write a better comeback story. {name} has been through it all and keeps showing up.",
        "The league counted {name} out. Big mistake. That performance today was personal."
      ],
      lost:[
        "Setback on the comeback trail for {name}. But nobody said redemption was a straight line.",
        "{name} is fighting. You can see it. The comeback isn\u2019t dead — just taking longer than hoped.",
        "Still believe in {name}. Today hurt, but the arc isn\u2019t over."
      ],
      badge:"\ud83d\udd04 COMEBACK",badgeColor:"#22d3ee"
    },
    DECLINE:{
      won:[
        "Father Time undefeated — but {name} is fighting back today. Good win, great effort.",
        "Maybe we wrote {name} off too soon. One more chapter left in that story.",
        "Veterans find a way. {name} grinding it out — a masterclass in experience over athleticism."
      ],
      lost:[
        "Is this the twilight for {name}? Hard to watch greatness fade, but the numbers don\u2019t lie.",
        "The decline arc is real. {name} has given everything to this game. How much is left in the tank?",
        "Teams around the league are taking note of {name}\u2019s regression. Tough conversations ahead."
      ],
      badge:"\ud83d\udd70\ufe0f DECLINE",badgeColor:"#94a3b8"
    },
    HOLDOUT:{
      won:[
        "{name} playing through contract drama — that\u2019s a professional. But this situation needs to be resolved.",
        "All-Pro performance, contract dispute in the background. {name} deserves their money.",
        "You can\u2019t question the effort. {name} is giving everything while the front office haggles. Respect."
      ],
      lost:[
        "Hard to play your best ball when your future is uncertain. {name} deserves clarity.",
        "The contract situation is clearly affecting the locker room. {name} needs to be locked up.",
        "Get this deal done. {name} is too important to let this drag on."
      ],
      badge:"\ud83d\udcb0 HOLDOUT",badgeColor:"#f97316"
    },
    SWAN_SONG:{
      won:[
        "One more chapter for {name}. The career is winding down but the passion? Still burning.",
        "If this is the end, {name} is going out with everything left on the field. Beautiful.",
        "Veteran leadership on full display. {name} knows every play could be their last — and plays like it."
      ],
      lost:[
        "Hard to watch the final chapter of a great career play out. {name} deserves better than this.",
        "The legend is fading. {name} gave this game everything. Today, the game gave back nothing.",
        "Whenever {name} hangs up the cleats, the Hall of Fame speech writes itself. That career is one for the ages."
      ],
      badge:"\ud83e\udda2 SWAN SONG",badgeColor:"#a855f7"
    },
    MENTOR:{
      won:[
        "{name} quietly making everyone around them better. That\u2019s what a mentor does — the stats don\u2019t capture it.",
        "Leadership by example from {name}. Watch how the young guys play differently when they\u2019re on the field.",
        "Veteran presence matters. {name} is the heartbeat of that locker room whether they're starting or not."
      ],
      lost:[
        "{name} still the emotional anchor even in a tough loss. Team wouldn\u2019t be the same without them.",
        "Hard to quantify what {name} brings. But watch the young guys around them develop — that\u2019s the legacy.",
        "The mentor role is thankless. {name} doing it anyway. Class act."
      ],
      badge:"\ud83d\udcda MENTOR",badgeColor:"#60a5fa"
    }
  },
  generate:function(roster,won,week,myTeam){
    var spots=[];
    var safeRoster=Array.isArray(roster)?roster:[];
    var arcOrder=["BREAKOUT","SLUMP","ELITE","COMEBACK","SWAN_SONG","HOLDOUT","DECLINE","MENTOR"];
    arcOrder.forEach(function(arcKey){
      var p=null;
      for(var i=0;i<safeRoster.length;i++){
        var row=safeRoster[i];
        if(!row)continue;
        if((row._arcState||"")===arcKey&&row.isStarter&&(row.ovr||0)>=70){p=row;break;}
      }
      if(!p)return;
      var pool=ARC_SPOTLIGHT.lines[arcKey];if(!pool)return;
      var lines=won?pool.won:pool.lost;
      var line=lines[Math.floor(RNG.ui()*lines.length)];
      line=line.replace(/\{name\}/g,p.name).replace(/\{pos\}/g,p.pos);
      spots.push({arcKey:arcKey,badge:pool.badge,badgeColor:pool.badgeColor,
        playerName:p.name,pos:p.pos,ovr:p.ovr,age:p.age,
        line:line,week:week});
    });
    return spots.slice(0,3);
  }
};
