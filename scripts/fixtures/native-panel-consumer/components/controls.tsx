"use client";
import { getScope } from '@takazudo/zfb/zudo-react';
export default function Controls() {
 getScope().onActivate(() => {
  let disposed = false;
  let handle: import('@takazudo/zdtp').PanelInstanceHandle | undefined;
  void import('@takazudo/zdtp').then(panel => {
   if (disposed) return;
   handle = panel.configurePanel({ storagePrefix:'published-consumer', consoleNamespace:'publishedConsumer',
    modalClassPrefix:'published-consumer-modal', schemaId:'published-consumer/v1', exportFilenameBase:'published-consumer',
    tabs:[{id:'spacing',label:'Spacing',tiers:[{id:'raw',label:'Raw spacing',items:[{id:'space-sm',cssVar:'--space-sm',label:'Small',default:'8px',type:{kind:'length',step:1,unit:'px'}}]}]}] });
   panel.reapplyPersistedOverrides(); handle.open();
   (window as any).__nativeHandle = handle;
  });
  return () => { disposed = true; handle?.destroy(); };
 });
 return <p>Widget mounted from npm, separate from the host renderer.</p>;
}
