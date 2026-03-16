import fs from 'node:fs';
import path from 'node:path';

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Modal, PlayerCard, ToastContainer } from '../src/components/index.js';

function StubFace() {
  return <span>FACE</span>;
}

function StubLogo() {
  return <span>LOGO</span>;
}

describe('component extraction phase 3', () => {
  it('wires PlayerCard, Modal, and ToastContainer through the monolith and shared components barrel', () => {
    var monolithSrc = fs.readFileSync(path.resolve(process.cwd(), 'mr-football-v100.jsx'), 'utf8');
    var barrelSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/index.js'), 'utf8');

    expect(barrelSrc).toContain("export { Modal } from './Modal.jsx';");
    expect(barrelSrc).toContain("export { PlayerCard } from './PlayerCard.jsx';");
    expect(barrelSrc).toContain("export { ToastContainer } from './Toast.jsx';");

    expect(monolithSrc).toContain("import { StatBar, ToneBadge, WeeklyShowCard, Icon, Modal, PlayerCard, ToastContainer } from './src/components/index.js';");
    expect(monolithSrc).toContain('{playerDetail && <PlayerCard');
    expect(monolithSrc).toContain('<Modal isOpen={showKbHelp}');
    expect(monolithSrc).toContain('<Modal isOpen={importModal}');
    expect(monolithSrc).toContain('React.createElement(ToastContainer,{toasts:toasts,remove:removeToast,onAction:handleToastAction})');

    expect(monolithSrc).not.toContain('var ToastContainer = memo(function(props){');
    expect(monolithSrc).not.toContain('{playerDetail && (function(){');
    expect(monolithSrc).not.toContain('{showKbHelp && <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:9500,display:"flex",alignItems:"center",justifyContent:"center"}}');
    expect(monolithSrc).not.toContain('{importModal && <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:9500,display:"flex",alignItems:"center",justifyContent:"center"}}');
  });

  it('renders Modal only when open', () => {
    var openHtml = renderToStaticMarkup(
      <Modal isOpen={true} onClose={function noop() {}} borderColor="#00afc8">
        <div>modal body</div>
      </Modal>
    );
    var closedHtml = renderToStaticMarkup(
      <Modal isOpen={false} onClose={function noop() {}}>
        <div>hidden body</div>
      </Modal>
    );

    expect(openHtml).toContain('modal body');
    expect(openHtml).toContain('#00afc8');
    expect(closedHtml).toBe('');
  });

  it('renders ToastContainer content and actionable affordance', () => {
    var html = renderToStaticMarkup(
      <ToastContainer
        toasts={[
          { id: 'toast-1', title: 'SUCCESS', text: 'League imported', type: 'green', action: { type: 'tab', tab: 'home' } },
        ]}
        remove={function noop() {}}
        onAction={function noop() {}}
      />
    );

    expect(html).toContain('SUCCESS');
    expect(html).toContain('League imported');
    expect(html).toContain('TAP');
  });

  it('renders PlayerCard core sections and shop offers without AppCore ownership changes', () => {
    var player = {
      id: 'player-1',
      name: 'Test Player',
      pos: 'QB',
      age: 24,
      ovr: 88,
      pot: 92,
      morale: 77,
      devTrait: 'star',
      trait: 'captain',
      traits95: ['captain'],
      ratings: { thp: 91, acc: 86 },
      stats: { gp: 4, snaps: 180, passYds: 1250, passTD: 11, int: 3 },
      careerStats: { seasons: 2, gp: 21, passYds: 6200, passTD: 49, int: 14, ovrHistory: [79, 88], rings: 1, allPros: 1, proBowls: 1 },
      contract: { baseSalary: 12.5, years: 3, prorated: 2.0, signingBonus: 6.0, guaranteed: 20.0 },
      college: { school: 'Test U', passYds: 12000, passTD: 110, int: 21, comp: 67, starts: 40, awards: 'MVP' },
      combine: { forty: 4.72, bench: 18, vertical: 32, shuttle: 4.4 },
      pff: 86,
    };
    var html = renderToStaticMarkup(
      <PlayerCard
        player={player}
        my={{ id: 'team-1', abbr: 'TST', roster: [player], scouts: [{ name: 'Scout Sam' }] }}
        myId="team-1"
        teams={[{ id: 'team-1', abbr: 'TST', icon: '🏈', roster: [player] }]}
        godMode={false}
        holdoutStages={{}}
        holdoutNegotiationActive={false}
        shopOffers={[
          {
            team: { id: 'team-2', abbr: 'ALT', icon: '🛡️' },
            picks: [{ round: 1, year: 2028 }],
            players: [{ id: 'player-2', name: 'Prospect', pos: 'WR', ovr: 79 }],
          },
        ]}
        PlayerFace={StubFace}
        TeamLogo={StubLogo}
        getAgingPhase={function () { return { label: 'Prime Window', tip: 'ascending', color: '#ffffff' }; }}
        PLAYER_ARCHETYPES={{ classify: function () { return { emoji: '🧠', label: 'Field General', description: 'Processes fast' }; } }}
        POS_DEF={{ QB: { r: ['thp', 'acc'], cat: { ARM: ['thp'], ACCURACY: ['acc'] } } }}
        TRAITS={{ captain: { icon: '©️', name: 'Captain', desc: 'Leads the locker room' }, none: { icon: '', name: 'None', desc: '' } }}
        RATING_LABELS={{ thp: 'THP', acc: 'ACC' }}
        REHAB_SYSTEM={{ options: [] }}
        hasTrait95={function (subject, traitKey) { return (subject.traits95 || []).indexOf(traitKey) >= 0; }}
        buttonStyleBuilder={function () { return {}; }}
        capHelpers={{
          v36_capHit: function () { return 14.5; },
          v36_cashPaid: function () { return 12.5; },
          v36_deadIfCut: function () { return 6.0; },
          v36_deadIfTraded: function () { return 4.0; },
          v36_tradeSavings: function () { return 10.5; },
        }}
        scoutingHelpers={{
          confTier: function () { return 'clear'; },
          confColor: function () { return '#10b981'; },
          getScoutRpt: function () { return { t: '{player.name} is a strong processor.', r: 'scout' }; },
        }}
        getInjuryMask={function () { return { type: 'Healthy', status: 'Ready' }; }}
        onClose={function noop() {}}
        onCloseButton={function noop() {}}
        onRefresh={function noop() {}}
        onApplyRehab={function noop() {}}
        onStartHoldoutNegotiation={function noop() {}}
        onShopPlayer={function noop() {}}
        onAcceptShopOffer={function noop() {}}
        onCompare={function noop() {}}
        onNotify={function noop() {}}
        onGodModeEdit={function noop() {}}
        onGodModeClone={function noop() {}}
        onGodModeMove={function noop() {}}
        onGodModeSteal={function noop() {}}
        onGodModeForceRetire={function noop() {}}
      />
    );

    expect(html).toContain('Test Player');
    expect(html).toContain('CONTRACT');
    expect(html).toContain('THIS SEASON');
    expect(html).toContain('CAREER');
    expect(html).toContain('Shop Test Player');
    expect(html).toContain('ALT offers:');
    expect(html).toContain('Close');
    expect(html).not.toContain('GOD MODE');
  });
});
