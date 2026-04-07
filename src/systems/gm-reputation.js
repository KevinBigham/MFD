/**
 * MFD GM Reputation System (v98.6)
 *
 * Tracks front-office reputation across three axes:
 * fairDealer, aggressive, loyalty — and an overall composite.
 */

export var GM_REP_986 = {
  calculate: function (txLog, tradeState) {
    var rep = { fairDealer: 50, aggressive: 50, loyalty: 50, overall: 50 };
    if (!txLog) return rep;
    var trades = txLog.filter(function (tx) {
      return tx.type === 'TRADE';
    });
    var signs = txLog.filter(function (tx) {
      return tx.type === 'SIGN_FA';
    });
    rep.fairDealer = Math.min(100, 50 + trades.length * 2);
    rep.aggressive = Math.min(100, 30 + trades.length * 3 + signs.length);
    if (tradeState && tradeState.gmTrustByTeam) {
      var trusts = Object.values(tradeState.gmTrustByTeam);
      if (trusts.length > 0)
        rep.loyalty = Math.round(
          trusts.reduce(function (s, v) {
            return s + v;
          }, 0) / trusts.length
        );
    }
    rep.overall = Math.round(
      (rep.fairDealer + rep.aggressive + rep.loyalty) / 3
    );
    return rep;
  },
  getLabel: function (score) {
    if (score >= 85)
      return { label: 'Elite GM', icon: '\u{1F451}', color: '#d4a74b' };
    if (score >= 70)
      return { label: 'Respected', icon: '\u{1F91D}', color: '#22c55e' };
    if (score >= 50)
      return { label: 'Average', icon: '\u{1F4CB}', color: '#64748b' };
    if (score >= 30)
      return { label: 'Questionable', icon: '\u{1F914}', color: '#f59e0b' };
    return { label: 'Untrusted', icon: '\u26A0\uFE0F', color: '#ef4444' };
  },
};
