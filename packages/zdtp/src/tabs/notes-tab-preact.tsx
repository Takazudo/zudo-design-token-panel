import { bridgeToPreact } from '../zr/preact-bridge';
import NotesTabZr, { type NotesTabProps } from './notes-tab';

const BridgedNotesTab = bridgeToPreact<NotesTabProps, 'tab'>(NotesTabZr, {
  signals: [],
  statics: ['tab'],
});

// Preact adapter for the zudo-react Notes tab, used by the Preact panel shell
// until it moves to zudo-react (epic #1075). `tab` is read once at mount, so a
// new tab config remounts the tab.
export default function NotesTab({ tab }: NotesTabProps) {
  return <BridgedNotesTab key={`${tab.notesExtras?.title ?? ''}\u0000${tab.notesExtras?.html ?? ''}`} tab={tab} />;
}
