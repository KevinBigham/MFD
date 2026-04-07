/**
 * MFD Offseason Events
 *
 * Generates interactive offseason events — combine surprises,
 * FA bidding wars, coaching carousel, scandals, camp standouts,
 * international signings, draft trade offers, and owner demands.
 * Each event provides player-facing choices with gameplay effects.
 */

export var OFFSEASON_EVENTS={
  templates:[
    {id:"combine_surprise",icon:"🏋️",label:"Combine Surprise",
      generate:function(ctx,rng2){
        if(!ctx.dc||ctx.dc.length===0)return null;
        var low=ctx.dc.filter(function(p){return(p.ovr||50)<=62;});
        if(low.length===0)return null;
        var p=low[Math.floor(rng2()*low.length)];
        return{type:"combine_surprise",icon:"🏋️",headline:p.name+" EXPLODES at combine — scouts scrambling!",player:p.name,playerId:p.id,
          choices:[
            {label:"Move him up your board",desc:"Reveal true potential (+12 OVR boost)",effect:{type:"ovr_boost",playerId:p.id,amount:12}},
            {label:"Trust your existing eval",desc:"No changes — stick with your scouts",effect:{type:"none"}}
          ]};
      }},
    {id:"fa_bidding_war",icon:"💰",label:"FA Bidding War",
      generate:function(ctx,rng2){
        if(!ctx.fas||ctx.fas.length===0)return null;
        var stars=ctx.fas.filter(function(p){return(p.ovr||50)>=72;});
        if(stars.length===0)return null;
        var p=stars[Math.floor(rng2()*stars.length)];
        return{type:"fa_bidding_war",icon:"💰",headline:"Bidding war erupts for "+p.name+"! Two teams drive price up 30%.",player:p.name,
          choices:[
            {label:"Match the inflated price",desc:"Pay 130% market value to guarantee signing",effect:{type:"fa_inflate",playerName:p.name,mod:1.3}},
            {label:"Walk away",desc:"Let rivals overpay — find value elsewhere",effect:{type:"none"}}
          ]};
      }},
    {id:"coaching_carousel",icon:"🎠",label:"Coaching Carousel",
      generate:function(ctx,rng2){
        var real974=ctx&&ctx.season&&Array.isArray(ctx.season.firedHCs974)?ctx.season.firedHCs974:[];
        if(real974.length>0){
          var fire974=real974[Math.floor(rng2()*real974.length)];
          return{type:"coaching_carousel",icon:"🎠",headline:(fire974.icon||"🎠")+" "+(fire974.team||"TEAM")+" fires HC "+(fire974.coach||"Unknown")+" after "+(fire974.record||"rough")+" season!",
            choices:[
              {label:"Poach their scout",desc:"Steal their scouting director (+5% draft confidence)",effect:{type:"scout_boost",amount:5}},
              {label:"Stay out of it",desc:"Focus on your own team",effect:{type:"none"}}
            ]};
        }
        var loserTeams=ctx.teams.filter(function(t){return!t.isUser&&t.losses>=10;});
        if(loserTeams.length===0)return null;
        var t=loserTeams[Math.floor(rng2()*loserTeams.length)];
        return{type:"coaching_carousel",icon:"🎠",headline:t.icon+" "+t.abbr+" fires HC "+((t.staff&&t.staff.hc)?t.staff.hc.name:"Unknown")+"!",
          choices:[
            {label:"Poach their scout",desc:"Steal their scouting director (+5% draft confidence)",effect:{type:"scout_boost",amount:5}},
            {label:"Stay out of it",desc:"Focus on your own team",effect:{type:"none"}}
          ]};
      }},
    {id:"scandal",icon:"⚠️",label:"Player Scandal",
      generate:function(ctx,rng2){
        var myTeam=ctx.teams.find(function(t){return t.id===ctx.myId;});
        if(!myTeam||!myTeam.roster||myTeam.roster.length===0)return null;
        var candidates=myTeam.roster.filter(function(p){return(p.ovr||50)>=65&&!p.injury;});
        if(candidates.length===0)return null;
        var p=candidates[Math.floor(rng2()*candidates.length)];
        return{type:"scandal",icon:"⚠️",headline:"REPORT: "+p.name+" involved in off-field incident. 4-game suspension possible.",player:p.name,playerId:p.id,
          choices:[
            {label:"Suspend him (4 games)",desc:"Show discipline — team morale +5, player misses 4 games",effect:{type:"suspend",playerId:p.id,games:4,morale:5}},
            {label:"Stand by your player",desc:"Loyalty — no suspension but morale -3, fanbase -5",effect:{type:"loyalty",morale:-3,fanbase:-5}}
          ]};
      }},
    {id:"camp_standout",icon:"🌟",label:"Training Camp Standout",
      generate:function(ctx,rng2){
        return{type:"camp_standout",icon:"🌟",headline:"Undrafted rookie turns heads at training camp!",
          choices:[
            {label:"Sign him to the roster",desc:"Add a 58-65 OVR project player with star dev trait",effect:{type:"add_udfa"}},
            {label:"Let him go",desc:"Roster is full enough",effect:{type:"none"}}
          ]};
      }},
    {id:"international",icon:"🌍",label:"International Signing",
      generate:function(ctx,rng2){
        var positions=["DL","OL","LB","TE","RB"];
        var pos=positions[Math.floor(rng2()*positions.length)];
        return{type:"international",icon:"🌍",headline:"International prospect "+pos+" available — raw but sky-high ceiling!",
          choices:[
            {label:"Sign him (high ceiling, low floor)",desc:"Add 52-60 OVR player with superstar dev trait",effect:{type:"add_international",pos:pos}},
            {label:"Pass",desc:"Too risky for your roster",effect:{type:"none"}}
          ]};
      }},
    {id:"draft_trade_offer",icon:"📞",label:"Draft Day Trade Offer",
      generate:function(ctx,rng2){
        var aiTeams=ctx.teams.filter(function(t){return!t.isUser;});
        if(aiTeams.length===0)return null;
        var t=aiTeams[Math.floor(rng2()*aiTeams.length)];
        return{type:"draft_trade_offer",icon:"📞",headline:t.icon+" "+t.abbr+" calls with blockbuster draft pick offer!",
          choices:[
            {label:"Accept: trade down 5 spots for extra 2nd rounder",desc:"More picks, lower ceiling",effect:{type:"trade_down",spots:5}},
            {label:"Decline: keep your pick",desc:"Stay pat and trust your board",effect:{type:"none"}}
          ]};
      }},
    {id:"owner_demand",icon:"👔",label:"Owner Offseason Demand",
      generate:function(ctx,rng2){
        if(ctx.ownerPatience>=70)return null;
        return{type:"owner_demand",icon:"👔",headline:"Owner demands offseason changes: 'This isn't good enough.'",
          choices:[
            {label:"Promise a splashy FA signing",desc:"Owner patience +15, but expectations rise",effect:{type:"patience_boost",amount:15}},
            {label:"Ask for patience",desc:"Owner patience +5, trust your process",effect:{type:"patience_boost",amount:5}}
          ]};
      }}
  ],
  generate:function(ctx,rng2){
    var events=[];var attempts=0;var usedTypes={};
    while(events.length<4&&attempts<25){
      attempts++;
      var template=OFFSEASON_EVENTS.templates[Math.floor(rng2()*OFFSEASON_EVENTS.templates.length)];
      if(usedTypes[template.id])continue;
      var event=template.generate(ctx,rng2);
      if(event){events.push(event);usedTypes[template.id]=true;}
    }
    return events;
  }
};
