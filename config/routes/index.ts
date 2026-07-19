import adminRoutes from './admin';
import billingRoutes from './billing';
import publicRoutes, { fallbackRoutes } from './public';
import recovRoutes from './recov';
import salesRoutes from './sales';

export default [
  ...publicRoutes,
  ...salesRoutes,
  ...adminRoutes,
  ...recovRoutes,
  ...billingRoutes,
  ...fallbackRoutes,
];
