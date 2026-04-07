/**
 * MFD Weekly Challenge System
 *
 * Pool of weekly game challenges with check functions,
 * XP rewards, and difficulty tiers.
 */

export var WEEKLY_CHALLENGES={
  pool:[
    {id:"score35",label:"Score 35+ points",icon:"🎯",check:function(r){return(r.userScore||0)>=35;},xp:15,diff:"medium"},
    {id:"hold14",label:"Hold opponent under 14 points",icon:"🛡️",check:function(r){return(r.oppScore||0)<14;},xp:20,diff:"hard"},
    {id:"rush150",label:"Rush for 150+ yards",icon:"🏃",check:function(r){return(r.rushYds||0)>=150;},xp:12,diff:"medium"},
    {id:"pass350",label:"Pass for 350+ yards",icon:"🎯",check:function(r){return(r.passYds||0)>=350;},xp:12,diff:"medium"},
    {id:"win21",label:"Win by 21+ points",icon:"💪",check:function(r){return(r.userScore||0)-(r.oppScore||0)>=21;},xp:25,diff:"hard"},
    {id:"no_turnovers",label:"Zero turnovers",icon:"🧤",check:function(r){return(r.turnovers||0)===0;},xp:18,diff:"hard"},
    {id:"comeback",label:"Win after trailing at half",icon:"🔄",check:function(r){return r.trailedAtHalf&&r.won;},xp:30,diff:"elite"},
    {id:"td4",label:"Score 4+ touchdowns",icon:"🏈",check:function(r){return(r.totalTD||0)>=4;},xp:10,diff:"easy"},
    {id:"sack4",label:"Get 4+ sacks",icon:"💥",check:function(r){return(r.sacks||0)>=4;},xp:15,diff:"medium"},
    {id:"shutout",label:"Shutout opponent",icon:"🚫",check:function(r){return(r.oppScore||0)===0;},xp:50,diff:"legendary"}
  ],
  generateWeekly:function(week){
    var shuffled=WEEKLY_CHALLENGES.pool.slice();
    for(var i=shuffled.length-1;i>0;i--){
      var j=Math.floor(RNG.ui()*(i+1));
      var tmp=shuffled[i];shuffled[i]=shuffled[j];shuffled[j]=tmp;
    }
    return shuffled.slice(0,3).map(function(c){return assign({},c,{week:week,completed:false});});
  },
  checkResults:function(challenges,gameResult){
    if(!challenges||!gameResult)return{completed:[],xpEarned:0};
    var completed=[];var xp=0;
    challenges.forEach(function(c){
      if(!c.completed&&c.check(gameResult)){
        c.completed=true;
        completed.push(c);
        xp+=c.xp;
      }
    });
    return{completed:completed,xpEarned:xp};
  }
};
