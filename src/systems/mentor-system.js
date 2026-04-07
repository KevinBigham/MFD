/**
 * MFD Mentor System
 *
 * Veteran-to-rookie mentorship: eligibility, pairing,
 * weekly bonuses, and retirement boost.
 */

import { NARRATIVE_STATES } from './story-arcs.js';

export var MENTOR_SYSTEM={
  posGroups:{QB:["QB"],RB:["RB"],WR:["WR","TE"],OL:["OL"],DL:["DL"],LB:["LB"],DB:["CB","S"]},
  getGroup:function(pos){var keys=Object.keys(MENTOR_SYSTEM.posGroups);for(var i=0;i<keys.length;i++){if(MENTOR_SYSTEM.posGroups[keys[i]].indexOf(pos)>=0)return keys[i];}return null;},
  isMentorEligible:function(p){return p.age>=30&&p.ovr>=75&&!(p.injury&&p.injury.games>0)&&p.isStarter;},
  isMenteeEligible:function(p){return p.age<=23&&p.ovr>=55&&p.pot>(p.ovr+5)&&!(p.injury&&p.injury.games>0);},
  canPair:function(mentor,mentee){return MENTOR_SYSTEM.getGroup(mentor.pos)===MENTOR_SYSTEM.getGroup(mentee.pos)&&mentor.id!==mentee.id;},
  weeklyBonus:function(mentor,mentee){if(!mentor||!mentee)return 0;var ovrGap=mentor.ovr-mentee.ovr;return ovrGap>=25?2.5:ovrGap>=15?1.8:ovrGap>=10?1.2:0.8;},
  applyWeekly:function(mentorships,roster){
    Object.keys(mentorships||{}).forEach(function(mentorId){
      var menteeId=mentorships[mentorId];
      var mentor=roster.find(function(p){return p.id===mentorId;});
      var mentee=roster.find(function(p){return p.id===menteeId;});
      if(!mentor||!mentee)return;
      var bonus=MENTOR_SYSTEM.weeklyBonus(mentor,mentee);
      if(mentor._arcState===NARRATIVE_STATES.MENTOR)bonus+=0.35;// small weekly arc synergy bonus
      mentee.pot=Math.min(99,mentee.pot+0.05);
      if(mentor.devTrait==="superstar")mentee._mentorBonus=(mentee._mentorBonus||0)+bonus*1.3;
      else mentee._mentorBonus=(mentee._mentorBonus||0)+bonus;
    });
  },
  retirementBoost:function(mentor,mentee){
    if(!mentor||!mentee)return;
    mentee.morale=Math.min(99,(mentee.morale||70)+8);
    mentee.pot=Math.min(99,mentee.pot+3);
    mentee._legacyMentor=mentor.name;
  }
};
