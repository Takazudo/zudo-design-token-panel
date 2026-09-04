/**
 * Pure numeric transforms used by the bulk token action bar.
 *
 * Values are kept as a magnitude + unit pair so a transform never has to
 * guess whether a number belongs to `rem`, `px`, or is unitless. Parsing and
 * formatting deliberately use the same helpers as the token model's regular
 * numeric controls.
 */

import { formatValue } from '../tokens/manifest';
import { splitLengthValue } from './unit-cycle';

export interface NumericValue {
  magnitude: number;
  unit: string;
}

export type NumericTransform = (value: NumericValue) => NumericValue;

/** Parse a stored token value, retaining its actual suffix when present. */
export function parseNumericTransformValue(
  value: string,
  fallbackUnit = '',
): NumericValue | null {
  const parsed = splitLengthValue(value);
  if (parsed === null) return null;
  return {
    magnitude: parsed.magnitude,
    unit: parsed.suffix || fallbackUnit,
  };
}

/** Short aliases for callers that use the token-model helper naming. */
export const parseNumericValue = parseNumericTransformValue;

/** Format a transformed value using the canonical token-model formatter. */
export function formatNumericTransformValue(value: NumericValue): string {
  return formatValue(value.magnitude, value.unit);
}

export const formatNumericValue = formatNumericTransformValue;

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

export function multiply(value: NumericValue, factor: number): NumericValue;
export function multiply(factor: number, value: NumericValue): NumericValue;
export function multiply(factor: number): NumericTransform;
export function multiply(
  valueOrFactor: NumericValue | number,
  factorOrValue?: number | NumericValue,
): NumericValue | NumericTransform {
  if (typeof valueOrFactor === 'number') {
    if (typeof factorOrValue === 'object' && factorOrValue !== null) {
      return multiply(factorOrValue, valueOrFactor);
    }
    const multiplier = finiteOr(valueOrFactor, 1);
    return (value) => multiply(value, multiplier);
  }
  return {
    ...valueOrFactor,
    magnitude: valueOrFactor.magnitude * finiteOr(
      typeof factorOrValue === 'number' ? factorOrValue : 1,
      1,
    ),
  };
}

export function add(value: NumericValue, amount: number): NumericValue;
export function add(amount: number, value: NumericValue): NumericValue;
export function add(amount: number): NumericTransform;
export function add(
  valueOrAmount: NumericValue | number,
  amountOrValue?: number | NumericValue,
): NumericValue | NumericTransform {
  if (typeof valueOrAmount === 'number') {
    if (typeof amountOrValue === 'object' && amountOrValue !== null) {
      return add(amountOrValue, valueOrAmount);
    }
    const delta = finiteOr(valueOrAmount, 0);
    return (value) => add(value, delta);
  }
  return {
    ...valueOrAmount,
    magnitude: valueOrAmount.magnitude + finiteOr(
      typeof amountOrValue === 'number' ? amountOrValue : 0,
      0,
    ),
  };
}

export function roundToStep(value: NumericValue, step: number): NumericValue;
export function roundToStep(step: number, value: NumericValue): NumericValue;
export function roundToStep(step: number): NumericTransform;
export function roundToStep(
  valueOrStep: NumericValue | number,
  stepOrValue?: number | NumericValue,
): NumericValue | NumericTransform {
  if (typeof valueOrStep === 'number') {
    if (typeof stepOrValue === 'object' && stepOrValue !== null) {
      return roundToStep(stepOrValue, valueOrStep);
    }
    const roundingStep = valueOrStep;
    return (value) => roundToStep(value, roundingStep);
  }
  const roundingStep = typeof stepOrValue === 'number' ? stepOrValue : 0;
  if (!Number.isFinite(roundingStep) || roundingStep <= 0) return { ...valueOrStep };
  return {
    ...valueOrStep,
    magnitude: Math.round(valueOrStep.magnitude / roundingStep) * roundingStep,
  };
}

export function setTo(value: NumericValue, magnitude: number): NumericValue;
export function setTo(magnitude: number, value: NumericValue): NumericValue;
export function setTo(magnitude: number): NumericTransform;
export function setTo(
  valueOrMagnitude: NumericValue | number,
  magnitudeOrValue?: number | NumericValue,
): NumericValue | NumericTransform {
  if (typeof valueOrMagnitude === 'number') {
    if (typeof magnitudeOrValue === 'object' && magnitudeOrValue !== null) {
      return setTo(magnitudeOrValue, valueOrMagnitude);
    }
    const nextMagnitude = valueOrMagnitude;
    return (value) => setTo(value, nextMagnitude);
  }
  return {
    ...valueOrMagnitude,
    magnitude: finiteOr(
      typeof magnitudeOrValue === 'number' ? magnitudeOrValue : valueOrMagnitude.magnitude,
      valueOrMagnitude.magnitude,
    ),
  };
}
