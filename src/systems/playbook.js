/**
 * MFD Playbook — Offensive & Defensive Play Definitions
 *
 * Complete playbook with run plays, short/deep passes,
 * defensive plays (blitz, zone, man), and special teams.
 * Each play has yardage ranges, probability modifiers,
 * and broadcast commentary lines.
 */
import { RNG } from '../utils/rng.js';

export var PLAYBOOK_986={
  // ── OFFENSIVE PLAYS ──
  offense:{
    run:[
      {id:"hb_dive",label:"HB Dive",icon:"🏈",desc:"A-gap power",type:"run",
        ydsBase:[1,5],bigPlay:0.06,fumble:0.02,commentary:["Dives into the A-gap","Runs straight up the gut","Between the guards"]},
      {id:"hb_toss",label:"HB Toss",icon:"⚡",desc:"Outside speed",type:"run",
        ydsBase:[-2,8],bigPlay:0.12,fumble:0.03,commentary:["Toss to the left side","Pitch play to the outside!","Sweeps around the edge"]},
      {id:"hb_counter",label:"Counter",icon:"🔄",desc:"Misdirection run",type:"run",
        ydsBase:[0,7],bigPlay:0.10,fumble:0.02,commentary:["Counter play — misdirection!","Fakes left, cuts right!","Counter run behind the pulling guard"]},
      {id:"hb_draw",label:"Draw Play",icon:"🎭",desc:"Fake pass, delayed run",type:"run",
        ydsBase:[0,9],bigPlay:0.09,fumble:0.02,commentary:["Draw play!","Fake drop-back — it's a run!","Delayed handoff — the DL bit!"]},
      {id:"qb_sneak",label:"QB Sneak",icon:"🤫",desc:"Short yardage — push the pile",type:"run",
        ydsBase:[0,3],bigPlay:0.01,fumble:0.01,commentary:["QB sneak!","Push the pile!","Tush push!","Quarterback wedge"]},
      {id:"power_sweep",label:"Power Sweep",icon:"🦬",desc:"Pulling guards lead the way",type:"run",
        ydsBase:[0,6],bigPlay:0.08,fumble:0.02,commentary:["Power sweep!","Guards pulling — follow the blockers!","Sweep to the strong side!"]},
      {id:"jet_sweep",label:"Jet Sweep",icon:"💨",desc:"WR takes pitch on jet motion — explosive outside run",type:"run",
        ydsBase:[-2,14],bigPlay:0.30,fumble:0.03,commentary:["Jet sweep!","WR takes the pitch on jet motion!","Speedy receiver turns the corner — huge gain possible!","Fly sweep — he's got daylight!"]},
      {id:"wr_reverse",label:"WR Reverse",icon:"🔄",desc:"WR takes handoff going opposite direction — misdirection",type:"run",
        ydsBase:[-4,16],bigPlay:0.28,fumble:0.04,commentary:["WR Reverse!","Wide receiver on the end-around!","Misdirection — the defense is confused!","Handoff to the wide receiver going the other way!"]}
    ],
    shortPass:[
      {id:"slant",label:"Quick Slant",icon:"↗️",desc:"Inside route, fast throw",type:"pass",
        ydsBase:[4,10],incPct:0.22,intPct:0.02,sackPct:0.04,bigPlay:0.05,
        commentary:["Quick slant over the middle","Fires inside — slant route","Slot receiver on the slant"]},
      {id:"curl",label:"Curl Route",icon:"🔁",desc:"Sit in the zone",type:"pass",
        ydsBase:[5,12],incPct:0.25,intPct:0.02,sackPct:0.05,bigPlay:0.04,
        commentary:["Curl route — sitting in the zone","Hooks up at the sticks","Out route, turns back to the quarterback"]},
      {id:"screen",label:"WR Screen",icon:"🪤",desc:"Quick throw, blockers lead",type:"pass",
        ydsBase:[-1,15],incPct:0.15,intPct:0.01,sackPct:0.02,bigPlay:0.10,
        commentary:["Screen pass!","Quick throw to the flat","Tunnel screen — blockers in front!"]},
      {id:"flat",label:"Check Down",icon:"⬇️",desc:"Dump to RB in flat",type:"pass",
        ydsBase:[2,7],incPct:0.18,intPct:0.01,sackPct:0.03,bigPlay:0.03,
        commentary:["Check down to the back","Dumps it off to the flat","Safety valve — out to the running back"]},
      {id:"te_drag",label:"TE Drag",icon:"🎯",desc:"TE across the middle",type:"pass",
        ydsBase:[4,11],incPct:0.20,intPct:0.02,sackPct:0.04,bigPlay:0.04,
        commentary:["Tight end drag across the formation","TE over the middle!","Drags underneath, finds the soft spot"]},
      {id:"te_seam",label:"TE Seam Route",icon:"🔱",desc:"Tight end splits the safeties down the seam — high pct",type:"pass",
        ydsBase:[8,22],incPct:0.28,intPct:0.03,sackPct:0.06,bigPlay:0.20,
        commentary:["TE up the seam!","Tight end splits the safeties!","Seam route — right between the deep defenders!","The tight end finds the open lane!"]},
      {id:"rpo_slant",label:"RPO Slant",icon:"⚡",desc:"Run-pass option — QB reads the linebacker at the mesh point",type:"pass",
        ydsBase:[4,16],incPct:0.24,intPct:0.03,sackPct:0.04,bigPlay:0.12,
        commentary:["RPO — reading the linebacker!","Run-pass option — QB makes the call!","Mesh point decision — he throws the slant!","The RPO keeps the defense honest!"]},
      {id:"quick_screen",label:"Quick Screen",icon:"📺",desc:"Fast WR screen with blockers set — nearly uncoverable, low ceiling",type:"pass",
        ydsBase:[1,10],incPct:0.12,intPct:0.01,sackPct:0.02,bigPlay:0.08,
        commentary:["Quick screen!","WR screen with blockers set up in front!","Short throw, lots of green grass!","Screen pass — wide receivers blocking downfield!"]}
    ],
    deepPass:[
      {id:"go_route",label:"Go Route",icon:"🚀",desc:"Fly pattern — home run ball",type:"pass",
        ydsBase:[0,55],incPct:0.50,intPct:0.06,sackPct:0.08,bigPlay:0.25,
        commentary:["GO ROUTE! Throwing deep!","Launches it downfield!","Bombs away!","9 route — all or nothing!"]},
      {id:"post",label:"Post Route",icon:"📐",desc:"Break toward the middle deep",type:"pass",
        ydsBase:[10,35],incPct:0.38,intPct:0.04,sackPct:0.07,bigPlay:0.18,
        commentary:["Post route — breaking inside!","Deep over the middle!","Cutting across — the post!"]},
      {id:"corner",label:"Corner Route",icon:"📍",desc:"7 route to the sideline",type:"pass",
        ydsBase:[12,30],incPct:0.40,intPct:0.03,sackPct:0.06,bigPlay:0.15,
        commentary:["Corner route to the sideline!","7 route — back shoulder!","Breaks to the flag!"]},
      {id:"play_action",label:"Play Action",icon:"🎭",desc:"Fake run, deep shot",type:"pass",
        ydsBase:[5,40],incPct:0.35,intPct:0.04,sackPct:0.09,bigPlay:0.20,
        commentary:["Play action fake!","The linebackers BITE!","Beautiful fake — throws deep!","Play action rollout!"]},
      {id:"pa_boot",label:"Play Action Boot",icon:"🥾",desc:"Fake the run, QB rolls out — deadly if defense bites on the fake",type:"pass",
        ydsBase:[5,28],incPct:0.30,intPct:0.04,sackPct:0.08,bigPlay:0.25,
        commentary:["Play action boot!","Fake the run, QB rolls out!","The linebackers BITE on the fake!","Bootleg pass — rolling to his right — FIRES!"]}
    ],
    special:[
      {id:"hail_mary",label:"Hail Mary",icon:"🙏",desc:"Last resort — throw it up",type:"pass",
        ydsBase:[0,70],incPct:0.75,intPct:0.18,sackPct:0.03,bigPlay:0.15,
        commentary:["HAIL MARY!","Heaves it to the end zone!","Prayer at the buzzer!"]},
      {id:"hurry_up",label:"Hurry-Up",icon:"⏱️",desc:"No huddle — save clock",type:"pass",
        ydsBase:[3,15],incPct:0.30,intPct:0.03,sackPct:0.05,bigPlay:0.08,clockSave:15,
        commentary:["Hurry-up! No huddle!","Racing to the line!","Quick snap — no time to waste!"]},
      {id:"kneel",label:"Victory Kneel",icon:"🧎",desc:"Run out the clock",type:"run",
        ydsBase:[-2,-1],bigPlay:0,fumble:0,clockBurn:40,
        commentary:["Takes a knee.","Victory formation.","Kneels it down — burning clock."]},
      {id:"spike",label:"Spike Ball",icon:"⬇️",desc:"Stop clock — costs a down",type:"spike",
        ydsBase:[0,0],bigPlay:0,fumble:0,clockBurn:3,
        commentary:["Spikes it! Clock stops!","Quick spike to stop the clock!","Ball is spiked — saving time!"]}
    ],
    trick:[
      {id:"flea_flicker",label:"Flea Flicker",icon:"🪰",desc:"Handoff → pitch back → deep bomb",type:"pass",
        ydsBase:[5,55],incPct:0.40,intPct:0.05,sackPct:0.10,bigPlay:0.30,
        commentary:["FLEA FLICKER!","Fake handoff — RB pitches back — THROWS DEEP!","The oldest trick in the book!"]},
      {id:"philly_special",label:"Philly Special",icon:"🦅",desc:"QB lines up as receiver, TD pass from RB/TE",type:"pass",
        ydsBase:[0,25],incPct:0.45,intPct:0.06,sackPct:0.02,bigPlay:0.20,isTrick:true,
        commentary:["PHILLY SPECIAL!","Direct snap to the running back — THROWS TO THE QB!","YOU GOTTA BE KIDDING ME!"]},
      {id:"hb_pass",label:"HB Pass",icon:"🏃",desc:"RB takes handoff, throws downfield",type:"pass",
        ydsBase:[0,40],incPct:0.55,intPct:0.08,sackPct:0.02,bigPlay:0.18,isTrick:true,
        commentary:["HB PASS! The running back throws it!","Halfback option! He's looking downfield!","RB pulls up — FIRES!"]},
      {id:"fake_punt",label:"Fake Punt",icon:"🎭",desc:"Punter runs or throws — huge risk",type:"pass",
        ydsBase:[0,30],incPct:0.50,intPct:0.10,sackPct:0.04,bigPlay:0.22,isTrick:true,is4thOnly:true,
        commentary:["FAKE PUNT!","They're NOT punting! Direct snap to the upback!","BOLD CALL!"]},
      {id:"fake_fg",label:"Fake FG",icon:"🎪",desc:"Holder keeps it or throws — FG range only",type:"pass",
        ydsBase:[0,25],incPct:0.50,intPct:0.08,sackPct:0.03,bigPlay:0.20,isTrick:true,is4thOnly:true,
        commentary:["FAKE FIELD GOAL!","The holder keeps it!","IT'S A FAKE! FIRE! FIRE!"]},
      {id:"hook_lateral",label:"Hook & Lateral",icon:"🔀",desc:"WR catches short hook then laterals to trailing teammate",type:"pass",
        ydsBase:[0,25],incPct:0.30,intPct:0.04,sackPct:0.06,bigPlay:0.32,fumble:0.08,isTrick:true,shortYdsOk:false,noHuddleOk:false,
        commentary:["Hook and lateral! The pitch is clean — he's got blockers!","Short catch — AND HE LATERALS! The trailing man has the ball!","HOOK AND LATERAL! They practiced this one all week!","Catch, pitch, AND HE'S GONE! The hook and lateral breaks the defense wide open!"]},
      {id:"end_around_pass",label:"End Around Pass",icon:"🌀",desc:"WR takes the reverse handoff and throws back across the field",type:"pass",
        ydsBase:[-3,30],incPct:0.38,intPct:0.08,sackPct:0.10,bigPlay:0.30,fumble:0.05,isTrick:true,shortYdsOk:false,noHuddleOk:false,
        commentary:["End around — AND HE THROWS! The receiver is a quarterback tonight!","Reverse handoff — he pulls up and launches it downfield!","It's an end around pass! The defense is scrambling!","WR takes the reverse and FIRES across the field — what a design!"]},
      {id:"shovel_pass",label:"Shovel Pass",icon:"🥄",desc:"QB flips an underhand shovel to the RB slipping through the line",type:"pass",
        ydsBase:[1,8],incPct:0.10,intPct:0.01,sackPct:0.04,bigPlay:0.06,fumble:0.02,isTrick:false,shortYdsOk:true,noHuddleOk:true,
        commentary:["Shovel pass! Quick flip to the back — he slips through!","Underhand shovel to the running back — picks up the first down!","QB shovels it underneath — the defense was looking downfield!","Quick shovel pass right through the heart of the line — clever call!"]}
    ]
  },
  // ── DEFENSIVE PLAYS ──
  defense:{
    coverage:[
      {id:"cover_2",label:"Cover 2",icon:"🛡️",desc:"Two deep safeties — protect sidelines",
        mods:{short:2,deep:-4,rush:1,blitz:0,sackMod:0}},
      {id:"cover_3",label:"Cover 3",icon:"🔷",desc:"Three deep — balanced zone",
        mods:{short:0,deep:-2,rush:0,blitz:0,sackMod:0}},
      {id:"man_press",label:"Man Press",icon:"👤",desc:"Press at the line — risky vs speed",
        mods:{short:-3,deep:4,rush:-1,blitz:0,sackMod:0.01}},
      {id:"cover_0",label:"Cover 0 Blitz",icon:"🔥",desc:"All-out — zero safety help!",
        mods:{short:-5,deep:8,rush:-4,blitz:0.12,sackMod:0.08}},
      {id:"spy",label:"QB Spy",icon:"🕵️",desc:"LB spies the QB — stops scrambles",
        mods:{short:1,deep:0,rush:2,blitz:-0.02,sackMod:-0.02}},
      {id:"prevent",label:"Prevent",icon:"🏰",desc:"Protect the deep ball — give up short",
        mods:{short:5,deep:-10,rush:3,blitz:-0.05,sackMod:-0.04}},
      {id:"tampa_2",label:"Tampa 2",icon:"🏴‍☠️",desc:"Modified Cover 2 — MLB drops deep to cover the seam, balanced run/pass",
        mods:{short:1,deep:-3,rush:0,blitz:0.01,sackMod:-0.01}},
      {id:"dime",label:"Dime Package",icon:"💎",desc:"Six defensive backs blanket every receiver — maximum coverage, vulnerable against the run",
        mods:{short:-2,deep:5,rush:-8,blitz:0.08,sackMod:0.02}},
      {id:"goal_line",label:"Goal Line Defense",icon:"🏰",desc:"Extra linemen and linebackers stacked in the box — built to stuff the run at the goal line",
        mods:{short:-5,deep:-8,rush:12,blitz:0.15,sackMod:0.05}},
      {id:"cover3_zone",label:"Cover 3 Zone",icon:"🛡️",desc:"Three-deep zone with four underneath — balanced and reliable across the field",
        mods:{short:1,deep:2,rush:1,blitz:0.10,sackMod:0.01}},
      {id:"bear_defense",label:"Bear Defense",icon:"🐻",desc:"Overloaded front with four DL and three stacked linebackers — collapses the pocket and destroys the run game",
        mods:{short:-1,deep:-6,rush:10,blitz:0.22,sackMod:0.08}}
    ]
  },
  // Resolve a single play
  resolvePlay:function(offPlay,defPlay,off,def,state){
    // ── PLAYER LOOKUPS ──
    var qb=off.roster.find(function(p){return p.pos==="QB"&&p.isStarter&&!(p.injury&&p.injury.games>0)&&!p._gameInjured;});
    var rb=off.roster.find(function(p){return p.pos==="RB"&&p.isStarter&&!(p.injury&&p.injury.games>0)&&!p._gameInjured;});
    var wr=off.roster.find(function(p){return p.pos==="WR"&&p.isStarter&&!(p.injury&&p.injury.games>0)&&!p._gameInjured;});
    var wr2=off.roster.filter(function(p){return p.pos==="WR"&&p.isStarter&&!(p.injury&&p.injury.games>0)&&!p._gameInjured;})[1];
    var te=off.roster.find(function(p){return p.pos==="TE"&&p.isStarter&&!(p.injury&&p.injury.games>0)&&!p._gameInjured;});
    var k=off.roster.find(function(p){return p.pos==="K"&&!(p.injury&&p.injury.games>0)&&!p._gameInjured;});
    var dlD=def.roster.find(function(p){return p.pos==="DL"&&p.isStarter&&!(p.injury&&p.injury.games>0)&&!p._gameInjured;});
    var cbD=def.roster.find(function(p){return p.pos==="CB"&&p.isStarter&&!(p.injury&&p.injury.games>0)&&!p._gameInjured;});
    var lbD=def.roster.find(function(p){return p.pos==="LB"&&p.isStarter&&!(p.injury&&p.injury.games>0)&&!p._gameInjured;});
    var sD=def.roster.find(function(p){return p.pos==="S"&&p.isStarter&&!(p.injury&&p.injury.games>0)&&!p._gameInjured;});
    var ols=off.roster.filter(function(p){return p.pos==="OL"&&p.isStarter;});
    // Fallbacks when starters are injured mid-game
    if(!qb){qb=off.roster.find(function(p){return p.pos==="QB"&&!(p.injury&&p.injury.games>0)&&!p._gameInjured;});}
    if(!qb)return{type:"incomplete",yards:0,desc:"No QB available!",clock:30};
    if(!rb){rb=off.roster.find(function(p){return p.pos==="RB"&&!p._gameInjured;});}
    if(!wr){wr=off.roster.find(function(p){return p.pos==="WR"&&!p._gameInjured;});}
    if(!te){te=off.roster.find(function(p){return p.pos==="TE"&&!p._gameInjured;});}
    if(!dlD){dlD=def.roster.find(function(p){return p.pos==="DL"&&!p._gameInjured;});}
    if(!cbD){cbD=def.roster.find(function(p){return p.pos==="CB"&&!p._gameInjured;});}

    // ── ATTRIBUTE HELPER — null-safe, defaults to 50 (league average) ──
    function a(p,key){return p&&p.ratings?(p.ratings[key]||50):50;}
    function olAvg(key){var s=0,c=0;ols.forEach(function(p){if(p&&p.ratings){s+=(p.ratings[key]||50);c++;}});return c?s/c:50;}

    var dm=defPlay&&defPlay.mods?defPlay.mods:{short:0,deep:0,rush:0,blitz:0,sackMod:0};

    // ── BASE OVR EDGE (lighter weight — individual attributes do the real work now) ──
    var offOvr=0,offCt=0;[qb,rb,wr,wr2,te].forEach(function(p){if(p){offOvr+=p.ovr;offCt++;}});
    offOvr=offCt>0?offOvr/offCt:60;
    var defOvr=0,defCt=0;
    def.roster.filter(function(p){return["DL","LB","CB","S"].indexOf(p.pos)>=0&&p.isStarter;}).forEach(function(p){defOvr+=p.ovr;defCt++;});
    defOvr=defCt>0?defOvr/defCt:60;
    var edge=(offOvr-defOvr)*0.08;// reduced — attributes now carry the story

    // ── SITUATIONAL MODIFIERS ──
    if(state.homeField){edge+=state.homeField;}
    var isClutch=state.isClutch||false;
    if(isClutch){
      var clutchBoost=0;
      if(qb.traits){qb.traits.forEach(function(tr){if(tr.id==="clutch"||tr.id==="ice_veins")clutchBoost+=2;if(tr.id==="choker")clutchBoost-=2;});}
      edge+=clutchBoost;
    }
    if(state.crowdMod){edge+=state.crowdMod;}
    if(state.halfAdjMod991){edge+=state.halfAdjMod991;}

    var commentary=offPlay.commentary?offPlay.commentary[Math.floor(RNG.play()*offPlay.commentary.length)]:"";
    var clockUse=offPlay.clockBurn||offPlay.clockSave||(offPlay.type==="run"?28+Math.floor(RNG.play()*15):22+Math.floor(RNG.play()*18));

    // ── SPIKE ──
    if(offPlay.type==="spike"){
      return{type:"spike",yards:0,desc:(qb?qb.name:"QB")+" spikes the football! Clock stops!",
        player:qb?qb.name:"QB",clock:3,commentary:commentary,isSpike:true};
    }

    // ── RUN PLAYS ──
    if(offPlay.type==="run"){
      // ── RUN ATTRIBUTES ──
      var rbSpd=a(rb,"speed"),rbElus=a(rb,"elusiveness"),rbVis=a(rb,"ballCarrierVision");
      var rbPow=a(rb,"power"),rbAcc=a(rb,"acceleration"),rbTruck=a(rb,"truckPower"),rbBT=a(rb,"breakTackle");
      var olRunBlk=olAvg("runBlock");
      var dlShed=a(dlD,"blockShedding"),dlPursuit=a(dlD,"pursuit");
      var lbStop=a(lbD,"runStop")||a(lbD,"tackle")||50;

      // Line battle: OL run block vs DL block shedding
      var runLineEdge=(olRunBlk-dlShed)*0.04;
      // Open field: RB speed + elusiveness + vision
      var rbOpenEdge=(rbSpd-50)*0.02+(rbElus-50)*0.02+(rbVis-50)*0.01;
      var runEdge=edge+runLineEdge+rbOpenEdge;

      // Matchup panel (now shows actual attributes)
      var matchups=[];
      matchups.push({off:"OL (blk:"+Math.round(olRunBlk)+")",
        def:(dlD?dlD.name.split(" ").pop():"DL")+" (shed:"+Math.round(dlShed)+")",
        winner:olRunBlk>dlShed+5?"off":dlShed>olRunBlk+5?"def":"push",
        desc:olRunBlk>dlShed+5?"O-line mauls the front — hole opens up":dlShed>olRunBlk+5?"DL blows up the blocking assignment!":"Even battle at the line of scrimmage"});
      if(rb){var rbVsLb=(rbSpd+rbElus)/2-lbStop;
        matchups.push({off:rb.name.split(" ").pop()+" (spd:"+Math.round(rbSpd)+" elu:"+Math.round(rbElus)+")",
          def:"LB corps (stop:"+Math.round(lbStop)+")",
          winner:rbVsLb>5?"off":rbVsLb<-5?"def":"push",
          desc:rbVsLb>5?"He outruns the pursuit — daylight!":rbVsLb<-5?"Linebackers swarm — no room":"Closing angles on the ball carrier"});}

      // Fumble: vision + awareness reduce risk
      var fumChance=(offPlay.fumble||0.02)-(rbVis-50)*0.0002-(a(rb,"awareness")-50)*0.0002;
      fumChance=Math.max(0.005,Math.min(0.08,fumChance));
      if(RNG.play()<fumChance){
        var fumRunner=offPlay.id==="qb_sneak"?qb:rb;
        return{type:"fumble",yards:Math.floor(RNG.play()*5),
          desc:(fumRunner?fumRunner.name:"RB")+" FUMBLES! Ball is loose — defense recovers!",
          player:fumRunner?fumRunner.name:"RB",clock:clockUse,commentary:commentary,turnover:true,matchups:matchups};}

      // Big play: speed + acceleration + elusiveness, suppressed by DL pursuit
      var bigChance=(offPlay.bigPlay||0.06)+(rbSpd-50)*0.0008+(rbAcc-50)*0.0006+(rbElus-50)*0.0006-(dlPursuit-50)*0.0005+runEdge*0.005-(dm.rush||0)*0.005;
      bigChance=Math.max(0.01,Math.min(0.28,bigChance));
      if(RNG.play()<bigChance){
        var bigYds=15+Math.floor(RNG.play()*35);
        var bigRunner=offPlay.id==="qb_sneak"?qb:rb;
        var bigDesc=rbSpd>=82?"JETS! "+(bigRunner?bigRunner.name:"RB")+" turns on the afterburners — "+bigYds+" yards!":
          rbPow>=80?"TRUCKS HIM! "+(bigRunner?bigRunner.name:"RB")+" runs through the tackle for "+bigYds+"!":
          "BREAKAWAY! "+(bigRunner?bigRunner.name:"RB")+" breaks free for "+bigYds+" yards!";
        return{type:"run",yards:bigYds,desc:bigDesc,player:bigRunner?bigRunner.name:"RB",
          clock:clockUse,commentary:commentary,big:true,isRush:true,matchups:matchups};}

      // Base yards — attribute-driven
      var base=offPlay.ydsBase;
      var runYds=base[0]+Math.floor(RNG.play()*(base[1]-base[0]+1))+Math.round(runEdge*0.3)-(dm.rush||0)*0.3;
      // Elite vision finds the crease when the hole is small
      if(rbVis>=80&&runYds<3&&RNG.play()<0.30){runYds+=Math.floor(RNG.play()*4);}
      // Break tackle on contact — truckers and wiggle backs
      if(runYds>0&&runYds<=5&&rbBT>=72&&RNG.play()<(rbBT-65)*0.008){runYds+=2+Math.floor(RNG.play()*3);}
      // Power back pushes the pile on short gains
      if(rbPow>=78&&runYds>0&&(dm.rush||0)<4){runYds+=Math.floor((rbPow-72)*0.04);}
      runYds=Math.max(-5,Math.round(runYds));

      var runner=offPlay.id==="qb_sneak"?qb:rb;
      var runDesc=(runner?runner.name:"RB")+(runYds>0?" gains "+runYds+(runYds===1?" yard":" yards"):" stuffed for "+(runYds===0?"no gain":"a loss of "+Math.abs(runYds)));
      return{type:"run",yards:runYds,desc:runDesc,player:runner?runner.name:"RB",clock:clockUse,commentary:commentary,isRush:true,matchups:matchups};
    }

    // ── PASS PLAYS (including trick plays) ──
    // ── PASS ATTRIBUTES ──
    var qbAcc=a(qb,"accuracy"),qbAware=a(qb,"awareness"),qbDecision=a(qb,"decisionSpeed");
    var qbDeepAcc=a(qb,"deepAccuracy")||qbAcc,qbShortAcc=a(qb,"shortAccuracy")||qbAcc;
    var qbPocket=a(qb,"pocketPresence"),qbTough=a(qb,"toughness");

    var wrSep=a(wr,"separation"),wrSpeed=a(wr,"speed"),wrSpec=a(wr,"spectacularCatch"),wrCIT=a(wr,"catchInTraffic");
    var wrDeepRt=a(wr,"deepRoute"),wrShortRt=a(wr,"shortRoute");

    var cbCov=a(cbD,"coverage")||a(cbD,"manCoverage")||a(cbD,"zoneCoverage")||(cbD?cbD.ovr:65);
    var cbBOB=a(cbD,"breakOnBall");
    var sCov=a(sD,"coverage")||a(sD,"zoneCoverage")||(sD?sD.ovr:65);
    var sRange=a(sD,"rangeAbility");

    var olPassBlk=olAvg("passBlock")||olAvg("passBlockFinesse")||50;
    var olAnchor=olAvg("anchorStrength"),olFinesse=olAvg("passBlockFinesse");
    var dlRush=a(dlD,"passRush")||a(dlD,"powerMoves")||(dlD?dlD.ovr:65);
    var dlPowMov=a(dlD,"powerMoves"),dlFinMov=a(dlD,"finesseMoves");

    var isDeep=offPlay.id==="go_route"||offPlay.id==="post"||offPlay.id==="corner"||offPlay.id==="play_action"||offPlay.id==="hail_mary"||offPlay.id==="flea_flicker"||offPlay.id==="pa_boot";
    var isTEPlay=offPlay.id==="te_drag"||offPlay.id==="te_seam";

    // QB effective accuracy scales to route depth
    var effectiveQbAcc=isDeep?(qbDeepAcc*0.7+qbAcc*0.3):(qbShortAcc*0.7+qbAcc*0.3);
    var wrRouteEff=isDeep?wrDeepRt:wrShortRt;

    // Pass edge: accuracy vs coverage, separation vs DB, route skill
    var passEdge=edge+(effectiveQbAcc-50)*0.015+(wrSep-50)*0.012-(cbCov-50)*0.012+(wrRouteEff-50)*0.010;

    // Matchup panel (attribute-driven)
    var matchups=[];
    if(wr&&cbD){var sepVsCov=wrSep-cbCov;
      matchups.push({off:wr.name.split(" ").pop()+" (sep:"+Math.round(wrSep)+")",
        def:cbD.name.split(" ").pop()+" (cov:"+Math.round(cbCov)+")",
        winner:sepVsCov>5?"off":sepVsCov<-5?"def":"push",
        desc:sepVsCov>5?"WR creates separation — he's open!":sepVsCov<-5?"CB has him locked down — no daylight":"Tight man coverage — going to be contested"});}
    if(qb&&dlD){var pktBattle=olPassBlk-dlRush;
      matchups.push({off:qb.name.split(" ").pop()+" (pkt:"+Math.round(qbPocket)+")",
        def:dlD.name.split(" ").pop()+" (rush:"+Math.round(dlRush)+")",
        winner:pktBattle>5?"off":pktBattle<-5?"def":"push",
        desc:pktBattle>5?"Clean pocket — all day to throw":pktBattle<-5?"Pass rush collapsing the pocket":"QB feeling pressure in the pocket"});}
    if(te&&sD){var teSep2=a(te,"separation");var teVsS=teSep2-sCov;
      matchups.push({off:te.name.split(" ").pop()+" (sep:"+Math.round(teSep2)+")",
        def:sD.name.split(" ").pop()+" (cov:"+Math.round(sCov)+")",
        winner:teVsS>5?"off":teVsS<-5?"def":"push",
        desc:teVsS>5?"TE has the size and leverage over the safety":teVsS<-5?"Safety blankets the middle — no seam":"Contested matchup in the intermediate zone"});}

    // QB Scramble: speed + elusiveness drive upside
    var scrambleChance=0.07+(a(qb,"speed")-50)*0.002+(a(qb,"elusiveness")-50)*0.001;
    if(defPlay&&defPlay.id==="spy")scrambleChance*=0.2;
    if(dm.blitz>0)scrambleChance+=0.04;
    if(!offPlay.isTrick&&offPlay.id!=="hail_mary"&&offPlay.id!=="hurry_up"&&RNG.play()<scrambleChance){
      var scramYds=Math.floor(RNG.play()*15)-2+Math.round(passEdge*0.2);
      scramYds=Math.max(-3,scramYds);
      var scramBig=scramYds>12;
      var scramDesc=scramYds>0?(qb.name+" scrambles for "+scramYds+" yards!"+(scramBig?" WHAT A RUN!":"")):(qb.name+" tries to scramble — brought down for "+(scramYds===0?"no gain":"a loss of "+Math.abs(scramYds))+"!");
      if(scramBig)scramDesc=qb.name+" takes off! Scrambles "+scramYds+" yards!";
      return{type:"run",yards:scramYds,desc:scramDesc,player:qb.name,clock:clockUse,
        commentary:"QB flushes from the pocket!",big:scramBig,isRush:true,isScramble:true,matchups:matchups};}

    // SACK: OL passBlock + anchorStrength vs DL powerMoves + finesseMoves + QB pocket presence
    var sackPct=(offPlay.sackPct||0.06)+(dm.sackMod||0)+(dm.blitz||0);
    sackPct-=(olPassBlk-dlRush)*0.0008;     // OL protection dominates DL rush = fewer sacks
    sackPct-=(olAnchor-dlPowMov)*0.0002;    // anchor strength holds against bull rush
    sackPct-=(olFinesse-dlFinMov)*0.0002;   // finesse technique counters speed rush
    sackPct-=(qbPocket-50)*0.0004;          // pocket presence buys extra time
    sackPct-=edge*0.003;
    sackPct=Math.max(0.02,Math.min(0.20,sackPct));
    if(RNG.play()<sackPct){
      var sackLoss=-(4+Math.floor(RNG.play()*8));
      return{type:"sack",yards:sackLoss,
        desc:(dlD?dlD.name:"DL")+" SACKS "+(qb?qb.name:"QB")+" for a loss of "+Math.abs(sackLoss)+"!",
        player:dlD?dlD.name:"DL",clock:clockUse,commentary:commentary,matchups:matchups};}

    // INT: QB accuracy + awareness + decisionSpeed vs CB breakOnBall
    var intPct=(offPlay.intPct||0.03);
    intPct-=(qbAcc-60)*0.0008;             // accurate QB avoids bad throws
    intPct-=(qbAware-60)*0.0006;           // awareness = sees coverage pre-snap
    intPct-=(qbDecision-50)*0.00035;       // quick decision = ball out before coverage closes
    intPct+=(cbBOB-50)*0.0003;             // ball-hawk CB jumps routes
    if(isDeep)intPct+=(dm.deep||0)*0.003;else intPct+=(dm.short||0)*0.002;
    if(offPlay.isTrick)intPct+=0.02;
    intPct-=passEdge*0.003;
    intPct=Math.max(0.01,Math.min(0.18,intPct));
    if(RNG.play()<intPct){
      var intDesc=offPlay.isTrick?(offPlay.label+" — INTERCEPTED! The trick play backfires!"):
        ((qb?qb.name:"QB")+" INTERCEPTED by "+(cbD?cbD.name:"DB")+"!"+(isDeep?" Deep ball picked off!":""));
      return{type:"interception",yards:0,desc:intDesc,
        player:cbD?cbD.name:"DB",clock:clockUse,commentary:commentary,turnover:true,matchups:matchups};}

    // INCOMPLETE: QB accuracy (depth-specific) + WR route skill vs CB coverage
    var incPct=(offPlay.incPct||0.25);
    incPct-=(effectiveQbAcc-50)*0.004;     // accurate QB completes more
    incPct-=(wrRouteEff-50)*0.003;         // clean routes get separation
    incPct+=(cbCov-50)*0.003;              // lockdown CB forces incompletions
    if(isDeep)incPct+=(dm.deep||0)*0.02;else incPct+=(dm.short||0)*0.015;
    incPct-=passEdge*0.005;
    // Spectacular catch saves tight-window throws
    if(wrSpec>=78&&RNG.play()<0.12){incPct-=0.06;}
    // Catch in traffic helps TE/slot routes over the middle
    if(isTEPlay&&wrCIT>=75){incPct-=0.04;}
    incPct=Math.max(0.10,Math.min(0.85,incPct));
    if(RNG.play()<incPct){
      var incTargets=[wr,wr2,te,rb].filter(function(x){return!!x;});
      var incT=incTargets[Math.floor(RNG.play()*incTargets.length)];
      var incDescs=offPlay.isTrick?
        [offPlay.label+" — pass falls incomplete! The gamble doesn't pay off.",offPlay.label+" — thrown away! Coverage was there."]:
        ["Pass incomplete — "+(incT?incT.name:"WR")+" can't haul it in",
        "Thrown away — nobody open","Dropped! "+(incT?incT.name:"WR")+" had it but couldn't hold on",
        "Pass falls incomplete — good coverage by the defense",
        "Batted at the line! Pass deflected!","Overthrown! "+(qb?qb.name:"QB")+" puts too much on it"];
      return{type:"incomplete",yards:0,desc:incDescs[Math.floor(RNG.play()*incDescs.length)],
        player:incT?incT.name:"WR",clock:clockUse<25?clockUse:8,commentary:commentary,matchups:matchups};}

    // COMPLETION — big play check driven by WR speed + separation vs CB coverage + safety range
    var bigChance2=(offPlay.bigPlay||0.05)+(wrSpeed-50)*0.0008+(wrSep-50)*0.0006-(cbCov-50)*0.0006-(sRange-50)*0.0005;
    if(isDeep){bigChance2+=(wrDeepRt-50)*0.0005;}
    bigChance2+=passEdge*0.005;
    bigChance2=Math.max(0.02,Math.min(0.35,bigChance2));
    var isBig=RNG.play()<bigChance2;
    var base2=offPlay.ydsBase;
    var passYds;
    if(isBig){
      passYds=base2[1]+5+Math.floor(RNG.play()*20);
      // Elite speed turns big plays into jaw-droppers
      if(wrSpeed>=85){passYds+=Math.floor((wrSpeed-80)*0.5);}
    }else{passYds=base2[0]+Math.floor(RNG.play()*(base2[1]-base2[0]+1))+Math.round(passEdge*0.3);}
    if(isDeep)passYds-=Math.round((dm.deep||0)*0.5);else passYds-=Math.round((dm.short||0)*0.4);
    passYds=Math.max(1,Math.round(passYds));
    var targets=[wr,wr2,te,rb].filter(function(x){return!!x;});
    var catcher=isDeep?(wr||targets[0]):(targets[Math.floor(RNG.play()*targets.length)]||wr);
    var passDesc;
    if(offPlay.isTrick){
      passDesc=offPlay.label+"! Complete for "+passYds+" yards!"+(isBig?" IT WORKED BEAUTIFULLY!":"");
    }else{
      passDesc="Complete to "+(catcher?catcher.name:"WR")+" for "+passYds+(passYds===1?" yard":" yards")+"!";
      if(isBig)passDesc="BIG PLAY! "+(qb?qb.name:"QB")+" connects with "+(catcher?catcher.name:"WR")+" for "+passYds+" yards!";
    }
    return{type:"complete",yards:passYds,desc:passDesc,player:catcher?catcher.name:"WR",
      passer:qb?qb.name:"QB",clock:clockUse,commentary:commentary,big:isBig,matchups:matchups};
  }
};
