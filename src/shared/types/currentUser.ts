export type CurrentUser = {
  name?: string;
  avatar?: string;
  userid?: string;
  email?: string;
  signature?: string;
  title?: string;
  group?: string;
  tags?: Array<{ key?: string; label?: string }>;
  notifyCount?: number;
  unreadCount?: number;
  country?: string;
  access?: string;
  geographic?: {
    province?: { label?: string; key?: string };
    city?: { label?: string; key?: string };
  };
  address?: string;
  phone?: string;
};
