import { describe, expect, it } from 'vitest';

import { GM_REP_986 } from '../src/systems/gm-reputation.js';

describe('gm-reputation.js', () => {
  describe('calculate', () => {
    it('returns neutral defaults when txLog is null', () => {
      expect(GM_REP_986.calculate(null, null)).toEqual({
        fairDealer: 50,
        aggressive: 50,
        loyalty: 50,
        overall: 50,
      });
    });

    it('uses base formulas for empty transaction log arrays', () => {
      expect(GM_REP_986.calculate([], null)).toEqual({
        fairDealer: 50,
        aggressive: 30,
        loyalty: 50,
        overall: 43,
      });
    });

    it('increases scores based on trade and signing counts', () => {
      const txLog = [
        { type: 'TRADE' },
        { type: 'TRADE' },
        { type: 'SIGN_FA' },
        { type: 'SIGN_FA' },
        { type: 'SIGN_FA' },
      ];

      const rep = GM_REP_986.calculate(txLog, null);
      expect(rep.fairDealer).toBe(54);
      expect(rep.aggressive).toBe(39);
      expect(rep.loyalty).toBe(50);
      expect(rep.overall).toBe(48);
    });

    it('caps fairDealer and aggressive at 100', () => {
      const txLog = [
        ...Array.from({ length: 60 }, () => ({ type: 'TRADE' })),
        ...Array.from({ length: 30 }, () => ({ type: 'SIGN_FA' })),
      ];

      const rep = GM_REP_986.calculate(txLog, null);
      expect(rep.fairDealer).toBe(100);
      expect(rep.aggressive).toBe(100);
    });

    it('uses average gmTrustByTeam as loyalty when available', () => {
      const txLog = [{ type: 'TRADE' }];
      const tradeState = { gmTrustByTeam: { BUF: 20, MIA: 50, NYG: 80 } };
      const rep = GM_REP_986.calculate(txLog, tradeState);
      expect(rep.loyalty).toBe(50);
    });

    it('keeps default loyalty when trust map is empty', () => {
      const txLog = [{ type: 'TRADE' }];
      const tradeState = { gmTrustByTeam: {} };
      const rep = GM_REP_986.calculate(txLog, tradeState);
      expect(rep.loyalty).toBe(50);
    });
  });

  describe('getLabel', () => {
    it('maps 85+ to Elite GM', () => {
      expect(GM_REP_986.getLabel(85).label).toBe('Elite GM');
    });

    it('maps 70-84 to Respected', () => {
      expect(GM_REP_986.getLabel(70).label).toBe('Respected');
      expect(GM_REP_986.getLabel(84).label).toBe('Respected');
    });

    it('maps 50-69 to Average', () => {
      expect(GM_REP_986.getLabel(50).label).toBe('Average');
      expect(GM_REP_986.getLabel(69).label).toBe('Average');
    });

    it('maps 30-49 to Questionable', () => {
      expect(GM_REP_986.getLabel(30).label).toBe('Questionable');
      expect(GM_REP_986.getLabel(49).label).toBe('Questionable');
    });

    it('maps below 30 to Untrusted', () => {
      expect(GM_REP_986.getLabel(29).label).toBe('Untrusted');
      expect(GM_REP_986.getLabel(0).label).toBe('Untrusted');
    });

    it('returns consistent label metadata shape', () => {
      const label = GM_REP_986.getLabel(72);
      expect(label).toHaveProperty('label');
      expect(label).toHaveProperty('icon');
      expect(label).toHaveProperty('color');
      expect(typeof label.icon).toBe('string');
    });
  });
});
