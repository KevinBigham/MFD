/**
 * MFD Front Office System
 *
 * 7 staff roles (GM, scouting director, analytics, cap analyst,
 * personnel, player relations, medical), 15 personality traits,
 * staff generation, bonus calculations, and backstory data.
 */

import { cl } from '../utils/helpers.js';
import { RNG, U } from '../utils/rng.js';

export var FO_FIRST_NAMES=["Mike","Dan","Sarah","Chris","Pat","Alex","Jordan","Casey","Morgan","Taylor",
  "Marcus","Keisha","Darius","Elena","Tommy","Priya","Lamar","Gwen","Vic","Nadia","Hank",
  "Simone","Reggie","Becca","Omar","Trish","DeShawn","Lucia","Colt","Vera","Zach","Imani",
  "Robbie","Faye","Luther","Mia","Calvin","Sasha","Terrence","Brooke","Gus","Yuki","Fletcher",
  "Nina","Scotty","Rhea","Wendell","Cleo","Brandon","Tina"];
export var FO_LAST_NAMES=["Reynolds","Nakamura","O'Brien","Kowalski","Chen","Williams","Thompson","Garcia",
  "Patel","Kim","Torres","Jackson","Okafor","Marchetti","Lundqvist","Hassan","Delacroix","Brennan",
  "Vasquez","Okonkwo","Hartley","Rosenberg","Papadopoulos","Sutherland","Ferreira","Owens","Nguyen",
  "MacPherson","Abebe","Fitzgerald","Reyes","Yamamoto","Holloway","Petrov","Adeyemi","Castellano",
  "Higgins","Park","Dubois","McLaughlin","Amara","Johansson","Washington","O'Sullivan","Diallo",
  "Bergman","Adkins","Romero","Nakashima","Calloway"];
