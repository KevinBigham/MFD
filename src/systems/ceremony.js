export var CEREMONY_986 = {
  generateRetirementSpeech: function (player, team, careerStats) {
    var cs = careerStats || {};
    var lines = ["\"It's been an incredible journey with the " + team.city + " " + team.name + ".\""];
    if ((cs.seasons || 0) >= 10) lines.push("\"" + (cs.seasons || 0) + " seasons. I wouldn't trade a single one.\"");
    if ((cs.proBowls || 0) >= 3) lines.push("\"" + cs.proBowls + " Pro Bowls \u2014 each one a reminder of the team behind me.\"");
    if ((cs.passYds || 0) > 20000) lines.push("\"Over " + Math.round((cs.passYds || 0) / 1000) + "k passing yards. Every one of them belongs to my teammates.\"");
    if ((cs.rushYds || 0) > 5000) lines.push("\"" + Math.round((cs.rushYds || 0) / 1000) + "k rushing yards. I left everything on that field.\"");
    if ((cs.sacks || 0) > 50) lines.push("\"" + (cs.sacks || 0) + " sacks. I lived in the backfield.\"");
    lines.push("\"To the fans \u2014 you made this city my home. Thank you.\"");
    return { lines: lines, isHoFWorthy: (cs.proBowls || 0) >= 4 || (cs.seasons || 0) >= 10 };
  },
  generateHoFSpeech: function (player, stats) {
    var lines = ["\"Standing here in the Hall of Fame... I'm speechless.\""];
    lines.push("\"From " + (player.college ? player.college.school || player.college : "a small town") + " to the pinnacle of football.\"");
    if ((stats.allPros || 0) >= 2) lines.push("\"" + stats.allPros + " All-Pro selections. That's the one I'm most proud of.\"");
    lines.push("\"To every coach who pushed me, every teammate who believed \u2014 this is yours too.\"");
    lines.push("\"I am, and always will be, a football player. Thank you.\"");
    return lines;
  }
};
