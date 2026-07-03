import { Theme } from 'blockly/core';

/** Tema com flyout mais escuro/opaco — não confunde com blocos na trela. */
export const RAPIDSOFT_RPA_THEME = Theme.defineTheme('rapidsoft-rpa', {
  name: 'rapidsoft-rpa',
  base: 'zelos',
  componentStyles: {
    workspaceBackgroundColour: '#f1f5f9',
    toolboxBackgroundColour: '#e2e8f0',
    toolboxForegroundColour: '#0f172a',
    flyoutBackgroundColour: '#b8c5d6',
    flyoutForegroundColour: '#0f172a',
    flyoutOpacity: 1,
    scrollbarColour: '#64748b',
    scrollbarOpacity: 0.5,
  },
});
