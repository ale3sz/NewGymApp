import { describe, it, expect } from 'vitest';
import {
  evaluateExerciseRank,
  computeSymmetryGlobalReport,
} from '../symmetryRankEngine';
import { evaluateLiveSetPR, evaluateSessionPRSummary } from '../prDetector';
import {
  estimateNavyBodyFatPct,
  runAnthropometricBodyScan,
} from '../aiBodyScanner';
import { EXERCISE_CATALOG } from '../../data/exerciseCatalog';
import { SavedSession } from '../../storage/storage';

describe('Symmetry Rank Engine, PR Detector & Body Scanner', () => {
  const benchEx =
    EXERCISE_CATALOG.find((e) => e.id === 'press_plano_barra') || EXERCISE_CATALOG[0];
  const squatEx =
    EXERCISE_CATALOG.find((e) => e.primaryMuscle === 'cuadriceps' && e.category === 'barra') ||
    EXERCISE_CATALOG[1];

  it('calculates relative strength ranks scaled by bodyweight and sex', () => {
    const profile75Male = {
      sex: 'masculino' as const,
      bodyweightKg: 75,
      heightCm: 175,
      updatedAt: new Date().toISOString(),
    };

    const beginner = evaluateExerciseRank(benchEx, 45, 0, profile75Male);
    const intermediate = evaluateExerciseRank(benchEx, 92, 0, profile75Male);
    const elite = evaluateExerciseRank(benchEx, 165, 0, profile75Male);

    expect(beginner.tier).toBe('iron');
    expect(['gold', 'ruby']).toContain(intermediate.tier);
    expect(elite.tier).toBe('symmetric');
    expect(elite.score).toBeGreaterThanOrEqual(960);
  });

  it('computes global symmetry index and identifies dominant vs lagging muscles', () => {
    const logs: SavedSession[] = [
      {
        id: 's1',
        date: '2026-11-10T12:00:00.000Z',
        dateKey: '2026-11-10',
        exerciseId: benchEx.id,
        sets: [{ setNumber: 1, weightKg: 100, repsCompleted: 8, rirLogged: 1 }],
      },
      {
        id: 's2',
        date: '2026-11-11T12:00:00.000Z',
        dateKey: '2026-11-11',
        exerciseId: squatEx.id,
        sets: [{ setNumber: 1, weightKg: 60, repsCompleted: 6, rirLogged: 2 }],
      },
    ];

    const report = computeSymmetryGlobalReport(logs, {
      sex: 'masculino',
      bodyweightKg: 75,
      heightCm: 178,
      updatedAt: new Date().toISOString(),
    });

    expect(report.overallTier).not.toBe('unranked');
    expect(report.symmetryIndex).toBeGreaterThan(0);
    expect(report.dominantMuscles[0].muscle).toBe('pecho');
    expect(report.laggingMuscles.length).toBeGreaterThan(0);
  });

  it('detects live Personal Records and Rank-Ups while ignoring warm-ups', () => {
    const priorLogs: SavedSession[] = [
      {
        id: 'hist_1',
        date: '2026-10-01T10:00:00.000Z',
        dateKey: '2026-10-01',
        exerciseId: benchEx.id,
        sets: [{ setNumber: 1, weightKg: 80, repsCompleted: 6, rirLogged: 1 }],
      },
    ];

    const warmupPR = evaluateLiveSetPR(
      benchEx,
      { setNumber: 1, weightKg: 100, repsCompleted: 5, rirLogged: 2, isWarmup: true },
      [],
      priorLogs
    );
    expect(warmupPR).toBeNull();

    const realPR = evaluateLiveSetPR(
      benchEx,
      { setNumber: 2, weightKg: 95, repsCompleted: 8, rirLogged: 1 },
      [],
      priorLogs
    );
    expect(realPR).not.toBeNull();
    expect(['RANK_UP', 'WEIGHT_PR', 'E1RM_PR']).toContain(realPR?.type);

    const summary = evaluateSessionPRSummary(
      {
        [benchEx.id]: [{ setNumber: 1, weightKg: 85, repsCompleted: 6, rirLogged: 1 }],
      },
      priorLogs,
      '2026-11-27',
      [benchEx]
    );
    expect(summary.length).toBe(1);
  });

  it('estimates Navy body fat and runs offline anthropometric scan', () => {
    const bf = estimateNavyBodyFatPct('masculino', 178, 82, 40);
    expect(bf).not.toBeNull();
    expect(bf!).toBeGreaterThan(8);
    expect(bf!).toBeLessThan(25);

    const emptySymmetry = computeSymmetryGlobalReport([]);
    const scan = runAnthropometricBodyScan(
      { sex: 'masculino', bodyweightKg: 78, heightCm: 178, updatedAt: '' },
      {
        id: 'm1',
        date: '',
        dateKey: '2026-11-27',
        bodyweightKg: 78,
        shouldersCm: 124,
        waistCm: 78,
        armCm: 39,
        calfCm: 35,
      },
      emptySymmetry
    );

    expect(scan.goldenRatioScore).toBeCloseTo(1.59, 1);
    expect(scan.laggingMuscles).toContain('pantorrillas');
  });
});
