import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { BloodlineFamily, BloodlineFamilyChild } from '../../app/store/game-store';
import { BloodlinesViewerView } from './BloodlinesViewer';

function makeChild(overrides: Partial<BloodlineFamilyChild> = {}): BloodlineFamilyChild {
  return {
    playerId: 'son-1',
    name: 'Trey Jr.',
    position: 'WR',
    ovr: 78,
    age: 22,
    teamId: 'team-other',
    source: 'roster',
    isUserPlayer: false,
    ...overrides,
  };
}

function makeFamily(overrides: Partial<BloodlineFamily> = {}): BloodlineFamily {
  return {
    parentPlayerId: 'parent-1',
    parentName: 'Trey Sr.',
    parentTeamId: 'team-home',
    parentPosition: 'WR',
    legacyTag: 'famous_name',
    children: [makeChild()],
    ...overrides,
  };
}

describe('BloodlinesViewerView', () => {
  it('renders the empty state when no families have entered the league', () => {
    const markup = renderToStaticMarkup(
      <BloodlinesViewerView families={[]} userTeamId="team-user" />,
    );

    expect(markup).toContain('BLOODLINES');
    expect(markup).toContain('No bloodlines have entered the league yet');
    expect(markup).toContain('0 families');
    expect(markup).toContain('0 sons');
  });

  it('renders one family card per parent with each son listed', () => {
    const families = [
      makeFamily({
        parentPlayerId: 'p1',
        parentName: 'Trey Sr.',
        children: [
          makeChild({ playerId: 'c1', name: 'Trey Jr.', ovr: 84, position: 'WR' }),
          makeChild({ playerId: 'c2', name: 'Trey III', ovr: 76, position: 'CB' }),
        ],
      }),
      makeFamily({
        parentPlayerId: 'p2',
        parentName: 'Mason Sr.',
        legacyTag: 'franchise_royalty',
        children: [
          makeChild({ playerId: 'c3', name: 'Mason Jr.', ovr: 88, position: 'QB' }),
        ],
      }),
    ];
    const markup = renderToStaticMarkup(
      <BloodlinesViewerView families={families} userTeamId="team-user" />,
    );

    expect(markup).toContain('Trey Sr.');
    expect(markup).toContain('Trey Jr.');
    expect(markup).toContain('Trey III');
    expect(markup).toContain('Mason Jr.');
    expect(markup).toContain('Famous Name');
    expect(markup).toContain('Franchise Royalty');
    expect(markup).toContain('2 sons');
    expect(markup).toContain('1 son');
    expect(markup).toContain('2 families');
    expect(markup).toContain('3 sons');
  });

  it('badges sons on the user roster with YOUR ROSTER and green border', () => {
    const families = [
      makeFamily({
        children: [
          makeChild({ playerId: 'mine', name: 'Trey Jr.', teamId: 'team-user', isUserPlayer: true }),
        ],
      }),
    ];
    const markup = renderToStaticMarkup(
      <BloodlinesViewerView families={families} userTeamId="team-user" />,
    );

    expect(markup).toContain('YOUR ROSTER');
    expect(markup).toContain('1 on your roster');
  });

  it('flags rookie-class sons with the ROOKIE CLASS badge', () => {
    const families = [
      makeFamily({
        children: [
          makeChild({ playerId: 'r1', name: 'Rookie Jr.', source: 'draft', teamId: null, age: 21, ovr: 72 }),
        ],
      }),
    ];
    const markup = renderToStaticMarkup(
      <BloodlinesViewerView families={families} userTeamId={null} />,
    );

    expect(markup).toContain('ROOKIE CLASS');
    expect(markup).toContain('Rookie Jr.');
  });

  it('labels bloodline rows as selector-derived active and draft sources without route writes', () => {
    const families = [
      makeFamily({
        children: [
          makeChild({ playerId: 'active-son', name: 'Active Jr.', teamId: 'team-user', isUserPlayer: true }),
          makeChild({ playerId: 'rookie-son', name: 'Rookie Jr.', source: 'draft', teamId: null }),
        ],
      }),
    ];

    const markup = renderToStaticMarkup(
      <BloodlinesViewerView families={families} userTeamId="team-user" />,
    );

    expect(markup).toContain('BLOODLINE SOURCES');
    expect(markup).toContain('selectBloodlineFamilies joins active game.players and current draft prospects');
    expect(markup).toContain('saved bloodline fields');
    expect(markup).toContain('rookie-class sons use scout grade as the OVR signal');
    expect(markup).toContain('this route does not assign bloodlines or write family relationship edges');
  });

  it('humanizes every legacy tag so no internal snake_case leaks', () => {
    const families: BloodlineFamily[] = [
      makeFamily({ parentPlayerId: 'a', legacyTag: 'franchise_royalty' }),
      makeFamily({ parentPlayerId: 'b', legacyTag: 'famous_name' }),
      makeFamily({ parentPlayerId: 'c', legacyTag: 'chip_on_shoulder' }),
      makeFamily({ parentPlayerId: 'd', legacyTag: 'late_bloomer_family' }),
    ];
    const markup = renderToStaticMarkup(
      <BloodlinesViewerView families={families} userTeamId={null} />,
    );

    expect(markup).toContain('Franchise Royalty');
    expect(markup).toContain('Famous Name');
    expect(markup).toContain('Chip On Shoulder');
    expect(markup).toContain('Late Bloomer Family');
    expect(markup).not.toContain('franchise_royalty<');
    expect(markup).not.toContain('chip_on_shoulder<');
  });

  it('exposes scope filter buttons for All / My Roster / Rookies', () => {
    const families = [
      makeFamily({
        children: [
          makeChild({ teamId: 'team-user', isUserPlayer: true }),
          makeChild({ playerId: 'rk', source: 'draft', teamId: null }),
        ],
      }),
    ];
    const markup = renderToStaticMarkup(
      <BloodlinesViewerView families={families} userTeamId="team-user" />,
    );

    expect(markup).toContain('bloodlines-scope-all');
    expect(markup).toContain('bloodlines-scope-user');
    expect(markup).toContain('bloodlines-scope-rookies');
    expect(markup).toContain('All (1)');
    expect(markup).toContain('My Roster (1)');
    expect(markup).toContain('Rookies (1)');
  });

  it('always offers a back-to-legacy navigation control', () => {
    const markup = renderToStaticMarkup(
      <BloodlinesViewerView families={[]} userTeamId={null} />,
    );

    expect(markup).toContain('Back to Legacy');
  });
});
