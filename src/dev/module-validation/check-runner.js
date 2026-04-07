export function createCheckRunner() {
  var errors = [];
  var checkCount = 0;

  function check(failed, message) {
    checkCount += 1;
    if (failed) {
      errors.push(message);
    }
  }

  return {
    check: check,
    getCheckCount: function () { return checkCount; },
    getErrors: function () { return errors.slice(); },
  };
}

export function runCheckGroups(groups, runner) {
  var groupList = Array.isArray(groups) ? groups : [];
  var out = [];

  groupList.forEach(function (group) {
    var before = runner.getCheckCount();
    group.run(runner.check);
    var after = runner.getCheckCount();
    out.push({
      name: group.name,
      checks: after - before,
    });
  });

  return out;
}
