import { grey } from '@mui/material/colors';

const validatedColor = (color) => (/^#([0-9A-Fa-f]{3}){1,2}$/.test(color) ? color : null);

// HiTrack: фирменная палитра — те же цвета, что на hitrack.am
export const brand = {
  tracking: '#01A586',
  trackingLight: '#02C49E',
  trackingDark: '#018A70',
  signal: '#0C7FC3',
  signalLight: '#1A9AE6',
  navy: '#0A2E3E',
  navyDark: '#061B26',
  surface: '#F0F9F7',
  border: '#D1E8E3',
  text: '#0A1F2E',
  textSecondary: '#4A6B7A',
  alert: '#DC2626',
};

export default (server, darkMode) => ({
  mode: darkMode ? 'dark' : 'light',
  background: {
    default: darkMode ? brand.navyDark : brand.surface,
    paper: darkMode ? brand.navy : '#FFFFFF',
  },
  primary: {
    main: validatedColor(server?.attributes?.colorPrimary)
      || (darkMode ? brand.trackingLight : brand.tracking),
  },
  secondary: {
    main: validatedColor(server?.attributes?.colorSecondary)
      || (darkMode ? brand.signalLight : brand.signal),
  },
  error: {
    main: brand.alert,
  },
  text: darkMode ? undefined : {
    primary: brand.text,
    secondary: brand.textSecondary,
  },
  divider: darkMode ? undefined : brand.border,
  neutral: {
    main: grey[500],
  },
  geometry: {
    main: brand.signal,
  },
});
