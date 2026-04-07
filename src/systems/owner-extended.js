/**
 * MFD Owner Extended Systems
 *
 * Owner patience tracking, confidence arc stages,
 * and consequence/ultimatum generation.
 */

import { cl } from '../utils/helpers.js';

export var OWNER_PATIENCE={
  drainRate:{win_now:6,patient_builder:2,profit_first:4,fan_favorite:4,legacy_builder:3},
  gainRate:{win_now:12,patient_builder:6,profit_first:8,fan_favorite:10,legacy_builder:8},
  tick:function(current,owner,team,won,isPlayoffs){
    if(!owner||!owner.archetypeId)return current;
    var arch=owner.archetypeId;
    var drain=OWNER_PATIENCE.drainRate[arch]||5;
    var gain=OWNER_PATIENCE.gainRate[arch]||8;
    var delta=0;
    if(won){delta=isPlayoffs?gain*1.5:gain;}else{delta=isPlayoffs?-drain*2:-drain;}
    if(isPlayoffs)delta+=15;// making playoffs adds patience regardless of W/L
    if(won&&(team.streak||0)>=3)delta+=4;
    if(!won&&(team.streak||0)<=-3)delta-=4;
    return Math.max(0,Math.min(100,current+delta));
  },
  status:function(patience){
    if(patience>=85)return{label:"ECSTATIC",color:"#4ade80",emoji:"🤩",desc:"Owner is throwing money at problems.",barColor:"#4ade80"};
    if(patience>=65)return{label:"PLEASED",color:"#60a5fa",emoji:"😊",desc:"Owner is happy. Business as usual.",barColor:"#60a5fa"};
    if(patience>=45)return{label:"WATCHING",color:"#fbbf24",emoji:"😐",desc:"Owner is paying attention. Better perform.",barColor:"#fbbf24"};
    if(patience>=25)return{label:"IMPATIENT",color:"#f97316",emoji:"😠",desc:"Owner is losing faith. Heat is rising.",barColor:"#f97316"};
    if(patience>=10)return{label:"FURIOUS",color:"#ef4444",emoji:"🔥",desc:"DANGER: One more bad week triggers a meeting.",barColor:"#ef4444"};
    return{label:"CRISIS",color:"#7f1d1d",emoji:"💀",desc:"OWNER MEETING INCOMING. Career on the line.",barColor:"#dc2626"};
  }
};
export var OWNER_CONFIDENCE_ARC={
  stages:[
    {id:"PATIENT",min:70,emoji:"🟢",color:"#4ade80",heat:"#16a34a",desc:"Owner trusts the plan and gives you runway."},
    {id:"RESTLESS",min:50,emoji:"🟡",color:"#facc15",heat:"#f59e0b",desc:"Owner needs proof. Results must trend up soon."},
    {id:"DEMANDING",min:30,emoji:"🟠",color:"#fb923c",heat:"#ea580c",desc:"Owner expects immediate results and visible action."},
    {id:"ULTIMATUM",min:0,emoji:"🔴",color:"#ef4444",heat:"#dc2626",desc:"One more bad stretch can trigger major consequences."}
  ],
  normalize:function(v,fallback){
    if(typeof v!=="number"||!isFinite(v))return fallback;
    return Math.max(0,Math.min(100,v));
  },
  score:function(patience,mood){
    var p=OWNER_CONFIDENCE_ARC.normalize(patience,50);
    var m=OWNER_CONFIDENCE_ARC.normalize(mood,70);
    return Math.round(p*0.65+m*0.35);
  },
  get:function(patience,mood){
    var score=OWNER_CONFIDENCE_ARC.score(patience,mood);
    var stage=OWNER_CONFIDENCE_ARC.stages[OWNER_CONFIDENCE_ARC.stages.length-1];
    for(var i=0;i<OWNER_CONFIDENCE_ARC.stages.length;i++){
      var s=OWNER_CONFIDENCE_ARC.stages[i];
      if(score>=s.min){stage=s;break;}
    }
    var severity=stage.id==="PATIENT"?0:stage.id==="RESTLESS"?1:stage.id==="DEMANDING"?2:3;
    var nextTarget=stage.id==="PATIENT"?null:(stage.id==="RESTLESS"?70:(stage.id==="DEMANDING"?50:30));
    var heat=Math.max(0,Math.min(100,100-score));
    return{id:stage.id,label:stage.id,emoji:stage.emoji,color:stage.color,heatColor:stage.heat,desc:stage.desc,
      score:score,heat:heat,severity:severity,nextTarget:nextTarget};
  },
  transition:function(prevArc,nextArc){
    if(!prevArc||!nextArc||prevArc.id===nextArc.id)return null;
    var gotWorse=nextArc.severity>prevArc.severity;
    if(gotWorse){
      return{color:nextArc.id==="ULTIMATUM"?"red":"orange",
        text:"🔥 Owner confidence drops to "+nextArc.id+" ("+nextArc.score+"). "+nextArc.desc};
    }
    return{color:"green",text:"✅ Owner confidence improves to "+nextArc.id+" ("+nextArc.score+")."};
  }
};
export var OWNER_CONSEQUENCES={
  ultimatums:[
    {id:"trade_worst",label:"Trade your worst contract within 3 weeks",desc:"Move your highest-paid underperformer.",
      check:function(team,startRoster,currentRoster){
        if(!startRoster||!currentRoster)return false;
        var startIds={};startRoster.forEach(function(p){startIds[p.id]=true;});
        return currentRoster.some(function(p){return !startIds[p.id];})||currentRoster.length<startRoster.length;
      }},
    {id:"fire_coord",label:"Fire a coordinator immediately",desc:"Replace your OC or DC.",
      check:function(team,startStaff,currentStaff){
        if(!startStaff||!currentStaff)return false;
        return(currentStaff.oc&&startStaff.oc&&currentStaff.oc.id!==startStaff.oc.id)||(currentStaff.dc&&startStaff.dc&&currentStaff.dc.id!==startStaff.dc.id);
      }},
    {id:"cut_payroll",label:"Cut $8M in payroll within 3 weeks",desc:"Release expensive players to show fiscal responsibility.",
      check:function(team,startCap,currentCap){return(startCap-currentCap)>=8;}}
  ],
  generateUltimatums:function(rng2){
    var shuffled=OWNER_CONSEQUENCES.ultimatums.slice();
    for(var i=shuffled.length-1;i>0;i--){var j=Math.floor(rng2()*(i+1));var t=shuffled[i];shuffled[i]=shuffled[j];shuffled[j]=t;}
    return shuffled.slice(0,3);
  },
  furiousPenalties:[
    {id:"fa_tax",label:"Owner restricts free agency spending",effect:{faMod:1.25}},
    {id:"trade_penalty",label:"Owner limits trade flexibility",effect:{tradeMod:1.20}},
    {id:"budget_cut",label:"Owner slashes operations budget",effect:{cashMod:0.85}}
  ],
  watchingMessages:[
    "Owner sent a text: 'We need to talk about this team.'",
    "Owner was seen meeting with other coaching candidates.",
    "Local media reports ownership is 'evaluating all options.'",
    "Owner skipped the last home game. Sources say patience is thin."
  ]
};
