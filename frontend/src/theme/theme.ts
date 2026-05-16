import type { ThemeConfig } from 'antd';

/**
 * Notion-inspired design system for Ant Design ConfigProvider.
 *
 * Key characteristics:
 * - Warm minimalism: soft whites (#ffffff / #f6f5f4), near-black text (rgba(0,0,0,.95))
 * - Serif headings for brand / page titles
 * - Sans-serif body (Inter)
 * - Subtle borders, gentle shadows
 * - Blue accent (#0075de) for interactive elements
 */

export const notionTheme: ThemeConfig = {
  token: {
    colorPrimary: '#0075de',
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f6f5f4',
    colorText: 'rgba(0,0,0,.95)',
    colorTextSecondary: '#615d59',
    colorTextTertiary: '#a39e98',
    colorBorder: 'rgba(0,0,0,.1)',
    colorBorderSecondary: 'rgba(0,0,0,.06)',
    colorError: '#dd5b00',
    colorSuccess: '#1aae39',
    colorWarning: '#dd5b00',
    borderRadius: 4,
    borderRadiusLG: 8,
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    fontSize: 14,
    controlHeight: 36,
    lineWidth: 1,
    boxShadow:
      '0 1px 2px rgba(0,0,0,.04)',
    boxShadowSecondary:
      '0 4px 24px rgba(0,0,0,.12)',
  },
  components: {
    Input: {
      activeBorderColor: '#097fe8',
      hoverBorderColor: '#097fe8',
      activeShadow: '0 0 0 2px rgba(9,127,232,.15)',
      paddingInline: 12,
      paddingBlock: 8,
      borderRadius: 4,
      colorBorder: 'rgba(0,0,0,.1)',
    },
    Button: {
      borderRadius: 4,
      controlHeight: 36,
      fontWeight: 500,
      primaryShadow: 'none',
    },
    Tabs: {
      inkBarColor: '#0075de',
      itemSelectedColor: 'rgba(0,0,0,.95)',
      itemColor: '#615d59',
      horizontalItemPadding: '8px 16px',
    },
  },
};
