import { memo } from 'preact/compat';
import { useTooltip } from './tooltip';

export interface TokenLabelProps {
  cssVar: string;
  label?: string;
  className?: string;
}

/**
 * Renders a token-name label with the shared rich tooltip.
 * Replaces bare `<span title={cssVar}>` usages across all tabs so every
 * token-name display site uses the same `.tokenpanel-tooltip` primitive.
 *
 * The optional `label` sub-label is shown only when it differs from `cssVar`
 * (avoids redundant repetition for tokens whose label IS the cssVar).
 */
function TokenLabelInner({ cssVar, label, className }: TokenLabelProps) {
  const tooltipProps = useTooltip(cssVar);
  return (
    <span className={className ?? 'tokenpanel-row-label'} {...tooltipProps}>
      {cssVar}
      {label && label !== cssVar && (
        <span className="tokenpanel-row-label-sub">{label}</span>
      )}
    </span>
  );
}

export const TokenLabel = memo(TokenLabelInner);
export default TokenLabel;
