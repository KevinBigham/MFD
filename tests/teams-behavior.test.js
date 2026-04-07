import { describe, expect, it } from "vitest";

import {
  CALENDAR,
  LEAGUE_STRUCTURE,
  MFD97_CONF_DIV_MAP,
  TD,
  applyLeagueAlignment97,
  getScaledCount97,
} from "../src/data/teams.js";

describe("teams behavior", function () {
  it("keeps team identity fields unique across the 30-team set", function () {
    var ids = TD.map(function (t) {
      return t.id;
    });
    var abbrs = TD.map(function (t) {
      return t.abbr;
    });
    expect(new Set(ids).size).toBe(30);
    expect(new Set(abbrs).size).toBe(30);
  });

  it("keeps division assignments and team map fully synchronized", function () {
    var mapIds = Object.keys(MFD97_CONF_DIV_MAP).sort();
    var tdIds = TD.map(function (t) {
      return t.id;
    }).sort();
    expect(mapIds).toEqual(tdIds);

    var divisionTeams = LEAGUE_STRUCTURE.divisions.flatMap(function (d) {
      return d.teams;
    });
    expect(new Set(divisionTeams).size).toBe(30);
    expect(divisionTeams.slice().sort()).toEqual(tdIds);
  });

  it("applyLeagueAlignment97 mirrors map values and preserves unknown defaults", function () {
    TD.forEach(function (team) {
      var aligned = applyLeagueAlignment97({ id: team.id });
      var mapped = MFD97_CONF_DIV_MAP[team.id];
      expect(aligned.conf).toBe(mapped.conf);
      expect(aligned.divId).toBe(mapped.divId);
      expect(aligned.divName).toBe(mapped.divName);
    });

    var unknown = applyLeagueAlignment97({ id: "x-team" });
    expect(unknown.conf).toBe("LG");
    expect(unknown.confName).toBe("League");
    expect(unknown.div).toBe("Independent");
    expect(unknown.divId).toBe("IND");
    expect(unknown.divName).toBe("Independent");
  });

  it("keeps scaled-count helper bounded and calendar weeks non-decreasing", function () {
    expect(getScaledCount97(0)).toBeGreaterThanOrEqual(1);
    expect(getScaledCount97(1)).toBeGreaterThanOrEqual(1);

    var weeks = CALENDAR.map(function (e) {
      return e.week;
    });
    for (var i = 1; i < weeks.length; i += 1) {
      expect(weeks[i]).toBeGreaterThanOrEqual(weeks[i - 1]);
    }
  });
});
