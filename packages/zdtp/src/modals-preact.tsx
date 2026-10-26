import { bridgeToPreact } from './zr/preact-bridge';
import { ApplyModal as ApplyModalZr, type ApplyModalProps } from './apply-modal';
import { ExportModal as ExportModalZr, type ExportModalProps } from './export-modal';
import { ImportModal as ImportModalZr, type ImportModalProps } from './import-modal';

// Preact adapters for the zudo-react modals, used by the Preact panel shell
// until it moves to zudo-react (epic #1075).

export const ExportModal = bridgeToPreact<ExportModalProps, 'onClose' | 'instanceConfig'>(
  ExportModalZr,
  { signals: ['state', 'colorDefaults'], callbacks: ['onClose'], statics: ['instanceConfig'] },
);

export const ImportModal = bridgeToPreact<ImportModalProps, 'onClose' | 'onLoad' | 'instanceConfig'>(
  ImportModalZr,
  {
    signals: ['colorDefaults', 'current'],
    callbacks: ['onClose', 'onLoad'],
    statics: ['instanceConfig'],
  },
);

export const ApplyModal = bridgeToPreact<
  ApplyModalProps,
  'onClose' | 'onApplied' | 'instanceConfig'
>(ApplyModalZr, {
  signals: ['state', 'open', 'colorDefaults'],
  callbacks: ['onClose', 'onApplied'],
  statics: ['instanceConfig'],
});
