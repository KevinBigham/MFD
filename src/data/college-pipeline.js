/**
 * MFD College Pipeline Data
 *
 * College program tiers (Power, G5, FCS) and weighted draft
 * pipeline for player generation.
 */
import { pick, RNG } from '../utils/index.js';

export var COL_POWER=["Alabama","Ohio St","Georgia","Michigan","USC","Oregon","Texas","Clemson","Penn St","LSU",
  "Oklahoma","Florida St","Florida","Tennessee","Notre Dame","Auburn","Texas A&M","Missouri","Wisconsin","Iowa",
  "Miami","Ole Miss","South Carolina","NC State","UCLA","Arizona St","Colorado","Utah","Washington","Iowa St",
  "Kansas St","Oklahoma St","Baylor","TCU","West Virginia","Virginia Tech","Louisville","Duke","Pittsburgh","Illinois",
  "Minnesota","Nebraska","Purdue","Michigan St","Maryland","Kentucky","Mississippi St","Arkansas","Vanderbilt","Wake Forest"];
export var COL_G5=["Boise St","Memphis","UNLV","Tulane","Liberty","James Madison","Sam Houston","App State","Coastal Carolina",
  "San Jose St","Troy","Marshall","Western Kentucky","Toledo","Ohio","Central Michigan","Air Force","Navy","Army",
  "SMU","East Carolina","UAB","North Texas","UTSA","Charlotte","Jacksonville St","Kennesaw St","Louisiana","South Alabama"];
export var COL_FCS=["North Dakota St","South Dakota St","Montana","Montana St","Sacramento St","Villanova","Delaware","UC Davis","Eastern Washington"];
export var COL_WEIGHTED=COL_POWER.concat(["Missouri","Missouri","Missouri"]).concat(COL_G5);
export function pickCollege(isElite){
  if(isElite)return pick(COL_POWER.concat(["Missouri","Missouri"]));
  var r=RNG.draft();// v35: was non-deterministic random — leak fixed
  if(r<0.05)return pick(COL_FCS);
  if(r<0.25)return pick(COL_G5);
  return pick(COL_WEIGHTED);
}
