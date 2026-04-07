/**
 * MFD Staff Poaching System
 *
 * Post-season staff poaching logic: checks if high-OVR
 * staff get poached based on team success, counter-offer costs.
 */

export var STAFF_POACHING={
  checkPoach:function(staff,isChamp,wins,rng2){
    var targets=[];
    staff.forEach(function(s){
      if((s.ovr||0)<70)return;
      var rate=isChamp?0.50:wins>=9?0.25:0;
      if(rate>0&&rng2()<rate){targets.push(Object.assign({},s,{poachRate:Math.round(rate*100)}));}
    });
    return targets;
  },
  counterOfferCost:function(s){return Math.round((s.salary||2)*1.5*10)/10;},
  applyPoach:function(frontOffice,target){
    return frontOffice.filter(function(s){return s.id!==target.id;});
  }
};
