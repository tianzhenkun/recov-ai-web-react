import { ruoyiRequest } from '@/adapters/ruoyi/request';

export const INSTRUMENT_TYPE_TEMPLATE_API_PREFIX = '/system/instrument/type';

export type InstrumentTemplatePurposeCode = 'DELIVERY' | 'FILING' | string;

export type InstrumentTypeTemplateQuery = {
  code?: string;
  name?: string;
  category?: string;
  displayGroupCode?: string;
  purposeCode?: InstrumentTemplatePurposeCode;
  status?: number;
};

export type InstrumentTypeTemplateListItem = {
  id: number | string;
  code: string;
  name: string;
  required?: boolean;
  category?: string | null;
  displayGroupCode?: string | null;
  displayGroupName?: string | null;
  purposeCode?: InstrumentTemplatePurposeCode | null;
  allowSupplemental?: boolean;
  editableAfterSeal?: boolean;
  sortOrder?: number | null;
  description?: string | null;
  status?: number | null;
  templateConfigured?: boolean;
  updateTime?: string | null;
};

export type InstrumentTypeTemplateDetail = InstrumentTypeTemplateListItem & {
  templateJson?: string | null;
  templateHtml?: string | null;
};

export type InstrumentTypeTemplatePayload = {
  templateHtml: string;
};

export type InstrumentTypeTemplateAiModifyPayload = {
  requirement: string;
  currentTemplateHtml: string;
};

export type InstrumentTypeTemplateValidatePayload =
  InstrumentTypeTemplatePayload & {
    requireSealPlaceholder?: boolean;
  };

export type InstrumentTypeTemplateValidateResult = {
  valid: boolean;
};

export type InstrumentTypeTemplatePreviewResult = {
  contentJson?: Record<string, unknown>;
  contentHtml?: string;
};

export type InstrumentTypeTemplateImpact = {
  instrumentTypeId: number | string;
  instrumentCode: string;
  ungeneratedBuiltinTaskCount: number;
};

export type InstrumentTypeTemplateAiModifyResult = {
  templateHtml?: string | null;
  warnings?: string[] | null;
};

export const listInstrumentTypeTemplates = (
  params?: InstrumentTypeTemplateQuery,
) =>
  ruoyiRequest<InstrumentTypeTemplateListItem[]>(
    `${INSTRUMENT_TYPE_TEMPLATE_API_PREFIX}/templates`,
    {
      method: 'get',
      params: params as Record<string, unknown> | undefined,
    },
  );

export const getInstrumentTypeTemplate = (id: number | string) =>
  ruoyiRequest<InstrumentTypeTemplateDetail>(
    `${INSTRUMENT_TYPE_TEMPLATE_API_PREFIX}/${id}/template`,
    {
      method: 'get',
    },
  );

export const saveInstrumentTypeTemplate = (
  id: number | string,
  data: InstrumentTypeTemplatePayload,
) =>
  ruoyiRequest(`${INSTRUMENT_TYPE_TEMPLATE_API_PREFIX}/${id}/template`, {
    method: 'put',
    data,
  });

export const validateInstrumentTypeTemplate = (
  data: InstrumentTypeTemplateValidatePayload,
) =>
  ruoyiRequest<InstrumentTypeTemplateValidateResult>(
    `${INSTRUMENT_TYPE_TEMPLATE_API_PREFIX}/template/validate`,
    {
      method: 'post',
      data,
      headers: { repeatSubmit: false },
    },
  );

export const previewInstrumentTypeTemplate = (
  id: number | string,
  data: InstrumentTypeTemplatePayload,
) =>
  ruoyiRequest<InstrumentTypeTemplatePreviewResult>(
    `${INSTRUMENT_TYPE_TEMPLATE_API_PREFIX}/${id}/template/preview`,
    {
      method: 'post',
      data,
      headers: { repeatSubmit: false },
    },
  );

export const modifyInstrumentTypeTemplate = (
  id: number | string,
  data: InstrumentTypeTemplateAiModifyPayload,
) =>
  ruoyiRequest<InstrumentTypeTemplateAiModifyResult>(
    `${INSTRUMENT_TYPE_TEMPLATE_API_PREFIX}/${id}/template/ai-modify`,
    {
      method: 'post',
      data,
      headers: { repeatSubmit: false },
    },
  );

export const getInstrumentTypeTemplateImpact = (id: number | string) =>
  ruoyiRequest<InstrumentTypeTemplateImpact>(
    `${INSTRUMENT_TYPE_TEMPLATE_API_PREFIX}/${id}/template/impact`,
    {
      method: 'get',
    },
  );
