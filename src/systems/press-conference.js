/**
 * MFD Press Conference System
 *
 * Post-game press conference questions with mood-aware filtering,
 * response options with morale/owner/media effects,
 * and coach personality opener integration.
 */

var pressConferenceRuntime = {
  getCoachPersonalities: function () {
    if (typeof globalThis === 'undefined') return null;
    return globalThis.COACH_PERSONALITIES_991 || null;
  }
};

export function configurePressConferenceRuntime(nextRuntime){
  pressConferenceRuntime=Object.assign({},pressConferenceRuntime,nextRuntime||{});
}

export var PRESS_CONF_986={
  questions:[
    {q:"Coach, how do you assess your team's performance this week?",type:"general"},
    {q:"Your {pos} had a rough game. Are you concerned?",type:"negative"},
    {q:"The playoff picture is getting tight. How's the locker room?",type:"pressure"},
    {q:"Fans are calling for changes. Your response?",type:"fan_pressure"},
    {q:"Your star player's contract is up soon. Any updates?",type:"contract"},
    {q:"What adjustments are you making for next week?",type:"strategy"},
    {q:"The owner seems unhappy. Is your job safe?",type:"hot_seat"},
    {q:"That was a dominant performance. What's the secret?",type:"positive"}
  ],
  responses:{
    confident:{label:"💪 Confident",morale:2,ownerMood:1,media:1},
    humble:{label:"🙏 Humble",morale:1,ownerMood:2,media:0},
    deflect:{label:"🤷 Deflect",morale:0,ownerMood:0,media:-1},
    fired_up:{label:"🔥 Fired Up",morale:3,ownerMood:-1,media:2}
  },
  generate:function(team,week,won,scoreDiff,rng2){
    var pool=PRESS_CONF_986.questions.slice();
    if(won&&scoreDiff>14)pool=pool.filter(function(q){return q.type!=="negative"&&q.type!=="hot_seat";});
    if(!won&&scoreDiff<-14)pool=pool.filter(function(q){return q.type!=="positive";});
    var selected=[];
    for(var i=0;i<Math.min(3,pool.length);i++){
      var idx=Math.floor(rng2()*pool.length);
      selected.push(pool.splice(idx,1)[0]);
    }
    // v99.2: Coach personality opener from COACH_PERSONALITIES_991
    var coachQuote=null;
    try{
      var archetypes=["grinder","professor","hothead","zen","visionary","firestarter"];
      var teamArchetype=archetypes[Math.floor(rng2()*archetypes.length)];
      var coachPersonalities=pressConferenceRuntime.getCoachPersonalities?pressConferenceRuntime.getCoachPersonalities():null;
      var persona=coachPersonalities&&coachPersonalities[teamArchetype];
      if(persona){
        var pool2=won?persona.afterWin:persona.afterLoss;
        if(pool2&&pool2.length)coachQuote={text:pool2[Math.floor(rng2()*pool2.length)],label:persona.label,icon:persona.icon};
      }
    }catch(e){}
    return {questions:selected,coachQuote:coachQuote};
  }
};
