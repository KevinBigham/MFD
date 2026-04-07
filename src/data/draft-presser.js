/**
 * MFD Draft Day Press Conference
 *
 * Post-draft press conference questions that react to draft grade,
 * first-round picks, and late-round selections. Answers affect
 * owner mood, morale, and chemistry.
 */

export var DRAFT_PRESSER975={
  generateQuestions:function(grade,picks,team,year){
    if(!grade||!picks||picks.length===0||!team)return[];
    var questions=[];
    var gradeKey=(grade.grade||"C").replace("+","_PLUS").replace("-","_MINUS");
    var gradeVal={A_PLUS:10,A:9,A_MINUS:8,B_PLUS:8,B:7,B_MINUS:6,C_PLUS:6,C:5,C_MINUS:4,D:3,F:1};
    var gv=gradeVal[gradeKey]||5;
    if(gv>=8){
      questions.push({
        q:"MFSN gave you an "+grade.grade+" for this draft. Walk us through your strategy.",
        opts:[
          {text:"We identified our needs and attacked them aggressively.",effect:{ownerMood:3,morale:2}},
          {text:"The board fell our way. Sometimes preparation meets opportunity.",effect:{ownerMood:2,morale:1}},
          {text:"Grades don't matter. Ask me again in three years.",effect:{ownerMood:1,morale:3}}
        ]
      });
    }else if(gv<=4){
      questions.push({
        q:"Analysts are calling this draft a "+grade.grade+". How do you respond to the critics?",
        opts:[
          {text:"We drafted for our system. Not for media grades.",effect:{ownerMood:-1,morale:3,chemistry:2}},
          {text:"We'll prove them wrong on the field.",effect:{morale:5,chemistry:1,ownerMood:-2}},
          {text:"I understand the concern. We have a plan.",effect:{ownerMood:2,morale:-1}}
        ]
      });
    }else{
      questions.push({
        q:"How do you feel about your draft class?",
        opts:[
          {text:"I'm excited about every player we added.",effect:{morale:2,chemistry:1}},
          {text:"We got our guys. That's all that matters.",effect:{morale:3,ownerMood:1}},
          {text:"Time will tell. We'll evaluate in camp.",effect:{morale:1,ownerMood:1}}
        ]
      });
    }
    var rd1=(picks||[]).filter(function(p){return (p._draftRound||0)===1;});
    if(rd1.length>0){
      var p1=rd1[0];
      questions.push({
        q:"You took "+p1.name+" with your first-round pick. Why "+p1.pos+"?",
        opts:[
          {text:"Best player available. Period.",effect:{morale:1,ownerMood:1}},
          {text:p1.pos+" was our biggest need. He fills a critical hole.",effect:{morale:2}},
          {text:"Wait until you see what this kid can do. He's special.",effect:{morale:3,chemistry:1}}
        ]
      });
    }
    var latePick=(picks||[]).filter(function(p){return (p._draftRound||7)>=4;});
    if(latePick.length>0){
      var lp=latePick[0];
      questions.push({
        q:"Tell us about the "+((lp._draftRound||"late"))+"-round pick "+lp.name+". A lot of people didn't have him on their boards.",
        opts:[
          {text:"Our scouts loved him. We had him ranked much higher.",effect:{morale:2}},
          {text:"He's a project, but the upside is incredible.",effect:{morale:1,chemistry:1}},
          {text:"We'll let the player's play speak for itself.",effect:{morale:1,ownerMood:1}}
        ]
      });
    }
    return questions.slice(0,3);
  }
};
