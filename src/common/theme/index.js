import { useMemo } from 'react';
import { createTheme } from '@mui/material/styles';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import palette from './palette';
import dimensions from './dimensions';
import components from './components';

// HiTrack: шрифты те же, что на лендинге — DM Sans для текста, Space Grotesk для заголовков
const body = '"DM Sans",Segoe UI,Helvetica Neue,Arial,sans-serif';
const heading = '"Space Grotesk",' + body;

export default (server, darkMode, direction) => useMemo(() => createTheme({
  typography: {
    fontFamily: body,
    h1: { fontFamily: heading, fontWeight: 700 },
    h2: { fontFamily: heading, fontWeight: 700 },
    h3: { fontFamily: heading, fontWeight: 700 },
    h4: { fontFamily: heading, fontWeight: 700 },
    h5: { fontFamily: heading, fontWeight: 700 },
    h6: { fontFamily: heading, fontWeight: 500 },
    subtitle1: { fontFamily: heading, fontWeight: 500 },
    button: { textTransform: 'none', fontWeight: 500 },
  },
  shape: {
    borderRadius: 10,
  },
  palette: palette(server, darkMode),
  direction,
  dimensions,
  components,
}), [server, darkMode, direction]);
