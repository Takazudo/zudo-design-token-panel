import type { RowContribution } from '../tabs/flat/types';
import { matchesSearchFields } from './token-search';

/**
 * S3 contribution used by every flat token tab. FlatTab still owns rendering
 * and section omission; this contribution only supplies the query predicate.
 */
export function tokenSearchContribution(query: string): RowContribution {
  return {
    id: 'search-filter',
    filter: (entry) => matchesSearchFields({
      cssVar: entry.item.cssVar,
      id: entry.item.id,
      label: entry.item.label,
      value: entry.value,
      tierLabel: entry.tier.label,
    }, query),
  };
}

export const createTokenSearchContribution = tokenSearchContribution;
