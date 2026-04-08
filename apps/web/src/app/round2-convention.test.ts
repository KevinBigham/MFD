// @ts-nocheck — test-only file, vitest provides node APIs
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';

describe('Round 2 — Convention Stage Showroom', () => {
  describe('NewGameScreen convention demo', () => {
    const content = readFileSync(new URL('./NewGameScreen.tsx', import.meta.url), 'utf-8');

    it('imports generateConventionSave from engine', () => {
      expect(content).toContain('generateConventionSave');
      expect(content).toContain('CONVENTION_SAVE_METADATA');
    });

    it('has handleConventionDemo function', () => {
      expect(content).toContain('handleConventionDemo');
    });

    it('renders Convention Demo panel with launch button', () => {
      expect(content).toContain('Convention Demo');
      expect(content).toContain('Launch Demo Scenario');
    });

    it('shows convention metadata headline', () => {
      expect(content).toContain('CONVENTION_SAVE_METADATA.headline');
    });
  });

  describe('App.tsx undo and milestone wiring', () => {
    const content = readFileSync(new URL('./App.tsx', import.meta.url), 'utf-8');

    it('imports selectCanUndo and selectUndoLabel', () => {
      expect(content).toContain('selectCanUndo');
      expect(content).toContain('selectUndoLabel');
    });

    it('renders UndoButton component in nav', () => {
      expect(content).toContain('<UndoButton');
      expect(content).toContain('function UndoButton');
    });

    it('imports and renders MilestoneCard', () => {
      expect(content).toContain("from '../features/shared/MilestoneCard'");
      expect(content).toContain('<MilestoneCard');
    });

    it('imports and renders BreakingNews', () => {
      expect(content).toContain("from '../features/shared/BreakingNews'");
      expect(content).toContain('<BreakingNews');
    });

    it('has milestone detection effect for first win', () => {
      expect(content).toContain('first_win');
      expect(content).toContain('First Victory');
    });

    it('has milestone detection for 100 wins', () => {
      expect(content).toContain('win_100');
      expect(content).toContain('100 Wins');
    });
  });

  describe('Settings audio controls', () => {
    const content = readFileSync(
      new URL('../features/settings/Settings.tsx', import.meta.url).href.replace('file://', ''),
      'utf-8',
    );

    it('imports useAudio hook', () => {
      expect(content).toContain("import { useAudio } from '../audio/AudioManager'");
    });

    it('renders Audio panel with mute button', () => {
      expect(content).toContain("title=\"Audio\"");
      expect(content).toContain('Mute Audio');
      expect(content).toContain('Unmute Audio');
    });

    it('renders volume slider', () => {
      expect(content).toContain('type="range"');
      expect(content).toContain('audio.setVolume');
    });

    it('has test sound button', () => {
      expect(content).toContain('Test Sound');
      expect(content).toContain("audio.play('notification')");
    });
  });

  describe('GamePlanSetup call-your-shot', () => {
    const content = readFileSync(
      new URL('../features/game-plan/GamePlanSetup.tsx', import.meta.url).href.replace('file://', ''),
      'utf-8',
    );

    it('imports call-your-shot engine functions', () => {
      expect(content).toContain('isCallYourShotEligible');
      expect(content).toContain('getDeclarations');
    });

    it('renders Call Your Shot panel when eligible', () => {
      expect(content).toContain('Call Your Shot');
      expect(content).toContain('shotEligibility.eligible');
    });

    it('tracks shot declaration state', () => {
      expect(content).toContain('shotDeclaration');
      expect(content).toContain('setShotDeclaration');
    });

    it('shows SHOT CALLED badge when declaration selected', () => {
      expect(content).toContain('SHOT CALLED');
    });
  });

  describe('TradeCenter confirm dialog', () => {
    const content = readFileSync(
      new URL('../features/trades/TradeCenter.tsx', import.meta.url).href.replace('file://', ''),
      'utf-8',
    );

    it('imports ConfirmDialog', () => {
      expect(content).toContain("import { ConfirmDialog } from '../shared/ConfirmDialog'");
    });

    it('has confirmTradeId state', () => {
      expect(content).toContain('confirmTradeId');
      expect(content).toContain('setConfirmTradeId');
    });

    it('renders ConfirmDialog for trade acceptance', () => {
      expect(content).toContain('title="Accept Trade"');
      expect(content).toContain('Accept Trade');
    });
  });
});
