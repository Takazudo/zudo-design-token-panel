import type { TokenAddress } from './types';
import { tokenAddressKey } from './types';

export const TOKEN_ROW_FLASH_CLASS = 'tokenpanel-row--flash';

export function scrollToTokenRow(root: ParentNode, address: TokenAddress): HTMLElement | null {
  const key = tokenAddressKey(address);
  const row = Array.from(root.querySelectorAll<HTMLElement>('[data-address]')).find(
    (candidate) => candidate.dataset.address === key,
  );
  if (!row) return null;

  row.scrollIntoView({ block: 'nearest' });
  row.classList.remove(TOKEN_ROW_FLASH_CLASS);
  // Restart the animation when command-palette selection targets the same row twice.
  void row.offsetWidth;
  row.classList.add(TOKEN_ROW_FLASH_CLASS);
  row.addEventListener('animationend', () => row.classList.remove(TOKEN_ROW_FLASH_CLASS), {
    once: true,
  });
  return row;
}
