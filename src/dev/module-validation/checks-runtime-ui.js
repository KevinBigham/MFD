import { isValidStatusRowShape } from './status-rows.js';

export function validateStatusRows(check, statusRows) {
  var seenStatusNames = {};
  var rows = Array.isArray(statusRows) ? statusRows : [];

  for (var i = 0; i < rows.length; i += 1) {
    var row = rows[i] || {};
    check(!isValidStatusRowShape(row), 'status row at index ' + i + ' has invalid shape');
    if (typeof row.name === 'string' && row.name.length > 0) {
      check(!!seenStatusNames[row.name], 'duplicate status row: ' + row.name);
      seenStatusNames[row.name] = true;
      check(!row.status, 'status row failed: ' + row.name);
    }
  }
}
