export const theme = {
  bg: '#000000',
  text: '#F5F5F7',
  textDim: 'rgba(255,255,255,0.4)',
  accent: '#0A84FF',
  hairline: 'rgba(255,255,255,0.14)',
  chipBg: 'rgba(255,255,255,0.07)',
  chipActiveBg: '#0A84FF',
} as const;

export const stageText = {
  fontSize: 30,
  fontWeight: '600',
  lineHeight: 38,
  color: theme.text,
} as const;

export const MAX_GRAPHEMES = 120;
