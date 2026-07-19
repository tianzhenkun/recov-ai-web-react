import type { SiteProfile } from '@/site-profiles';
import baseBranding from './base';

const defaultTitle =
  typeof baseBranding.title === 'string' && baseBranding.title.trim()
    ? baseBranding.title
    : 'LingChen AI';

export const resolveSiteBranding = (siteProfile?: SiteProfile) => ({
  logo: baseBranding.logo,
  title: siteProfile?.productName || defaultTitle,
});
