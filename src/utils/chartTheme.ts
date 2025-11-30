export const chartTheme = {
  gridStroke: 'var(--color-bg-hover)',
  axisStroke: 'var(--text)',
  axisTick: {
    fill: 'var(--text)',
    fontSize: 11
  },
  axisLabel: {
    fill: 'var(--text)',
    fontSize: 11
  },
  tooltip: {
    backgroundColor: 'var(--color-bg-primary-dark)',
    border: '1px solid var(--bank-color-accent, var(--color-border-nav-active-dark))',
    borderRadius: 12,
    padding: 14,
    boxShadow: 'var(--color-shadow-2xl-dark)'
  },
  tooltipLabel: {
    color: 'var(--color-text-secondary-dark)',
    fontWeight: 600,
    marginBottom: 4
  },
  tooltipItem: {
    color: 'var(--color-text-muted-light-dark)'
  },
  legendProps: {
    wrapperStyle: {
      paddingTop: 16,
      color: 'var(--muted)',
      fontSize: 12
    },
    iconType: 'circle' as const
  },
  barRadius: [10, 10, 0, 0] as [number, number, number, number],
  lineDot: {
    r: 4,
    strokeWidth: 2,
    stroke: 'var(--bank-color, var(--color-chart-primary))',
    fill: 'var(--color-bank-palette-2)'
  },
  lineActiveDot: {
    r: 6,
    strokeWidth: 2,
    stroke: 'var(--bank-color, #3b82f6)',
    fill: 'var(--color-bg-surface)'
  }
};

export type ChartTheme = typeof chartTheme;

