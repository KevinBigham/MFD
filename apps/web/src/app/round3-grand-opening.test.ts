import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';

describe('Round 3 — Grand Opening', () => {
  describe('Dynasty Era Prompt', () => {
    const content = readFileSync(
      new URL('../features/dynasty-era/DynastyEraPrompt.tsx', import.meta.url).href.replace('file://', ''),
      'utf-8',
    );

    it('imports generateEraSuggestions from engine', () => {
      expect(content).toContain('generateEraSuggestions');
    });

    it('renders suggestion buttons and custom name input', () => {
      expect(content).toContain('Suggestions');
      expect(content).toContain('OR NAME IT YOURSELF');
      expect(content).toContain('Name This Era');
    });

    it('calls nameDynastyEra store action on confirm', () => {
      expect(content).toContain('nameDynastyEra');
    });

    it('shows selected era name with badge', () => {
      expect(content).toContain("variant=\"gold\">ERA");
    });
  });

  describe('Alumni Mentors Screen', () => {
    const content = readFileSync(
      new URL('../features/mentors/AlumniMentorsScreen.tsx', import.meta.url).href.replace('file://', ''),
      'utf-8',
    );

    it('imports mentor engine functions', () => {
      expect(content).toContain('getAvailableMentors');
      expect(content).toContain('calculateMentorEffects');
    });

    it('renders active mentors and available alumni sections', () => {
      expect(content).toContain('Active Mentors');
      expect(content).toContain('Available Alumni');
      expect(content).toContain('Mentoring Effects');
    });

    it('has hire and fire buttons', () => {
      expect(content).toContain('Hire Mentor');
      expect(content).toContain('Release');
    });

    it('shows mentor rating as stars', () => {
      expect(content).toContain('ratingStars');
    });

    it('displays mentor budget', () => {
      expect(content).toContain('Budget Remaining');
      expect(content).toContain('mentorBudget');
    });
  });

  describe('App.tsx Round 3 wiring', () => {
    const content = readFileSync(new URL('./App.tsx', import.meta.url), 'utf-8');

    it('imports DynastyEraPrompt', () => {
      expect(content).toContain("from '../features/dynasty-era/DynastyEraPrompt'");
    });

    it('imports shouldPromptEraNaming and shouldShowSaveReminder', () => {
      expect(content).toContain('shouldPromptEraNaming');
      expect(content).toContain('shouldShowSaveReminder');
    });

    it('renders DynastyEraPrompt modal', () => {
      expect(content).toContain('<DynastyEraPrompt');
      expect(content).toContain('showEraPrompt');
    });

    it('renders save reminder ConfirmDialog', () => {
      expect(content).toContain('Save Reminder');
      expect(content).toContain('showSaveReminder');
      expect(content).toContain('Open Backup Screen');
    });

    it('has mentors route and nav item', () => {
      expect(content).toContain("path: '/mentors'");
      expect(content).toContain('mentorsRoute');
      expect(content).toContain('LazyAlumniMentors');
    });
  });

  describe('Game store Round 3 actions', () => {
    const content = readFileSync(
      new URL('./store/game-store.ts', import.meta.url),
      'utf-8',
    );

    it('has nameDynastyEra action', () => {
      expect(content).toContain('nameDynastyEra');
      expect(content).toContain('startDynastyEraEngine');
    });

    it('has hireMentor and fireMentor actions', () => {
      expect(content).toContain('hireMentor');
      expect(content).toContain('fireMentor');
      expect(content).toContain('hireMentorEngine');
      expect(content).toContain('fireMentorEngine');
    });

    it('has setCallYourShot action', () => {
      expect(content).toContain('setCallYourShot');
      expect(content).toContain('activeCallYourShot');
    });

    it('has recordPortableExport action', () => {
      expect(content).toContain('recordPortableExport');
      expect(content).toContain('lastPortableExportYear');
    });
  });
});
