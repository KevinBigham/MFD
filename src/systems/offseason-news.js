/**
 * MFD Offseason News Generator
 *
 * Weighted news story generator for the offseason — trade rumors,
 * coach interviews, holdout threats, viral videos, endorsements,
 * GM archetype headlines, and more. Uses _getGMArch setter for
 * optional GM archetype integration.
 */

var _getGMArch = null;
export function setGetGMArchFn(fn) { _getGMArch = fn; }

export var OFFSEASON_NEWS={
  templates:[
    {type:"trade_rumor",weight:3,generate:function(teams,myId,rng2){var t=teams[Math.floor(rng2()*teams.length)];var myT=teams.find(function(x){return x.id===myId;});var cands=myT&&myT.roster?myT.roster.filter(function(pl){return pl.ovr>=75;}):[];var p=cands.length?cands[Math.floor(rng2()*cands.length)]:null;if(!p)return null;return{headline:"🔥 MFSN EXCLUSIVE: "+t.icon+t.abbr+" has inquired about "+p.name+" ("+p.pos+"). Source: 'Multiple calls made.'",consequence:{type:"morale_dip",playerId:p.id,amount:-5},serious:true,player:p.name};}},
    {type:"coach_interview",weight:2,generate:function(teams,myId,rng2){var t=teams.filter(function(x){return x.id!==myId;})[Math.floor(rng2()*(teams.length-1))];return{headline:"📋 MFSN: Your OC is reportedly in talks with "+t.icon+t.abbr+" for their HC vacancy. Monitoring the situation.",consequence:{type:"staff_anxiety",amount:-3},serious:false};}},
    {type:"holdout_threat",weight:2,generate:function(teams,myId,rng2){var myT=teams.find(function(x){return x.id===myId;});var cands=myT&&myT.roster?myT.roster.filter(function(pl){return pl.ovr>=78&&pl.contract&&pl.contract.years<=1;}):[];var p=cands.length?cands[Math.floor(rng2()*cands.length)]:null;if(!p)return null;return{headline:"💰 MFSN: Agent for "+p.name+" says contract talks are 'not progressing.' Holdout possible if unresolved.",consequence:{type:"player_morale",playerId:p.id,amount:-8},serious:true,player:p.name};}},
    {type:"viral_video",weight:2,generate:function(teams,myId,rng2){var myT=teams.find(function(x){return x.id===myId;});var p=myT&&myT.roster?myT.roster[Math.floor(rng2()*myT.roster.length)]:null;var videos=["doing the worm at a charity gala","going viral for eating a full rotisserie chicken mid-interview","challenging a raccoon to a staring contest and losing","teaching his grandmother the two-minute drill — she ran it in 1:58"];var v=videos[Math.floor(rng2()*videos.length)];if(!p)return null;return{headline:"😂 MFSN TRENDING: "+p.name+" went viral after "+v+". +12M views. Endorsement calls flooding in.",consequence:{type:"fanbase_boost",amount:3},serious:false,player:p.name};}},
    {type:"alien_rumor",weight:1,generate:function(teams,myId,rng2){var myT=teams.find(function(x){return x.id===myId;});var p=myT&&myT.roster?myT.roster.filter(function(pl){return pl.devTrait==="superstar";})[0]||myT.roster[0]:null;if(!p)return null;return{headline:"👽 MFSN (Satire Desk): Sources say "+p.name+" doesn't sleep, doesn't eat, and once completed a 400-yd practice blindfolded. Is he human? We report, you decide.",consequence:{type:"morale_boost",playerId:p.id,amount:5},serious:false,player:p.name};}},
    {type:"jersey_drama",weight:2,generate:function(teams,myId,rng2){var jerseyNums=[0,1,7,12,13,17,24,80,99];var num=jerseyNums[Math.floor(rng2()*jerseyNums.length)];var myT=teams.find(function(x){return x.id===myId;});var abbr=myT?myT.abbr:"TEAM";return{headline:"👕 MFSN: Two "+abbr+" players reportedly in a standoff over jersey #"+num+". Team source: 'Tense, but manageable.'",consequence:{type:"chemistry_dip",amount:-2},serious:false};}},
    {type:"star_endorsement",weight:2,generate:function(teams,myId,rng2){var myT=teams.find(function(x){return x.id===myId;});var cands=myT&&myT.roster?myT.roster.filter(function(pl){return pl.ovr>=80;}):[];var p=cands.length?cands[Math.floor(rng2()*cands.length)]:null;var brands=["a luxury SUV brand","a hot sauce company","a meditation app","a fast-casual taco chain","a crypto exchange (uh oh)"];if(!p)return null;return{headline:"💸 MFSN: "+p.name+" signs $3.2M endorsement deal with "+brands[Math.floor(rng2()*brands.length)]+". 'He earned it,' says agent.",consequence:{type:"morale_boost",playerId:p.id,amount:6},serious:false,player:p.name};}},
    {type:"gm_archetype_rivalry",weight:3,generate:function(teams,myId,rng2){
      var rivals=teams.filter(function(t){return t.id!==myId;});
      if(!rivals.length)return null;
      var rival=rivals[Math.floor(rng2()*rivals.length)];
      var arch=typeof _getGMArch==="function"?_getGMArch(rival):null;
      if(!arch)return null;
      var headlines={
        analytics:["📊 MFSN: "+rival.icon+rival.abbr+" GM defends unconventional pick: 'The model said so. That's enough.'","📊 MFSN: "+rival.abbr+" front office reportedly running 400+ simulations per draft pick. Critics say 'relax.'"],
        old_school:["🧱 MFSN: "+rival.icon+rival.abbr+" GM on FA splash signings: 'We don't chase. We build from the trenches up.'","🧱 MFSN: "+rival.abbr+" passes on top WR prospect. 'We needed a guard. Nobody wins with weak guards.'"],
        contender:["🏆 MFSN: "+rival.icon+rival.abbr+" GM goes ALL IN — trades three 1sts for superstar. 'Window's open. Deal with it.'","🏆 MFSN: "+rival.abbr+" owner gives GM 'compete or clean out your desk' ultimatum. No comment from team."],
        rebuilder:["🛠️ MFSN: "+rival.icon+rival.abbr+" trades away entire core. Fans furious. GM: 'Trust the process.'","🛠️ MFSN: "+rival.abbr+" passes on every major FA. 'Those contracts are anchors. We accumulate picks.'"],
        moneyball:["💸 MFSN: "+rival.icon+rival.abbr+" quietly signs below-market kicker. Analytics says he'll be elite. We'll see.","💸 MFSN: "+rival.abbr+" GM on turning down $30M WR: 'Every player has a price. That wasn't our price.'"],
        loyalist:["🤝 MFSN: "+rival.icon+rival.abbr+" re-signs aging star well above market value. 'He bleeds our colors.'","🤝 MFSN: "+rival.abbr+" GM passes on trade rumors: 'You don't build culture by selling your people.'"]
      };
      var pool=headlines[arch.id]||[];
      if(!pool.length)return null;
      var line=pool[Math.floor(rng2()*pool.length)];
      return{headline:line,consequence:{type:"league_buzz",amount:0},serious:false,rival:rival.abbr,archetype:arch.id};
    }}
  ],
  generate:function(teams,myId,rng2){
    var stories=[];var attempts=0;
    while(stories.length<5&&attempts<20){
      attempts++;
      var pool=OFFSEASON_NEWS.templates;
      var totalWeight=pool.reduce(function(s,t){return s+t.weight;},0);
      var roll=rng2()*totalWeight;var cumulative=0;var chosen=null;
      for(var i=0;i<pool.length;i++){cumulative+=pool[i].weight;if(roll<=cumulative){chosen=pool[i];break;}}
      if(!chosen)continue;
      var story=chosen.generate(teams,myId,rng2);
      if(story&&!stories.some(function(s){return s.type===chosen.type;})){story.type=chosen.type;story.id=chosen.type+"_"+attempts;stories.push(story);}
    }
    return stories;
  }
};
