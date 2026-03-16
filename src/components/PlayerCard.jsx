import React from 'react';

import { T, S } from '../config/theme.js';
import { mS } from '../utils/helpers.js';

function EmptyComponent() {
  return null;
}

function findPlayerTeam(teams, playerId) {
  return (teams || []).find(function (team) {
    return (team.roster || []).some(function (player) {
      return player.id === playerId;
    });
  }) || null;
}

function formatHeight(height) {
  if (!height) return `6'0"`;
  return Math.floor(height / 12) + "'" + (height % 12) + '"';
}

function getTraitKeys(player, traitsMap) {
  return (player.traits95 || [player.trait]).filter(function (traitKey) {
    return traitKey && traitKey !== 'none' && traitsMap[traitKey];
  });
}

function getStatLine(player, stats, careerMode) {
  var pos = player.pos;
  var safeStats = stats || {};

  if (pos === 'QB') return (safeStats.passYds || 0) + 'yd ' + (safeStats.passTD || 0) + 'TD ' + (safeStats.int || 0) + 'INT';
  if (pos === 'RB') return (safeStats.rushYds || 0) + 'yd ' + (safeStats.rushTD || 0) + 'TD';
  if (pos === 'WR' || pos === 'TE') return (safeStats.rec || 0) + 'rec ' + (safeStats.recYds || 0) + 'yd ' + (safeStats.recTD || 0) + 'TD';
  if (['DL', 'LB'].indexOf(pos) >= 0) return (safeStats.sacks || 0) + 'sk ' + (safeStats.tackles || 0) + 'tkl';
  if (['CB', 'S'].indexOf(pos) >= 0) return (safeStats.defINT || 0) + 'INT ' + (safeStats.tackles || 0) + 'tkl';
  if (pos === 'K') return (safeStats.fgM || 0) + '/' + (safeStats.fgA || 0) + 'FG';
  if (pos === 'P') return (safeStats.punts || 0) + 'pnt ' + (safeStats.punts > 0 ? Math.round((safeStats.puntYds || 0) / safeStats.punts) : '0') + 'avg';

  return careerMode ? (safeStats.seasons || 0) + ' seasons' : (safeStats.gp || 0) + 'GP';
}

function buildStoryTags(player, careerStats, phase, hasTrait95) {
  var tags = [];

  tags.push({ icon: phase.label.split(' ')[0], text: phase.tip, color: phase.color });
  if (hasTrait95(player, 'captain')) tags.push({ icon: '©️', text: 'Team Captain — locker room leader', color: T.gold });
  if (hasTrait95(player, 'clutch')) tags.push({ icon: '❄️', text: 'Ice in Veins — performs under pressure', color: T.cyan });
  if (hasTrait95(player, 'cancer')) tags.push({ icon: '☢️', text: 'Locker Room Cancer — hurts team morale', color: T.red });
  if (hasTrait95(player, 'ironman')) tags.push({ icon: '🦾', text: 'Ironman — rarely misses time', color: T.green });
  if (hasTrait95(player, 'glass')) tags.push({ icon: '🔮', text: 'Made of Glass — always hurt', color: T.red });
  if (hasTrait95(player, 'workhorse')) tags.push({ icon: '🐴', text: 'Workhorse — extra development gains', color: T.green });
  if (player.devTrait === 'superstar') tags.push({ icon: '🌟', text: 'Generational Talent', color: T.gold });
  if ((careerStats.rings || 0) >= 2) tags.push({ icon: '💍', text: 'Dynasty Builder — ' + careerStats.rings + ' rings', color: T.gold });
  else if ((careerStats.rings || 0) >= 1) tags.push({ icon: '💍', text: 'Champion', color: T.gold });
  if ((careerStats.mvps || 0) >= 1) tags.push({ icon: '🏆', text: 'League MVP' + (careerStats.mvps > 1 ? '×' + careerStats.mvps : ''), color: T.gold });
  if ((careerStats.allPros || 0) >= 1) tags.push({ icon: '⭐', text: 'All-Pro×' + careerStats.allPros, color: T.gold });
  if ((careerStats.proBowls || 0) >= 1) tags.push({ icon: '🏈', text: 'Pro Bowl×' + careerStats.proBowls, color: T.cyan });
  if (player.pff && player.pff >= 85) tags.push({ icon: '📊', text: 'MFDF Elite (' + player.pff + ')', color: '#10b981' });
  else if (player.pff && player.pff >= 75) tags.push({ icon: '📊', text: 'MFDF High Grade (' + player.pff + ')', color: '#22d3ee' });
  if ((careerStats.seasons || 0) >= 8) tags.push({ icon: '🎖️', text: 'Franchise Legend — ' + careerStats.seasons + ' seasons', color: T.purple });
  else if ((careerStats.seasons || 0) >= 5) tags.push({ icon: '📜', text: 'Established Veteran', color: T.dim });
  if (player.formerTeam) tags.push({ icon: '🔥', text: 'Revenge Game eligible — ex-' + player.formerTeamName, color: T.red });
  if (player.udfaSleeper) tags.push({ icon: '💎', text: 'Undrafted Gem — rose from nothing', color: T.cyan });
  if (player.ovr >= 90) tags.push({ icon: '👑', text: 'Generational — Top of the game', color: T.gold });
  else if (player.ovr >= 82) tags.push({ icon: '⭐', text: 'Elite — true difference maker', color: T.green });
  else if (player.ovr < 55) tags.push({ icon: '🪑', text: 'Roster Bubble — fighting for a spot', color: T.red });

  return tags;
}

