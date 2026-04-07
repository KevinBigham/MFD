/**
 * MFD DB Cleaner
 *
 * Finds and prunes stale year-keyed entries from
 * in-memory database objects based on a retention window.
 */

export var DB_CLEANER={
  findStale:function(db,currentYear,retention){
    if(!db)return[];
    var staleKeys=[];
    var cutoff=currentYear-retention;
    for(var key in db){
      if(Object.prototype.hasOwnProperty.call(db,key)){
        var parts=key.split("-");
        var year=parseInt(parts[0],10);
        if(!isNaN(year)&&year<cutoff)staleKeys.push(key);
      }
    }
    return staleKeys;
  },
  prune:function(db,currentYear,retention){
    if(!db)return{};
    var result=Object.assign({},db);
    var stale=DB_CLEANER.findStale(db,currentYear,retention);
    stale.forEach(function(key){delete result[key];});
    return{db:result,pruned:stale.length};
  }
};
