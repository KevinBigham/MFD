import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

var src = readFileSync(resolve(__dirname, '../mr-football-v100.jsx'), 'utf8');

describe('onboarding wizard', () => {
  it('wizard screen exists in monolith', () => {
    expect(src).toContain('screen==="wizard"');
  });

  it('wizard state variables are declared', () => {
    expect(src).toContain('wizardStep');
    expect(src).toContain('wizardTeamIdx');
    expect(src).toContain('wizardStyle');
    expect(src).toContain('wizardTipIdx');
  });

  it('PRESS START routes to wizard screen', () => {
    expect(src).toContain('setScreen("wizard")');
  });

  it('wizard has all 3 style cards (easy, normal, hard)', () => {
    expect(src).toContain('"easy"');
    expect(src).toContain('"normal"');
    expect(src).toContain('"hard"');
  });

  it('wizard maps easy to rookie difficulty', () => {
    expect(src).toContain('diff:"rookie"');
  });

  it('wizard maps normal to pro difficulty', () => {
    expect(src).toContain('diff:"pro"');
  });

  it('wizard maps hard to allpro difficulty', () => {
    expect(src).toContain('diff:"allpro"');
  });

  it('wizard has legend mode option', () => {
    expect(src).toContain('diff:"legend"');
    expect(src).toContain('draftMode:"auction"');
  });

  it('wizard has 5 tip cards', () => {
    // WIZARD_TIPS array should have 5 entries
    expect(src).toContain('Sim weeks to advance');
    expect(src).toContain('Trade to build your roster');
    expect(src).toContain('Keep your owner happy');
    expect(src).toContain('Find anything fast');
    expect(src).toContain('Have fun!');
  });

  it('wizard calls existing league init functions', () => {
    expect(src).toContain('createLeague(idx,true)');
    expect(src).toContain('initExpAuctionDraft(idx,');
    expect(src).toContain('initExpSnakeDraft(idx,');
  });

  it('wizard uses Stepper component', () => {
    expect(src).toContain('Stepper,{steps:[{label:"Team"},{label:"Style"},{label:"Tips"}]');
  });

  it('wizard has back navigation on every step', () => {
    // Count occurrences of back buttons in wizard
    var wizSection = src.substring(src.indexOf('ONBOARDING WIZARD'), src.indexOf('if(screen==="pick")'));
    var backCount = (wizSection.match(/arrow-left/g) || []).length;
    expect(backCount).toBeGreaterThanOrEqual(3);
  });

  it('wizard has Advanced Options link to old draftMode screen', () => {
    expect(src).toContain('Advanced Options');
    expect(src).toContain('openDraftModeForTeam(wizardTeamIdx)');
  });

  it('wizard is included in audio hook', () => {
    expect(src).toContain('screen==="wizard"');
  });

  it('Start Dynasty button calls launchWizard', () => {
    expect(src).toContain('onClick={launchWizard}');
    expect(src).toContain('Start Dynasty');
  });

  it('old pick screen still exists as fallback', () => {
    expect(src).toContain('screen==="pick"');
    expect(src).toContain('Choose Your');
  });
});
