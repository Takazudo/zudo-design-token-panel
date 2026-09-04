import { Fragment } from 'preact';
import { useShellRegions } from './regions';

export function ShellFooter() {
  const { items } = useShellRegions();
  if (items.footer.length === 0) return null;
  return (
    <div className="tokenpanel-footer">
      {items.footer.map((item) => (
        <Fragment key={item.id}>
          {item.render({ compact: false, closeCompactMenu: () => {} })}
        </Fragment>
      ))}
    </div>
  );
}
