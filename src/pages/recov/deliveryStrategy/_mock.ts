export type DeliveryContentTemplates = {
  sms: { enabled: boolean; content: string };
  email: {
    enabled: boolean;
    subject: string;
    html: string;
    attachPdf: boolean;
  };
  express: { enabled: boolean; company: string; note: string };
  phone: { enabled: boolean; script: string };
};

export type DeliveryTemplateTabId = keyof DeliveryContentTemplates;

export type DeliveryRetrySettings = {
  enabled: boolean;
  waitHours: number;
  maxRetriesPerChannel: number;
};

export type DeliveryMockSnapshot = {
  templates: DeliveryContentTemplates;
  retry: DeliveryRetrySettings;
};

const cloneDeep = <T>(value: T) => JSON.parse(JSON.stringify(value)) as T;

let deliveryMockSeed: DeliveryMockSnapshot = {
  templates: {
    sms: {
      enabled: true,
      content:
        '尊敬的{{customerName}}，您在{{projectName}}的{{billName}}仍未缴清，欠费金额{{overdueAmount}}元。请尽快处理：{{detailUrl}}。如已缴费请忽略。客服电话：{{servicePhone}}',
    },
    email: {
      enabled: true,
      subject: '【重要通知】请确认账单缴费情况',
      html:
        '<p>尊敬的{{customerName}}：</p>' +
        '<p>您在{{projectName}}的账单仍未缴清，欠费金额 <b>{{overdueAmount}}</b> 元。</p>' +
        '<p>请点击链接查看详情并处理：{{detailUrl}}</p>' +
        '<p>如已缴费请忽略。客服电话：{{servicePhone}}</p>',
      attachPdf: true,
    },
    express: {
      enabled: true,
      company: '顺丰',
      note: '快递将寄送催收函件，请注意查收。',
    },
    phone: {
      enabled: true,
      script:
        '您好，这里是{{companyName}}客服。想跟您确认一下{{projectName}}本期费用缴费情况……（可编辑话术）',
    },
  },
  retry: {
    enabled: true,
    waitHours: 24,
    maxRetriesPerChannel: 3,
  },
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 获取送达模板与重试配置（mock）。
 */
export const getDeliveryTemplatesMock =
  async (): Promise<DeliveryMockSnapshot> => {
    await delay(60);
    return cloneDeep(deliveryMockSeed);
  };

/**
 * 获取单个渠道的模板（mock）。
 */
export const getDeliveryWayTemplateMock = async <
  T extends DeliveryTemplateTabId,
>(
  wayId: T,
): Promise<DeliveryContentTemplates[T]> => {
  await delay(60);
  return cloneDeep(deliveryMockSeed.templates[wayId]);
};

/**
 * 保存送达模板与重试配置（mock）。
 */
export const updateDeliveryTemplatesMock = async (
  snapshot: DeliveryMockSnapshot,
): Promise<boolean> => {
  await delay(120);
  deliveryMockSeed = cloneDeep(snapshot);
  return true;
};
