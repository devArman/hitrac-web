export default {
  MuiUseMediaQuery: {
    defaultProps: {
      noSsr: true,
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundColor: theme.palette.background.default,
      }),
    },
  },
  MuiButton: {
    styleOverrides: {
      // HiTrack: скруглённые кнопки как на лендинге, без верхнего регистра
      root: {
        borderRadius: 999,
        paddingLeft: 20,
        paddingRight: 20,
        boxShadow: 'none',
      },
      sizeMedium: {
        height: '40px',
      },
      containedPrimary: ({ theme }) => ({
        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
        '&:hover': {
          filter: 'brightness(1.05)',
          boxShadow: 'none',
        },
      }),
    },
  },
  MuiPaper: {
    styleOverrides: {
      rounded: {
        borderRadius: 14,
      },
    },
  },
  MuiFormControl: {
    defaultProps: {
      size: 'small',
    },
  },
  MuiSnackbar: {
    defaultProps: {
      anchorOrigin: {
        vertical: 'bottom',
        horizontal: 'center',
      },
    },
  },
  MuiTooltip: {
    defaultProps: {
      enterDelay: 500,
      enterNextDelay: 500,
    },
  },
};
