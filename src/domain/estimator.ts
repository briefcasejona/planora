import type { FeedbackRecord, Message, TaskType } from './types';
import { roundTo5 } from './time';

/**
 * Shrinkage constant: with n samples the learned log-ratio is divided by (n + K),
 * so one or two outliers barely move the estimate and many samples converge to
 * the user's true bias.
 */
const K = 2;

export type EstimateBasis = 'subject' | 'type' | 'all' | 'none';

export interface EstimateSuggestion {
  suggestedMin: number;
  factor: number;
  basis: EstimateBasis;
  sampleSize: number;
  explanation: Message;
}

export interface EstimateInput {
  type: TaskType;
  subject?: string;
  userEstimateMin: number;
}

function sameSubject(a?: string, b?: string): boolean {
  return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Comparable feedback records, most specific group first. */
export function comparableFeedback(
  input: Pick<EstimateInput, 'type' | 'subject'>,
  feedback: FeedbackRecord[],
): { basis: EstimateBasis; records: FeedbackRecord[] } {
  const valid = feedback.filter((f) => f.actualMin > 0 && f.userEstimateMin > 0);
  const bySubject = valid.filter((f) => f.taskType === input.type && sameSubject(f.subject, input.subject));
  if (bySubject.length >= 2) return { basis: 'subject', records: bySubject };
  const byType = valid.filter((f) => f.taskType === input.type);
  if (byType.length >= 2) return { basis: 'type', records: byType };
  if (valid.length >= 3) return { basis: 'all', records: valid };
  return { basis: 'none', records: [] };
}

export function correctionFactor(records: FeedbackRecord[]): number {
  if (records.length === 0) return 1;
  const sum = records.reduce((acc, f) => acc + Math.log(f.actualMin / f.userEstimateMin), 0);
  const factor = Math.exp(sum / (records.length + K));
  return Math.min(4, Math.max(0.25, factor));
}

export function suggestEstimate(input: EstimateInput, feedback: FeedbackRecord[]): EstimateSuggestion {
  const { basis, records } = comparableFeedback(input, feedback);
  const factor = correctionFactor(records);
  const suggestedMin = roundTo5(input.userEstimateMin * factor);
  const pct = Math.round(Math.abs(factor - 1) * 100);
  let explanation: Message;
  if (basis === 'none') {
    explanation = { key: 'estimate.noData' };
  } else if (pct < 5) {
    explanation = { key: 'estimate.accurate', params: { n: records.length } };
  } else {
    explanation = {
      key: factor > 1 ? 'estimate.under' : 'estimate.over',
      params: { n: records.length, pct, basis },
    };
  }
  return { suggestedMin, factor, basis, sampleSize: records.length, explanation };
}

/**
 * How many separate sessions this kind of task should get. Starts from a
 * sensible default and nudges it with the "more / fewer sessions" feedback.
 */
export function suggestSessionCount(
  input: Pick<EstimateInput, 'type' | 'subject'>,
  totalMin: number,
  maxBlockMin: number,
  feedback: FeedbackRecord[],
): number {
  const minNeeded = Math.max(1, Math.ceil(totalMin / maxBlockMin));
  const base = input.type === 'test' ? Math.max(3, Math.ceil(totalMin / 60)) : minNeeded;
  const { records } = comparableFeedback(input, feedback);
  if (records.length === 0) return Math.max(base, minNeeded);
  const learned =
    records.reduce((acc, f) => {
      const delta = f.sessionsNeeded === 'more' ? 1 : f.sessionsNeeded === 'fewer' ? -1 : 0;
      return acc + Math.max(1, f.plannedSessions + delta);
    }, 0) / records.length;
  // Blend learned count with the base, weighted by evidence.
  const w = records.length / (records.length + K);
  return Math.max(minNeeded, Math.round(w * learned + (1 - w) * base));
}
