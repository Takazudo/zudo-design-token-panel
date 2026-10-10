import '../styles/global.css';
import { Island } from '@takazudo/zfb';
import Controls from '../components/controls';
export default function Page() {
 return <html><head><meta charset="utf-8"/><title>Published ZDTP consumer</title><link rel="icon" href="data:,"/>
 </head>
 <body><a href="/next/">Next route</a><div id="preview">Live preview</div><Island when="load"><Controls/></Island></body></html>;
}
