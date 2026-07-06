import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CLINIC_TRACKS, type PositionCoachStaff } from '@mfd/engine';
import {
  ClinicRunReceiptPanel,
  CoachingStaff,
  PositionCoachLifecycleReceiptPanel,
  SkillActivationReceiptPanel,
  buildClinicRunReceipt,
  buildPositionCoachLifecycleReceipt,
  buildSkillActivationReceipt,
} from './CoachingStaff';

const mockState = {
  coachingStaff: {
    hc: {
      id: 'hc-1',
      name: 'Marcus Reed',
      role: 'HC',
      archetype: 'Strategist',
      traits: [],
      ratings: { gameplan: 84, development: 79, motivation: 76, strategy: 82 },
      level: 5,
      term: 4,
      buyoutPenalty: 3,
      loyalty: 7,
      ambition: 4,
      schemeLean: { offense: 'spread', defense: 'cover_3' },
    },
    oc: null,
    dc: null,
  },
  clinic: {
    xp: { offense: 40, defense: 20 },
    perks: ['off1'],
  },
  coachingMarket: {
    hotSeat: false,
    candidates: {
      HC: [
        {
          id: 'cand-1',
          name: 'Victor Bishop',
          role: 'HC',
          desiredRole: 'HC',
          archetype: 'strategist',
          traits: [],
          ratings: { gameplan: 88, development: 82, motivation: 77, strategy: 85 },
          level: 5,
          fitScore: 89,
          continuityTag: 'ideal',
          reasoning: ['Victor Bishop grades 89/100 for Chicago.'],
          term: 4,
          buyoutPenalty: 3,
          loyalty: 7,
          ambition: 5,
          schemeLean: { offense: 'spread', defense: 'cover_3' },
        },
      ],
      OC: [],
      DC: [],
    },
  },
  userTeam: {
    id: 'team-1',
    city: 'Chicago',
    name: 'Blaze',
    wins: 9,
    losses: 3,
    ties: 0,
    schemeOff: 'spread',
    offScheme: 'spread',
    schemeDef: 'cover_3',
    defScheme: 'cover_3',
    roster: [
      { id: 'qb-1', name: 'Jay Stone', pos: 'QB', ovr: 86, isStarter: true, ratings: { awareness: 85 }, personality: { workEthic: 7, loyalty: 6, greed: 4, pressure: 7, ambition: 6 }, systemFit: 72 },
      { id: 'wr-1', name: 'Keenan Ward', pos: 'WR', ovr: 84, isStarter: true, ratings: { routeRunning: 85 }, personality: { workEthic: 7, loyalty: 6, greed: 4, pressure: 7, ambition: 6 }, systemFit: 70 },
      { id: 'cb-1', name: 'Ace Bolt', pos: 'CB', ovr: 82, isStarter: true, ratings: { zoneCoverage: 83 }, personality: { workEthic: 7, loyalty: 6, greed: 4, pressure: 7, ambition: 6 }, systemFit: 68 },
      { id: 'lb-1', name: 'Rex Dunn', pos: 'LB', ovr: 80, isStarter: true, ratings: { tackle: 82 }, personality: { workEthic: 7, loyalty: 6, greed: 4, pressure: 7, ambition: 6 }, systemFit: 67 },
    ],
    staff: {
      hc: {
        id: 'hc-1',
        name: 'Marcus Reed',
        role: 'HC',
        archetype: 'Strategist',
        traits: [],
        ratings: { gameplan: 84, development: 79, motivation: 76, strategy: 82 },
        level: 5,
        term: 4,
        buyoutPenalty: 3,
        loyalty: 7,
        ambition: 4,
        schemeLean: { offense: 'spread', defense: 'cover_3' },
      },
      oc: null,
      dc: null,
    },
    clinic: {
      xp: { offense: 40, defense: 20 },
      perks: ['off1'],
    },
    skillSelections: {},
    positionCoaches: {
      coaches: [
        {
          id: 'pc-ol-1',
          name: 'Paul Turner',
          role: 'OL',
          specialty: 'pass_blocking',
          quality: 9,
          yearsWithTeam: 2,
        },
        {
          id: 'pc-dl-1',
          name: 'Rick Hayes',
          role: 'DL',
          specialty: 'run_defense',
          quality: 2,
          yearsWithTeam: 0,
        },
      ],
    } satisfies PositionCoachStaff,
  },
  actions: {
    addClinicXP: () => Promise.resolve(),
    applyTeamSchemeChange: () => Promise.resolve(),
    fireStaff: () => Promise.resolve(),
    hireStaff: () => Promise.resolve(),
    initializePositionCoachesForTeam: () => Promise.resolve(null),
    promoteStaff: () => Promise.resolve(),
    refreshCoachingMarket: () => Promise.resolve(),
    setHeadCoachSkillSelection: () => Promise.resolve(),
    upgradePositionCoachRole: () => Promise.resolve(null),
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectCoachingStaff: (state: typeof mockState) => state.coachingStaff,
  selectClinic: (state: typeof mockState) => state.clinic,
  selectCoachingMarket: (state: typeof mockState) => state.coachingMarket,
  selectUserTeam: (state: typeof mockState) => state.userTeam,
}));

