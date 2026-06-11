import type { ProLayoutProps } from '@ant-design/pro-components';

/**
 * @name
 */
const Settings: ProLayoutProps & {
  logo?: string;
  recovColorTheme?: 'default' | 'layeredDarkNav';
} = {
  navTheme: 'light',
  recovColorTheme: 'layeredDarkNav',
  // 酱紫
  colorPrimary: '#722ED1',
  layout: 'side',
  contentWidth: 'Fluid',
  siderWidth: 196,
  fixedHeader: false,
  fixSiderbar: true,
  colorWeak: false,
  title: 'Recov Agent',
  logo: '/brand/lingchen-icon.png',
  iconfontUrl: '',
  token: {
    // 参见ts声明，demo 见文档，通过token 修改样式
    //https://procomponents.ant.design/components/layout#%E9%80%9A%E8%BF%87-token-%E4%BF%AE%E6%94%B9%E6%A0%B7%E5%BC%8F
  },
};

export default Settings;