export var FO_TRAITS={
  analytical:{label:"Analytical",icon:"📈",desc:"Data-first decisions — finds edge cases AI misses"},
  old_school:{label:"Old School",icon:"📼",desc:"Trusts the eye test — great at reading character"},
  aggressive:{label:"Aggressive",icon:"🔥",desc:"Swings for blockbuster deals, high upside/variance"},
  conservative:{label:"Conservative",icon:"🛡️",desc:"Avoids busts, steady hand under cap pressure"},
  innovative:{label:"Innovative",icon:"💡",desc:"Ahead of the curve — spots market inefficiencies"},
  moneyball:{label:"Moneyball",icon:"💰",desc:"Extracts value from undervalued players"},
  film_guru:{label:"Film Guru",icon:"🎬",desc:"Watches every snap — deep player tendencies knowledge"},
  connector:{label:"Connector",icon:"🤝",desc:"Players love them — boosts morale and retention"},
  negotiator:{label:"Negotiator",icon:"📝",desc:"Gets deals done — squeezes value in every contract"},
  developer:{label:"Developer",icon:"🌱",desc:"Player development whisperer — POT players blossom"},
  grinder:{label:"Grinder",icon:"⚙️",desc:"Outworks everyone — weekly scouting is always thorough"},
  visionary:{label:"Visionary",icon:"🔭",desc:"Builds dynasties — long-term roster architecture"},
  risk_taker:{label:"Risk Taker",icon:"🎲",desc:"High-upside hires — boom or bust roster moves"},
  loyalist:{label:"Loyalist",icon:"🏛️",desc:"Builds team culture — reduces staff poaching"},
  numbers_wizard:{label:"Numbers Wizard",icon:"🔢",desc:"Cap genius — finds space others can't see"}
};
export var FO_BACKSTORIES={
  gm:["Former college GM who rebuilt 3 programs","Rose from intern to front office in 6 seasons",
    "Ex-agent who crossed to the team side","Salary cap specialist poached from a rival GM",
    "Former player rep who learned the business inside out","Division I AD transitioning to pro football"],
  scout_dir:["Spent 20 years scouting the SEC before this role","Former college coach who went full-time scouting",
    "Ran the combine testing operation for 8 years","Built his reputation finding undrafted gems",
    "International scout who re-tooled for the US market","Deep Midwest roots — knows every small-school sleeper"],
  analytics:["MIT stats grad with a football obsession","Came from NBA analytics and translated the model",
    "Self-taught coder who built his own scouting database","Former Vegas oddsmaker who moved to football ops",
    "Led the league in expected points modeling for 2 years","Started as an intern, stayed for the data"],
  cap_analyst:["CPA who discovered football pays better","Structured 3 championship rosters under the cap",
    "Known for the restructure that saved a dynasty team","Young gun — already two championship cap designs",
    "Survived two CBA negotiations as team rep","Former players association economist who switched to team ops"],
  personnel:["Played 4 years in the league — knows what teams need","Cross-sport background in basketball ops",
    "High school coach turned eval specialist","Spent a decade in UDFA evaluation","Built roster that made it to the title game twice",
    "Covers every position group with equal depth"],
  player_relations:["Players call him first when things go wrong","Former chaplain who transitioned to team ops",
    "Built the most cohesive locker room in recent memory","Agent-turned-advocate for the player side",
    "Specializes in keeping stars happy on mid-tier deals","Known for defusing locker room situations quickly"],
  medstaff:["Sports medicine PhD with 15 years pro football experience","Pioneered load management protocols",
    "Reduced IR stints by 30% at his last stop","Developed a return-to-play model now used league-wide",
    "Former Olympic sports scientist who moved to football","Built a recovery program that extended careers"]
};
export var FRONT_OFFICE={
  roles:[
    {id:"gm",title:"Asst. General Manager",icon:"👔",affects:["trades","cap","drafting","negotiation"],salaryRange:[3,10],
      desc:"Handles trade negotiations, cap logistics, and draft-day decisions on your behalf.",
      color:"#a78bfa",tier:"core"},
    {id:"scout_dir",title:"Scouting Director",icon:"🔍",affects:["drafting","evaluation"],salaryRange:[1.5,5],
      desc:"Sharpens your draft intel — tighter prospect OVR estimates and fewer busts.",
      color:"#22d3ee",tier:"core"},
    {id:"analytics",title:"Analytics Coordinator",icon:"📊",affects:["gameplan","evaluation"],salaryRange:[1,4],
      desc:"Turns film and data into gameplanning edges and scouting accuracy boosts.",
      color:"#4ade80",tier:"core"},
    {id:"cap_analyst",title:"Cap Analyst",icon:"💰",affects:["cap","restructure","extension"],salaryRange:[1,3.5],
      desc:"Finds hidden cap space, models extensions, and prevents dead-money disasters.",
      color:"#fbbf24",tier:"specialist"},
    {id:"personnel",title:"Player Personnel Dir.",icon:"🏈",affects:["drafting","waivers","trades"],salaryRange:[1.5,4],
      desc:"Runs UDFA claims, waiver wire strategy, and depth chart evaluation.",
      color:"#f97316",tier:"specialist"},
    {id:"player_relations",title:"Player Relations Mgr.",icon:"🤝",affects:["morale","holdouts","chemistry"],salaryRange:[0.8,2.5],
      desc:"Keeps the locker room calm — reduces holdouts and chemistry crashes.",
      color:"#ec4899",tier:"specialist"},
    {id:"medstaff",title:"Medical Director",icon:"🏥",affects:["injuries","recovery","durability"],salaryRange:[1,3],
      desc:"Reduces injury frequency and shortens recovery timelines for your roster.",
      color:"#6ee7b7",tier:"specialist"}
  ],
  generateStaff:function(roleId){
    var role=null;
    FRONT_OFFICE.roles.forEach(function(r){if(r.id===roleId)role=r;});
    if(!role)return null;
    var ovr=cl(Math.round(45+RNG.ai()*45),40,95);
    var salary=Math.round((role.salaryRange[0]+(role.salaryRange[1]-role.salaryRange[0])*(ovr-40)/55)*10)/10;
    salary=Math.max(role.salaryRange[0],Math.round((salary+(RNG.ai()-0.5))*10)/10);
    var traitKeys=Object.keys(FO_TRAITS);
    var trait=traitKeys[Math.floor(RNG.ai()*traitKeys.length)];
    var backstories=FO_BACKSTORIES[roleId]||FO_BACKSTORIES.gm;
    return{
      id:U(),roleId:roleId,title:role.title,icon:role.icon,color:role.color||"#a78bfa",
      name:FO_FIRST_NAMES[Math.floor(RNG.ai()*FO_FIRST_NAMES.length)]+" "+FO_LAST_NAMES[Math.floor(RNG.ai()*FO_LAST_NAMES.length)],
      ovr:ovr,salary:salary,
      specialty:role.affects[Math.floor(RNG.ai()*role.affects.length)],
      trait:trait,traitData:FO_TRAITS[trait]||FO_TRAITS.analytical,
      backstory:backstories[Math.floor(RNG.ai()*backstories.length)],
      yearsLeft:cl(Math.floor(1+RNG.ai()*4),1,5),
      tier:role.tier||"core"
    };
  },
  getBonus:function(staff,action){
    if(!staff||staff.length===0)return 0;
    var bonus=0;
    staff.forEach(function(s){
      var role=null;
      FRONT_OFFICE.roles.forEach(function(r){if(r.id===s.roleId)role=r;});
      if(role&&role.affects.indexOf(action)>=0){
        bonus+=Math.round(((s.ovr||50)-50)*0.1*10)/10;
      }
    });
    return Math.round(bonus*10)/10;
  },
  getCandidates:function(roleId,count){
    var candidates=[];
    for(var i=0;i<(count||4);i++){candidates.push(FRONT_OFFICE.generateStaff(roleId));}
    candidates.sort(function(a,b){return b.ovr-a.ovr;});
    return candidates;
  }
};