export function PlayerCard(props) {
  var p = props.player;
  if (!p) return null;

  var my = props.my;
  var myId = props.myId;
  var teams = props.teams || [];
  var godMode = !!props.godMode;
  var holdoutStages = props.holdoutStages || {};
  var holdoutNegotiationActive = !!props.holdoutNegotiationActive;
  var shopOffers = props.shopOffers || [];
  var PlayerFace = props.PlayerFace || EmptyComponent;
  var TeamLogo = props.TeamLogo || EmptyComponent;
  var getAgingPhase = props.getAgingPhase || function () { return { label: 'Prime Window', tip: '', color: T.dim }; };
  var PLAYER_ARCHETYPES = props.PLAYER_ARCHETYPES || { classify: function () { return null; } };
  var POS_DEF = props.POS_DEF || {};
  var TRAITS = props.TRAITS || {};
  var RATING_LABELS = props.RATING_LABELS || {};
  var REHAB_SYSTEM = props.REHAB_SYSTEM || { options: [] };
  var hasTrait95 = props.hasTrait95 || function () { return false; };
  var buttonStyleBuilder = props.buttonStyleBuilder || function (background, color) {
    return {
      background: background,
      color: color,
      border: 'none',
      borderRadius: 6,
      padding: '8px 16px',
      fontWeight: 700,
      cursor: 'pointer',
    };
  };
  var capHelpers = props.capHelpers || {};
  var scoutingHelpers = props.scoutingHelpers || {};
  var onClose = props.onClose || function () {};
  var onCloseButton = props.onCloseButton || onClose;
  var onRefresh = props.onRefresh || onClose;
  var onApplyRehab = props.onApplyRehab || function () {};
  var onStartHoldoutNegotiation = props.onStartHoldoutNegotiation || function () {};
  var onShopPlayer = props.onShopPlayer || function () {};
  var onAcceptShopOffer = props.onAcceptShopOffer || function () {};
  var onCompare = props.onCompare || function () {};
  var onNotify = props.onNotify || function () {};
  var onGodModeEdit = props.onGodModeEdit || function () {};
  var onGodModeClone = props.onGodModeClone || function () {};
  var onGodModeMove = props.onGodModeMove || function () {};
  var onGodModeSteal = props.onGodModeSteal || function () {};
  var onGodModeForceRetire = props.onGodModeForceRetire || function () {};
  var getInjuryMask = props.getInjuryMask || function () { return { type: 'Injury', status: 'Unknown' }; };

  var arch = p.archetype || PLAYER_ARCHETYPES.classify(p);
  if (!p.archetype && arch) p.archetype = arch;

  var def = POS_DEF[p.pos] || { r: [], w: [] };
  var cs = p.careerStats || {};
  var stats = p.stats || {};
  var contract = p.contract || {};
  var phase = getAgingPhase(p);
  var expYrs = cs.seasons || 0;
  var ovrColor = p.ovr >= 90 ? '#10b981' : p.ovr >= 80 ? '#22d3ee' : p.ovr >= 70 ? '#fbbf24' : p.ovr >= 60 ? '#f97316' : '#ef4444';
  var ovrGlow = p.ovr >= 85 ? '0 0 12px ' + ovrColor + '66' : 'none';
  var seasonLine = getStatLine(p, stats, false);
  var careerLine = getStatLine(p, cs, true);
  var traitKeys = getTraitKeys(p, TRAITS);
  var isOnMyRoster = !!(my && my.roster && my.roster.some(function (rosterPlayer) { return rosterPlayer.id === p.id; }));
  var findPTeam = godMode ? findPlayerTeam(teams, p.id) : null;
  var scouting = p.scouting;
  var storyTags = buildStoryTags(p, cs, phase, hasTrait95);
  var capHit = capHelpers.v36_capHit ? capHelpers.v36_capHit(contract) : 0;
  var cashPaid = capHelpers.v36_cashPaid ? capHelpers.v36_cashPaid(contract) : 0;
  var deadIfCut = capHelpers.v36_deadIfCut ? capHelpers.v36_deadIfCut(contract) : 0;
  var deadIfTraded = capHelpers.v36_deadIfTraded ? capHelpers.v36_deadIfTraded(contract) : 0;
  var tradeSavings = capHelpers.v36_tradeSavings ? capHelpers.v36_tradeSavings(contract) : 0;

  function promptGodModeValue(message, field, currentValue, shouldRefresh) {
    var value = prompt(message, currentValue);
    if (!value) return;
    onGodModeEdit(p.id, field, value);
    if (shouldRefresh !== false) onRefresh();
  }

  function renderGodModeEditor() {
    if (!godMode || !findPTeam) return null;

    var personality = p.personality || {};

    function editBtn(label, onClick) {
      return (
        <button
          style={mS(S.btn, {
            background: 'rgba(167,139,250,0.15)',
            color: T.purple,
            border: '1px solid rgba(167,139,250,0.3)',
            padding: '4px 8px',
            fontSize: 9,
            fontWeight: 700,
          })}
          onClick={onClick}
        >
          {label}
        </button>
      );
    }

    function secBtn(label, onClick) {
      return (
        <button
          style={mS(S.btn, {
            background: 'rgba(255,255,255,0.04)',
            color: T.cyan,
            border: '1px solid ' + T.border,
            padding: '3px 7px',
            fontSize: 8,
            fontWeight: 700,
          })}
          onClick={onClick}
        >
          {label}
        </button>
      );
    }

    function dangerBtn(label, onClick) {
      return (
        <button
          style={mS(S.btn, {
            background: 'rgba(239,68,68,0.15)',
            color: T.red,
            border: '1px solid rgba(239,68,68,0.3)',
            padding: '3px 7px',
            fontSize: 8,
            fontWeight: 700,
          })}
          onClick={onClick}
        >
          {label}
        </button>
      );
    }

    return (
      <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(167,139,250,0.3)', background: 'rgba(167,139,250,0.04)' }}>
        <div style={{ fontSize: 10, color: T.purple, fontWeight: 700, marginBottom: 4, letterSpacing: 1 }}>⚡ GOD MODE — FULL PLAYER EDITOR</div>
        <div style={{ fontSize: 8, color: T.faint, marginBottom: 8 }}>On: {findPTeam.icon} {findPTeam.abbr} — Click any field to edit</div>

        <div style={{ fontSize: 7, color: T.purple, fontWeight: 700, letterSpacing: 1, marginBottom: 3 }}>IDENTITY</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
          {editBtn('✏ ' + p.name, function () { promptGodModeValue('Player name:', 'name', p.name); })}
          {editBtn('🏈 ' + p.pos, function () { promptGodModeValue('Position (QB/RB/WR/TE/OL/DL/LB/CB/S/K/P):', 'pos', p.pos); })}
          {editBtn('🎂 Age: ' + p.age, function () { promptGodModeValue('Age (19-45):', 'age', p.age); })}
          {editBtn('📏 ' + formatHeight(p.height), function () { promptGodModeValue('Height in inches (e.g. 73 = 6\'1"):', 'height', p.height || 73); })}
          {editBtn('⚖️ ' + (p.weight || 220) + 'lb', function () { promptGodModeValue('Weight (lbs):', 'weight', p.weight || 220); })}
          {editBtn('🎓 ' + (p.college ? p.college.school || p.college : '?'), function () { promptGodModeValue('College:', 'college', p.college ? p.college.school || p.college : ''); })}
          {editBtn('#' + (p.number || '??'), function () { promptGodModeValue('Jersey Number:', 'number', p.number || ''); })}
        </div>

        <div style={{ fontSize: 7, color: T.purple, fontWeight: 700, letterSpacing: 1, marginBottom: 3 }}>RATINGS & DEVELOPMENT</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
          {editBtn('📊 OVR: ' + p.ovr, function () { promptGodModeValue('Overall (35-99):', 'ovr', p.ovr); })}
          {editBtn('📈 POT: ' + p.pot, function () { promptGodModeValue('Potential (1-99):', 'pot', p.pot); })}
          {editBtn('⭐ Dev: ' + (p.devTrait || 'normal'), function () { promptGodModeValue('Dev Trait (normal/star/superstar):', 'devTrait', p.devTrait || 'normal'); })}
          {editBtn('😊 Morale: ' + (p.morale || 70), function () { promptGodModeValue('Morale (0-99):', 'morale', p.morale || 70); })}
          {editBtn(p.isStarter ? '⭐ Starter' : '📋 Backup', function () { onGodModeEdit(p.id, 'isStarter', p.isStarter ? 'false' : 'true'); onRefresh(); })}
          {editBtn(p.onTradeBlock ? '🔴 On Block' : 'Trade Block', function () { onGodModeEdit(p.id, 'tradeBlock', p.onTradeBlock ? 'false' : 'true'); onRefresh(); })}
        </div>

        <div style={{ fontSize: 7, color: T.purple, fontWeight: 700, letterSpacing: 1, marginBottom: 3 }}>TRAITS</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
          {editBtn(TRAITS[p.trait] ? TRAITS[p.trait].icon + ' ' + TRAITS[p.trait].name : 'No Trait', function () {
            var traitList = Object.keys(TRAITS).map(function (key) { return key + ' (' + TRAITS[key].name + ')'; }).join(', ');
            var value = prompt('Trait ID:\n' + traitList, p.trait || 'none');
            if (!value) return;
            onGodModeEdit(p.id, 'trait', value);
            onRefresh();
          })}
          {p.injury && p.injury.games > 0
            ? editBtn('🏥 Heal (' + p.injury.games + 'wk)', function () { onGodModeEdit(p.id, 'injury', 'heal'); onRefresh(); })
            : editBtn('🤕 Injure', function () {
              var value = prompt('Injury weeks (1-20):', 4);
              if (!value) return;
              onGodModeEdit(p.id, 'injury', value);
              onRefresh();
            })}
        </div>

        <div style={{ fontSize: 7, color: T.purple, fontWeight: 700, letterSpacing: 1, marginBottom: 3 }}>CONTRACT</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
          {editBtn('💰 Base: $' + (contract.baseSalary || 0).toFixed(1) + 'M', function () { promptGodModeValue('Base Salary ($M):', 'salary', contract.baseSalary || contract.salary); })}
          {editBtn('📅 ' + (contract.years || 0) + 'yr', function () { promptGodModeValue('Contract years (1-8):', 'years', contract.years); })}
          {editBtn('🎁 Bonus: $' + (contract.signingBonus || 0).toFixed(1) + 'M', function () { promptGodModeValue('Signing Bonus ($M):', 'signingBonus', contract.signingBonus || 0); })}
          {editBtn('🔒 GTD: $' + (contract.guaranteed || 0).toFixed(1) + 'M', function () { promptGodModeValue('Guaranteed Money ($M):', 'guaranteed', contract.guaranteed || 0); })}
          {secBtn('Cap Hit: $' + capHit.toFixed(1) + 'M', function () { onNotify('Cap hit is calculated from base + prorated bonus', 'info'); })}
        </div>

        <div style={{ fontSize: 7, color: T.purple, fontWeight: 700, letterSpacing: 1, marginBottom: 3 }}>PERSONALITY (1-10)</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
          {editBtn('💪 Work: ' + (personality.workEthic || 5), function () { promptGodModeValue('Work Ethic (1-10):', 'workEthic', personality.workEthic || 5); })}
          {editBtn('💙 Loyal: ' + (personality.loyalty || 5), function () { promptGodModeValue('Loyalty (1-10):', 'loyalty', personality.loyalty || 5); })}
          {editBtn('💰 Greed: ' + (personality.greed || 5), function () { promptGodModeValue('Greed (1-10):', 'greed', personality.greed || 5); })}
          {editBtn('⭐ Clutch: ' + (personality.pressure || 5), function () { promptGodModeValue('Clutch / Pressure (1-10):', 'pressure', personality.pressure || 5); })}
          {editBtn('🔥 Ambition: ' + (personality.ambition || 5), function () { promptGodModeValue('Ambition (1-10):', 'ambition', personality.ambition || 5); })}
        </div>

        <div style={{ fontSize: 7, color: T.purple, fontWeight: 700, letterSpacing: 1, marginBottom: 3 }}>INTANGIBLES</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
          {editBtn('🤝 Chemistry: ' + (p.chemistry || 60), function () { promptGodModeValue('Team Chemistry (0-100):', 'chemistry', p.chemistry || 60); })}
          {editBtn('📚 System Fit: ' + (p.systemFit || 50), function () { promptGodModeValue('System Fit (0-100):', 'systemFit', p.systemFit || 50); })}
        </div>

        <div style={{ fontSize: 7, color: T.purple, fontWeight: 700, letterSpacing: 1, marginBottom: 3 }}>CAREER & ACCOLADES</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
          {editBtn('🏆 Pro Bowls: ' + (cs.proBowls || 0), function () { promptGodModeValue('Pro Bowl selections:', 'proBowls', cs.proBowls || 0); })}
          {editBtn('🥇 All-Pros: ' + (cs.allPros || 0), function () { promptGodModeValue('All-Pro selections:', 'allPros', cs.allPros || 0); })}
          {editBtn('📊 Draft Yr: ' + (p.draftInfo ? p.draftInfo.year || '?' : 'UDFA'), function () { promptGodModeValue('Draft Year:', 'draftYear', p.draftInfo ? p.draftInfo.year || 2026 : 2026); })}
          {editBtn('📋 Draft Rd: ' + (p.draftInfo ? p.draftInfo.round || '?' : '?'), function () { promptGodModeValue('Draft Round (1-7):', 'draftRound', p.draftInfo ? p.draftInfo.round || 1 : 1); })}
          {editBtn('🎯 Draft Pick: ' + (p.draftInfo ? p.draftInfo.pick || '?' : '?'), function () { promptGodModeValue('Draft Pick # (1-32):', 'draftPick', p.draftInfo ? p.draftInfo.pick || 1 : 1); })}
        </div>

        <div style={{ fontSize: 7, color: T.purple, fontWeight: 700, letterSpacing: 1, marginBottom: 3 }}>ACTIONS</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
          {editBtn('⚔️ Compare', function () { onCompare(p, findPTeam ? findPTeam.abbr : '?'); })}
          {editBtn('🧬 Clone', function () { onGodModeClone(findPTeam.id, p.id); })}
          {editBtn('✈️ Move', function () {
            var dest = prompt('Move ' + p.name + ' to team (abbr):', my ? my.abbr : '');
            if (!dest) return;
            var destTeam = teams.find(function (team) { return team.abbr.toLowerCase() === dest.toLowerCase(); });
            if (!destTeam) {
              onNotify('Team not found: ' + dest, 'red');
              return;
            }
            onGodModeMove(p.id, findPTeam.id, destTeam.id);
            onRefresh();
          })}
          {findPTeam.id !== myId ? editBtn('⚡ Steal', function () { onGodModeSteal(findPTeam.id, p.id); onRefresh(); }) : null}
          {dangerBtn('🗑 Reset Season Stats', function () { if (confirm('Clear ' + p.name + "'s season stats?")) { onGodModeEdit(p.id, 'resetStats', '1'); onRefresh(); } })}
          {dangerBtn('🗑 Reset Career Stats', function () { if (confirm('Clear ' + p.name + "'s ENTIRE career stats?")) { onGodModeEdit(p.id, 'resetCareer', '1'); onRefresh(); } })}
          {dangerBtn('🚪 Force Retire', function () { if (confirm('Force retire ' + p.name + '?')) onGodModeForceRetire(findPTeam.id, p.id); })}
        </div>

        <div style={{ fontSize: 7, color: T.purple, fontWeight: 700, letterSpacing: 1, marginTop: 4, marginBottom: 3 }}>
          INDIVIDUAL RATINGS ({def.r.length} attributes)
        </div>
        {(function () {
          var cats = def.cat || { ALL: def.r };
          return Object.keys(cats).map(function (catName) {
            return (
              <div key={catName} style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 7, color: T.purple, fontWeight: 700, letterSpacing: 1, marginBottom: 2 }}>{catName}</div>
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {cats[catName].map(function (ratingKey) {
                    var value = (p.ratings || {})[ratingKey] || 50;
                    var ratingColor = value >= 80 ? T.green : value >= 65 ? T.gold : value >= 50 ? T.orange : T.red;
                    return (
                      <button
                        key={ratingKey}
                        style={mS(S.btn, {
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid ' + ratingColor + '44',
                          color: ratingColor,
                          padding: '2px 5px',
                          fontSize: 7,
                          fontWeight: 700,
                        })}
                        onClick={function () {
                          var valuePrompt = prompt((RATING_LABELS[ratingKey] || ratingKey) + ' (' + ratingKey + ') rating (1-99):', value);
                          if (!valuePrompt) return;
                          onGodModeEdit(p.id, 'rating', ratingKey + ':' + valuePrompt);
                          onRefresh();
                        }}
                      >
                        {(RATING_LABELS[ratingKey] || ratingKey.slice(0, 4)) + ': ' + value}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          });
        })()}
        <div style={{ fontSize: 8, color: T.faint, marginTop: 6 }}>Changes save instantly. Close & reopen to refresh displayed values.</div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 10,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: T.bg2,
          borderRadius: 16,
          overflow: 'hidden',
          maxHeight: '92vh',
          overflowY: 'auto',
          border: '1px solid ' + ovrColor + '33',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 1px ' + ovrColor + '55',
        }}
        onClick={function (e) { e.stopPropagation(); }}
      >
        <div style={{ background: 'linear-gradient(135deg, ' + ovrColor + '18 0%, ' + T.bg3 + ' 60%)', padding: 0, position: 'relative' }}>
          <div style={{ height: 4, background: 'linear-gradient(90deg, ' + ovrColor + ', ' + ovrColor + '88, transparent)' }}></div>
          <div style={{ padding: '16px 20px 14px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <PlayerFace id={p.id} morale={p.morale || 70} size={64} age={p.age} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: -0.5, lineHeight: 1.1 }}>{p.name}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                <span style={{ background: ovrColor + '22', color: ovrColor, fontWeight: 800, fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px solid ' + ovrColor + '44' }}>{p.pos}</span>
                {arch ? <span title={(arch.label || '') + ': ' + (arch.description || '')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid ' + T.border, color: '#fff', fontWeight: 800, fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>{arch.emoji + ' ' + arch.label}</span> : null}
                <span style={{ fontSize: 11, color: T.dim }}>Age {p.age}</span>
                <span style={{ fontSize: 10, color: phase.color }}>{phase.label + ' ' + phase.tip}</span>
                {traitKeys.filter(function (traitKey) { return TRAITS[traitKey] && TRAITS[traitKey].icon; }).slice(0, 3).map(function (traitKey, traitIndex) {
                  var traitObj = TRAITS[traitKey];
                  return <span key={traitIndex} title={traitObj.name + ': ' + (traitObj.desc || '')} style={{ fontSize: 10, background: 'rgba(255,255,255,0.07)', padding: '1px 6px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', fontWeight: 600 }}>{traitObj.icon + ' ' + traitObj.name}</span>;
                })}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 10, color: T.dim, flexWrap: 'wrap' }}>
                {p.college ? <span style={{ color: T.cyan }}>{'🎓 ' + p.college.school}</span> : null}
                {p.height ? <span>{formatHeight(p.height)}</span> : null}
                {p.weight ? <span>{p.weight + ' lbs'}</span> : null}
                {expYrs > 0 ? <span>{expYrs + 'yr exp'}</span> : null}
                {p.isRookie ? <span style={{ color: T.green }}>ROOKIE</span> : null}
              </div>

              {p.character75 ? (
                <div style={{ display: 'flex', gap: 4, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: 'rgba(167,139,250,0.12)', color: T.purple, fontWeight: 700 }}>{p.character75.icon + ' ' + p.character75.label}</span>
                  <span style={{ fontSize: 8, color: T.dim }}>{p.character75.desc}</span>
                </div>
              ) : null}

              {p.holdout75 ? (
                (function () {
                  var stage = holdoutStages[p.id] || 1;
                  var stageColors = ['#fbbf24', '#f97316', '#ef4444', '#dc2626', '#7f1d1d'];
                  var stageLabels = ['STAGE 1: NO-SHOW', 'STAGE 2: STATEMENT', 'STAGE 3: TRADE DEMAND', 'STAGE 4: SUSPENDED', 'STAGE 5: NUCLEAR ☢️'];
                  var stageIcons = ['⚠️', '📢', '🔀', '🚫', '☢️'];
                  var stageColor = stageColors[stage - 1] || '#ef4444';
                  var stageLabel = stageLabels[stage - 1] || 'HOLDOUT';
                  var stageIcon = stageIcons[stage - 1] || '⚠️';
                  return (
                    <div style={{ marginTop: 3, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ color: stageColor, border: '1px solid ' + stageColor, borderRadius: 4, padding: '1px 5px', background: 'rgba(0,0,0,0.3)', letterSpacing: '0.3px' }}>
                        {stageIcon + ' ' + stageLabel + ' — Wk ' + ((p.holdout75 || {}).week || 1)}
                      </span>
                      {isOnMyRoster && !holdoutNegotiationActive ? (
                        <button
                          onClick={function (e) {
                            e.stopPropagation();
                            onStartHoldoutNegotiation(p);
                          }}
                          style={mS(buttonStyleBuilder(stageColor, '#fff'), { padding: '1px 6px', fontSize: 8, borderRadius: 4 })}
                        >
                          🤝 Negotiate
                        </button>
                      ) : null}
                    </div>
                  );
                })()
              ) : null}

              {p.injury && p.injury.games > 0 && isOnMyRoster && !p.injury._rehab78 ? (
                <div style={{ marginTop: 4 }}>
                  <div style={{ fontSize: 8, fontWeight: 700, color: T.faint, marginBottom: 2 }}>🏥 CHOOSE REHAB PLAN</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(REHAB_SYSTEM.options || []).map(function (option) {
                      return (
                        <button
                          key={option.id}
                          onClick={function (e) {
                            e.stopPropagation();
                            onApplyRehab(p, option.id);
                          }}
                          style={mS(buttonStyleBuilder(option.color, '#fff'), { padding: '2px 6px', fontSize: 7, borderRadius: 4 })}
                        >
                          {option.icon + ' ' + option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {p.injury && p.injury._rehab78 ? (
                <div style={{ marginTop: 3, fontSize: 9, fontWeight: 700, color: p.injury._rehab78 === 'aggressive' ? T.red : p.injury._rehab78 === 'conservative' ? '#3b82f6' : '#a855f7' }}>
                  {'🏥 Rehab: ' + (p.injury._rehab78 || 'standard').toUpperCase() + ' — ' + p.injury.games + 'wk remaining'}
                </div>
              ) : null}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-around', padding: '0 20px 14px', gap: 4 }}>
            {[
              { label: 'OVR', val: p.ovr, color: ovrColor, glow: ovrGlow },
              { label: 'POT', val: p.pot, color: T.cyan, glow: 'none' },
              { label: 'MRL', val: p.morale || 70, color: (p.morale || 70) >= 70 ? T.green : (p.morale || 70) >= 45 ? T.orange : T.red, glow: 'none' },
              p.pff ? { label: 'MFDF', val: p.pff, color: p.pff >= 85 ? '#10b981' : p.pff >= 75 ? '#22d3ee' : p.pff >= 60 ? '#fbbf24' : '#ef4444', glow: 'none' } : null,
            ].filter(Boolean).map(function (group) {
              return (
                <div key={group.label} style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: group.color, lineHeight: 1, textShadow: group.glow }}>{group.val}</div>
                  <div style={{ fontSize: 8, color: T.faint, fontWeight: 700, letterSpacing: 1.5, marginTop: 2 }}>{group.label}</div>
                </div>
              );
            })}
          </div>

          <div style={{ position: 'absolute', top: 8, right: 12 }}>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 10,
                background: p.devTrait === 'superstar' ? 'rgba(251,191,36,0.2)' : p.devTrait === 'star' ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.05)',
                color: p.devTrait === 'superstar' ? T.gold : p.devTrait === 'star' ? T.cyan : T.faint,
                border: '1px solid ' + (p.devTrait === 'superstar' ? T.gold + '44' : p.devTrait === 'star' ? T.cyan + '44' : 'transparent'),
              }}
            >
              {p.devTrait === 'superstar' ? '🌟 Superstar' : p.devTrait === 'star' ? '⭐ Star' : 'Normal'}
            </span>
          </div>
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid ' + T.border, borderBottom: '1px solid ' + T.border }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: T.gold, fontWeight: 700, letterSpacing: 1.5 }}>{'ATTRIBUTES (' + def.r.length + ')'}</div>
            <div style={{ fontSize: 8, color: T.faint }}>{p.pos + ' • ' + Object.keys(def.cat || {}).join(' | ')}</div>
          </div>

          {(function () {
            var cats = def.cat || { ALL: def.r };
            return Object.keys(cats).map(function (catName) {
              var catRatings = cats[catName];
              return (
                <div key={catName} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 8, color: T.purple, fontWeight: 700, letterSpacing: 1, marginBottom: 4, paddingBottom: 2, borderBottom: '1px solid ' + T.purple + '20' }}>{catName}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px' }}>
                    {catRatings.map(function (ratingKey) {
                      var value = (p.ratings || {})[ratingKey] || 50;
                      var barColor = value >= 85 ? '#10b981' : value >= 75 ? '#22d3ee' : value >= 65 ? '#fbbf24' : value >= 50 ? '#f97316' : '#ef4444';
                      var isCore = def.r.indexOf(ratingKey) < 5;
                      return (
                        <div key={ratingKey} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 1 }}>
                          <div style={{ width: 28, fontSize: 8, color: isCore ? T.gold : T.dim, fontWeight: isCore ? 700 : 500 }}>{RATING_LABELS[ratingKey] || ratingKey.slice(0, 3)}</div>
                          <div style={{ flex: 1, height: 7, background: T.bg3, borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ width: value + '%', height: '100%', background: 'linear-gradient(90deg, ' + barColor + 'cc, ' + barColor + ')', borderRadius: 4 }} />
                          </div>
                          <div style={{ width: 24, textAlign: 'right', fontWeight: 700, fontSize: 10, color: barColor }}>{value}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}
        </div>

        {cs.ovrHistory && cs.ovrHistory.length > 1 ? (
          (function () {
            var hist = cs.ovrHistory;
            var peakOvr = Math.max.apply(null, hist);
            var lowestOvr = Math.min.apply(null, hist);
            var range = Math.max(peakOvr - lowestOvr, 10);
            var barW = Math.floor(280 / hist.length);
            var peakIdx = hist.indexOf(peakOvr);
            return (
              <div style={{ padding: '10px 20px', borderBottom: '1px solid ' + T.border }}>
                <div style={{ fontSize: 9, color: T.gold, fontWeight: 700, letterSpacing: 1.5, marginBottom: 6 }}>📈 CAREER ARC</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 40, marginBottom: 4 }}>
                  {hist.map(function (ovr, seasonIndex) {
                    var height = Math.max(4, Math.round(((ovr - lowestOvr + 5) / range) * 35));
                    var barColor = ovr >= 85 ? '#10b981' : ovr >= 75 ? '#22d3ee' : ovr >= 65 ? '#fbbf24' : '#f97316';
                    return (
                      <div
                        key={seasonIndex}
                        title={'Season ' + (seasonIndex + 1) + ': ' + ovr + ' OVR'}
                        style={{
                          width: Math.max(barW, 8),
                          maxWidth: 20,
                          height: height,
                          background: seasonIndex === peakIdx ? 'linear-gradient(180deg, ' + T.gold + ', ' + barColor + ')' : barColor,
                          borderRadius: '2px 2px 0 0',
                          opacity: seasonIndex === hist.length - 1 ? 1 : 0.7,
                          cursor: 'default',
                        }}
                      ></div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: T.faint }}>
                  <span>{'S1: ' + hist[0]}</span>
                  <span style={{ color: T.gold, fontWeight: 700 }}>{'Peak: ' + peakOvr + ' (S' + (peakIdx + 1) + ')'}</span>
                  <span>{'Now: ' + hist[hist.length - 1]}</span>
                </div>
              </div>
            );
          })()
        ) : null}

        {scouting ? (
          (function () {
            var confidenceTier = scoutingHelpers.confTier ? scoutingHelpers.confTier(scouting.confidence) : 'forming';
            var confidenceColor = scoutingHelpers.confColor ? scoutingHelpers.confColor(scouting.confidence) : T.cyan;
            var confidencePct = Math.round((scouting.confidence || 0) * 100);
            var report = scoutingHelpers.getScoutRpt ? scoutingHelpers.getScoutRpt(confidenceTier, p.ovr) : { t: '{player.name}', r: 'scout' };
            var reportText = report.t
              .replace(/\{player\.name\}/g, p.name)
              .replace(/\{player\.pos\}/g, p.pos)
              .replace(/\{player\.age\}/g, String(p.age || '?'))
              .replace(/\{player\.college\.school\}/g, (p.college || {}).school || 'Unknown')
              .replace(/\{range\.min\}/g, String(p.scoutRange ? p.scoutRange.min : '?'))
              .replace(/\{range\.max\}/g, String(p.scoutRange ? p.scoutRange.max : '?'))
              .replace(/\{topRating\}/g, def.r[0] || 'athleticism')
              .replace(/\{weakRating\}/g, def.r[def.r.length - 1] || 'durability')
              .replace(/\{scout\.name\}/g, my && my.scouts && my.scouts[0] ? my.scouts[0].name : 'Scout');
            var reporter = report.r === 'rex' ? 'Rex Buckley' : report.r === 'dana' ? 'Dana Sharpe' : 'Scout Report';
            return (
              <div style={{ padding: '12px 20px', borderBottom: '1px solid ' + T.border, background: 'rgba(167,139,250,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 9, color: '#a78bfa', fontWeight: 700, letterSpacing: 1.5 }}>🔍 SCOUTING INTEL</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 50, height: 6, background: T.bg3, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: confidencePct + '%', height: '100%', background: confidenceColor, borderRadius: 3 }}></div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: confidenceColor }}>{confidenceTier.toUpperCase() + ' (' + confidencePct + '%)'}</span>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: T.dim, fontStyle: 'italic', marginBottom: 6, lineHeight: 1.4 }}>
                  {'"' + reportText + '"'}
                </div>
                <div style={{ fontSize: 9, color: T.faint, textAlign: 'right' }}>{'— ' + reporter}</div>
                {scouting.events && scouting.events.length > 0 ? <div style={{ fontSize: 9, color: T.faint, marginTop: 4 }}>{'Events: ' + scouting.events.join(', ')}</div> : null}
                {scouting.isRookie ? <div style={{ fontSize: 9, color: '#f59e0b', marginTop: 4, fontWeight: 600 }}>⚠️ Rookie — high variance (±15 OVR). Scout extensively before drafting.</div> : null}
              </div>
            );
          })()
        ) : null}

        <div style={{ padding: '12px 20px', borderBottom: '1px solid ' + T.border }}>
          <div style={{ fontSize: 9, color: T.blue, fontWeight: 700, marginBottom: 6, letterSpacing: 1.5 }}>CONTRACT</div>
          <div style={{ display: 'flex', gap: 20, fontSize: 12, flexWrap: 'wrap' }}>
            <div><span style={{ color: T.faint }}>Cap Hit </span><span style={{ fontWeight: 800, color: T.green }}>{'$' + capHit + 'M'}</span></div>
            <div><span style={{ color: T.faint }}>Cash </span><span style={{ fontWeight: 800, color: '#22c55e' }}>{'$' + cashPaid + 'M/yr'}</span></div>
            <div><span style={{ color: T.faint }}>Years </span><span style={{ fontWeight: 800 }}>{contract.years}</span></div>
            {(contract.prorated || 0) > 0 ? <div><span style={{ color: T.faint }}>Bonus </span><span style={{ fontWeight: 800, color: T.orange }}>{'$' + Math.round((contract.prorated || 0) * 10) / 10 + 'M/yr'}</span></div> : null}
          </div>

          {(contract.prorated || 0) > 0 ? (
            <div style={{ display: 'flex', gap: 16, fontSize: 10, marginTop: 6, color: T.dim }}>
              <span style={{ color: '#ef4444' }}>{'✂️ Cut: $' + deadIfCut + 'M dead'}</span>
              <span style={{ color: '#f59e0b' }}>{'🔄 Trade: $' + deadIfTraded + 'M dead (save $' + Math.abs(tradeSavings) + 'M)'}</span>
            </div>
          ) : null}

          {traitKeys.filter(function (traitKey) { return TRAITS[traitKey] && TRAITS[traitKey].name; }).length > 0 ? (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {traitKeys.filter(function (traitKey) { return TRAITS[traitKey] && TRAITS[traitKey].name; }).slice(0, 3).map(function (traitKey, traitIndex) {
                var traitObj = TRAITS[traitKey];
                return (
                  <div key={traitIndex} style={{ fontSize: 10, color: T.dim, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 12 }}>{traitObj.icon}</span>
                    <span style={{ fontWeight: 700, color: T.text }}>{traitObj.name}</span>
                    {traitObj.desc ? <span style={{ color: T.faint }}>{'— ' + traitObj.desc}</span> : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {renderGodModeEditor()}

        <div style={{ padding: '12px 20px', borderBottom: '1px solid ' + T.border }}>
          <div style={{ fontSize: 9, color: T.green, fontWeight: 700, marginBottom: 8, letterSpacing: 1.5 }}>THIS SEASON</div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 6, fontSize: 12 }}>
            <div style={{ display: 'flex', gap: 4, alignItems: 'baseline' }}><span style={{ fontSize: 20, fontWeight: 900 }}>{stats.gp || 0}</span><span style={{ fontSize: 9, color: T.faint }}>GP</span></div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'baseline' }}><span style={{ fontSize: 20, fontWeight: 900 }}>{stats.snaps || 0}</span><span style={{ fontSize: 9, color: T.faint }}>SNAPS</span></div>
            {p.isStarter ? <span style={{ fontSize: 9, fontWeight: 700, color: T.green, background: 'rgba(16,185,129,0.12)', padding: '2px 8px', borderRadius: 4, alignSelf: 'center' }}>STARTER</span> : null}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, borderLeft: '3px solid ' + T.green }}>{seasonLine}</div>
          {(p.pos === 'WR' || p.pos === 'TE') && stats.targets > 0 ? <div style={{ fontSize: 10, color: T.dim, marginTop: 4 }}>{'Targets:' + stats.targets + ' | Drops:' + stats.drops + ' | YAC:' + stats.yac}</div> : null}
          {p.pos === 'OL' && (stats.sacksAllowed || 0) > 0 ? <div style={{ fontSize: 10, color: T.red, marginTop: 4 }}>{'Sacks Allowed: ' + stats.sacksAllowed}</div> : null}
        </div>

        <div style={{ padding: '12px 20px', borderBottom: '1px solid ' + T.border }}>
          <div style={{ fontSize: 9, color: T.purple, fontWeight: 700, marginBottom: 8, letterSpacing: 1.5 }}>CAREER</div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 6, fontSize: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 4, alignItems: 'baseline' }}><span style={{ fontSize: 18, fontWeight: 900 }}>{cs.seasons || 0}</span><span style={{ fontSize: 9, color: T.faint }}>YRS</span></div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'baseline' }}><span style={{ fontSize: 18, fontWeight: 900 }}>{cs.gp || 0}</span><span style={{ fontSize: 9, color: T.faint }}>GP</span></div>
            {(cs.rings || 0) > 0 ? <span style={{ fontSize: 12, fontWeight: 800, color: T.gold }}>{'💍×' + cs.rings}</span> : null}
            {(cs.mvps || 0) > 0 ? <span style={{ fontSize: 12, fontWeight: 800, color: T.gold }}>{'🏆×' + cs.mvps}</span> : null}
            {(cs.allPros || 0) > 0 ? <span style={{ fontSize: 12, fontWeight: 800, color: T.cyan }}>{'⭐×' + cs.allPros}</span> : null}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, borderLeft: '3px solid ' + T.purple }}>{careerLine}</div>
        </div>

        {p.injury && p.injury.games > 0 ? (
          <div style={{ padding: '10px 20px', borderBottom: '1px solid ' + T.border, background: 'rgba(239,68,68,0.06)' }}>
            <div style={{ fontSize: 11, color: T.red, fontWeight: 700 }}>
              {(function () {
                var injuryMask = getInjuryMask(p, my);
                return '🤕 ' + injuryMask.type + ' — ' + injuryMask.status;
              })()}
            </div>
          </div>
        ) : null}

        {p.college && (p.college.passYds || p.college.rushYds || p.college.rec || p.college.starts) ? (
          <div style={{ padding: '12px 20px', borderBottom: '1px solid ' + T.border }}>
            <div style={{ fontSize: 9, color: T.cyan, fontWeight: 700, marginBottom: 6, letterSpacing: 1.5 }}>{'COLLEGE — ' + p.college.school.toUpperCase()}</div>
            <div style={{ display: 'flex', gap: 12, fontSize: 11, flexWrap: 'wrap' }}>
              {p.college.passYds ? <span><span style={{ color: T.faint }}>Pass </span><span style={{ fontWeight: 700 }}>{p.college.passYds + 'yd ' + p.college.passTD + 'TD ' + p.college.int + 'INT ' + p.college.comp + '%'}</span></span> : null}
              {p.college.rushYds ? <span><span style={{ color: T.faint }}>Rush </span><span style={{ fontWeight: 700 }}>{p.college.rushYds + 'yd ' + p.college.rushTD + 'TD ' + p.college.ypc + 'ypc'}</span></span> : null}
              {p.college.rec ? <span><span style={{ color: T.faint }}>Rec </span><span style={{ fontWeight: 700 }}>{p.college.rec + 'rec ' + p.college.recYds + 'yd ' + p.college.recTD + 'TD'}</span></span> : null}
              {p.college.starts ? <span><span style={{ color: T.faint }}>Starts </span><span style={{ fontWeight: 700 }}>{p.college.starts}</span>{p.college.awards && p.college.awards !== 'None' ? <span style={{ color: T.gold, marginLeft: 4 }}>{' ' + p.college.awards}</span> : null}</span> : null}
            </div>
            {p.combine ? (
              <div style={{ display: 'flex', gap: 10, fontSize: 10, color: T.dim, marginTop: 4 }}>
                <span>{'40: ' + p.combine.forty + 's'}</span>
                <span>{'Bench: ' + p.combine.bench}</span>
                <span>{'Vert: ' + p.combine.vertical + '"'}</span>
                <span>{'Shuttle: ' + p.combine.shuttle + 's'}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {storyTags.length > 0 ? (
          <div style={{ padding: '10px 20px', borderBottom: '1px solid ' + T.border }}>
            <div style={{ fontSize: 10, color: T.orange, fontWeight: 700, marginBottom: 6, letterSpacing: 1 }}>STORYLINES</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {storyTags.slice(0, 6).map(function (tag, tagIndex) {
                return (
                  <span key={tagIndex} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 12, fontSize: 9, fontWeight: 600, background: 'rgba(255,255,255,0.05)', border: '1px solid ' + tag.color + '33', color: tag.color }}>
                    <span>{tag.icon}</span><span>{tag.text}</span>
                  </span>
                );
              })}
            </div>
          </div>
        ) : null}

        <div style={{ padding: '8px 20px', borderBottom: '1px solid ' + T.border }}>
          <button onClick={function (e) { e.stopPropagation(); onShopPlayer(p); }} style={mS(S.btn, S.btnPrimary, { width: '100%', padding: 10 })}>{'🛒 Shop ' + p.name}</button>
          {shopOffers.length > 0 ? (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: T.gold, marginBottom: 6 }}>📊 OFFERS RECEIVED</div>
              {shopOffers.map(function (offer, offerIndex) {
                var pickStr = (offer.picks || []).map(function (pick) { return 'Rd' + pick.round + (pick.year ? " '" + String(pick.year).slice(2) : ''); }).join(', ');
                var playerStr = (offer.players || []).map(function (player) { return player.name + ' (' + player.pos + ' ' + player.ovr + ')'; }).join(', ');
                var offerStr = [pickStr, playerStr].filter(Boolean).join(' + ');
                return (
                  <div
                    key={offerIndex}
                    style={mS(S.card, { padding: 10, marginBottom: 6, cursor: 'pointer', borderColor: T.gold })}
                    onClick={function (e) {
                      e.stopPropagation();
                      onAcceptShopOffer(offer, p);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <TeamLogo team={offer.team} size={22} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 11 }}>{offer.team.abbr + ' offers:'}</div>
                        <div style={{ fontSize: 10, color: T.cyan }}>{offerStr || 'No valid package'}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <div style={{ padding: '12px 20px' }}>
          <button onClick={onCloseButton} style={mS(S.btn, S.btnGhost, { width: '100%', padding: 10 })}>Close</button>
        </div>
      </div>
    </div>
  );
}