describe('CoachingStaff', () => {
  it('renders the coaching hub with market and development controls', () => {
    const markup = renderToStaticMarkup(<CoachingStaff />);

    expect(markup).toContain('COACHING');
    expect(markup).toContain('Refresh Market');
    expect(markup).toContain('Victor Bishop');
    expect(markup).toContain('STAFF MARKET');
    expect(markup).toContain('SCHEME LAB');
    expect(markup).toContain('DEVELOPMENT');
    expect(markup).toContain('Profile Tape');
    expect(markup).toContain('creating leverage. We got the leverage we wanted tonight.');
    expect(markup).toContain('COACHING COMMAND CENTER');
    expect(markup).toContain('mirrors your current HC, OC, and DC seats');
    expect(markup).toContain('Refresh Market reshuffles the list');
    expect(markup).toContain('Position rooms can be initialized or upgraded one role at a time');
    expect(markup).toContain('Tenure advances at season rollover');
    expect(markup).toContain('Opening Coaching is a review state');
    expect(markup).toContain('COACHING DECISION RECEIPT');
    expect(markup).toContain('Staff slots');
    expect(markup).toContain('2 open');
    expect(markup).toContain('Victor Bishop is the top visible Head coach option');
    expect(markup).toContain('Poach 5');
    expect(markup).toContain('Run Clinic and Activate tier buttons remain the only coaching-development commits here');
    expect(markup).toContain('Run Clinic and Activate tier are the development commits');
    expect(markup).toContain('POSITION COACH REPORT');
    expect(markup).toContain('2/7 roles');
    expect(markup).toContain('Manual changes');
    expect(markup).toContain('Strengths: OL (Paul Turner, pass_blocking)');
    expect(markup).toContain('Weaknesses: DL (Rick Hayes)');
    expect(markup).toContain('Upgrade OL');
    expect(markup).toContain('Upgrade DL');
    expect(markup).toContain('summarizes the current position-room staff');
    expect(markup).toContain('Initialize and Upgrade are the only buttons that change this room');
    expect(markup).toContain('tenure advances at season rollover');
    expect(markup).toContain('Opening this panel does not seed coaches');
    expect(markup.match(/<button[^>]*>Refresh Market<\/button>/g) ?? []).toHaveLength(1);
  });

  it('builds a clinic run receipt from saved clinic before and action result after', () => {
    const offenseTrack = CLINIC_TRACKS.find((track) => track.id === 'offense');
    expect(offenseTrack).toBeDefined();

    const receipt = buildClinicRunReceipt(
      offenseTrack!,
      { xp: { offense: 25 }, perks: [] },
      { xp: { offense: 35 }, perks: ['off1'] },
      10,
    );

    expect(receipt.trackLabel).toBe('Offensive Mind');
    expect(receipt.beforeXp).toBe(25);
    expect(receipt.afterXp).toBe(35);
    expect(receipt.amount).toBe(10);
    expect(receipt.unlockedPerks).toEqual(['Play Variety']);
    expect(receipt.source).toContain('this confirmation appears here only');
  });

  it('renders a route-local clinic run receipt with XP and unlock details', () => {
    const markup = renderToStaticMarkup(
      <ClinicRunReceiptPanel
        receipt={{
          trackLabel: 'Offensive Mind',
          beforeXp: 25,
          afterXp: 35,
          amount: 10,
          unlockedPerks: ['Play Variety'],
          source: 'Run Clinic calls actions.addClinicXP, which clones and commits saved team.clinic; this confirmation appears here only.',
        }}
      />,
    );

    expect(markup).toContain('CLINIC RUN RECEIPT');
    expect(markup).toContain('Offensive Mind');
    expect(markup).toContain('+10 XP');
    expect(markup).toContain('On-screen confirmation');
    expect(markup).toContain('Track XP moved from 25 to 35.');
    expect(markup).toContain('Unlocked Play Variety.');
    expect(markup).toContain('this confirmation appears here only');
  });

  it('builds a skill activation receipt from the active coach and selected branch', () => {
    const receipt = buildSkillActivationReceipt({
      coachName: 'Marcus Reed',
      branch: {
        id: 'air_raid',
        name: 'Air Raid',
        icon: 'plane',
        tiers: [
          { level: 3, label: 'Quick Release', bonus: { passMod: 2 }, desc: '+2% pass efficiency' },
          { level: 6, label: 'Spread Master', bonus: { passMod: 3 }, desc: '+3% pass efficiency' },
        ],
      },
      tier: 2,
      previousSelection: { branch: 'ground_pound', tier: 1 },
    });

    expect(receipt.coachName).toBe('Marcus Reed');
    expect(receipt.branchName).toBe('Air Raid');
    expect(receipt.tier).toBe(2);
    expect(receipt.tierLabel).toBe('Spread Master');
    expect(receipt.previousSelection).toBe('ground_pound T1');
    expect(receipt.source).toContain('team.skillSelections');
    expect(receipt.source).toContain('this confirmation appears here only');
  });

  it('renders a route-local skill activation receipt with previous selection context', () => {
    const markup = renderToStaticMarkup(
      <SkillActivationReceiptPanel
        receipt={{
          coachName: 'Marcus Reed',
          branchName: 'Air Raid',
          tier: 2,
          tierLabel: 'Spread Master',
          previousSelection: 'ground_pound T1',
          source: 'Activate tier calls actions.setHeadCoachSkillSelection, which clones and commits saved team.skillSelections for the current head coach; this confirmation appears here only.',
        }}
      />,
    );

    expect(markup).toContain('SKILL ACTIVATION RECEIPT');
    expect(markup).toContain('Air Raid');
    expect(markup).toContain('T2');
    expect(markup).toContain('On-screen confirmation');
    expect(markup).toContain('Marcus Reed activated Spread Master.');
    expect(markup).toContain('Previous selection: ground_pound T1.');
    expect(markup).toContain('this confirmation appears here only');
  });

  it('builds a position coach initialization receipt from saved staff before and after', () => {
    const afterStaff = mockState.userTeam.positionCoaches;
    const receipt = buildPositionCoachLifecycleReceipt({
      action: 'initialize',
      beforeStaff: undefined,
      afterStaff,
    });

    expect(receipt).toMatchObject({
      id: 'position-coach:init',
      actionLabel: 'Initialized',
      roleLabel: 'All rooms',
      beforeLabel: 'No staff',
      afterLabel: '2/7 roles',
    });
    expect(receipt.detail).toContain('Seeded OL, DL rooms');
    expect(receipt.source).toContain('Position-coach setup was confirmed by the staff office');

    const markup = renderToStaticMarkup(<PositionCoachLifecycleReceiptPanel receipt={receipt} />);
    expect(markup).toContain('POSITION COACH RECEIPT');
    expect(markup).toContain('Room staff updated');
    expect(markup).toContain('does not run progression');
    expect(markup).toContain('change staff outcomes outside the confirmed action');
  });

  it('builds a position coach upgrade receipt with before and after role context', () => {
    const beforeStaff = mockState.userTeam.positionCoaches;
    const afterStaff: PositionCoachStaff = {
      coaches: beforeStaff.coaches.map((coach) => coach.role === 'DL'
        ? { ...coach, id: 'pc-dl-2', name: 'Dana Knox', quality: 6, specialty: 'pass_rush' }
        : coach),
    };
    const receipt = buildPositionCoachLifecycleReceipt({
      action: 'upgrade',
      role: 'DL',
      beforeStaff,
      afterStaff,
    });

    expect(receipt).toMatchObject({
      id: 'position-coach:upgrade:DL',
      actionLabel: 'Upgraded',
      roleLabel: 'DL',
    });
    expect(receipt.beforeLabel).toContain('Rick Hayes // DL // Q2 // run_defense');
    expect(receipt.afterLabel).toContain('Dana Knox // DL // Q6 // pass_rush');
    expect(receipt.detail).toContain('DL room now has Dana Knox');
  });
});
