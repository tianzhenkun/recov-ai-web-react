export type DeliveryContentTemplates = {
  sms: {
    enabled: boolean;
    content: string;
    providerTemplateId?: string | null;
    sortOrder?: number | null;
    wayName?: string;
  };
  email: {
    enabled: boolean;
    subject: string;
    html: string;
    providerTemplateId?: string | null;
    sortOrder?: number | null;
    wayName?: string;
  };
  express: {
    enabled: boolean;
    content: string;
    providerTemplateId?: string | null;
    sortOrder?: number | null;
    wayName?: string;
  };
  call: {
    enabled: boolean;
    script: string;
    providerTemplateId?: string | null;
    sortOrder?: number | null;
    wayName?: string;
  };
};

export type DeliveryTemplateTabId = keyof DeliveryContentTemplates;
