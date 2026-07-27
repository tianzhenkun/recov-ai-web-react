import { request } from '@umijs/max';

const AI_CALL_LAB_PREFIX = '/ai-call-lab-api/ai-call';

type AiCallLabResponse<T> = {
  code?: number;
  msg?: string;
  data?: { rows?: T[]; total?: number } | T[];
  rows?: T[];
  total?: number;
};

export type AiCallLabPage<T> = {
  rows: T[];
  total: number;
};

export type AiCallLabVoiceProfile = {
  id?: number | string;
  voice: string;
  displayName?: string;
  gender?: string;
  voiceType?: string;
  targetModel?: string;
  remark?: string;
};

export type AiCallLabPromptProfile = {
  id?: number | string;
  sceneCode: string;
  name: string;
  providerKey?: 'static_profile' | 'business_query' | string;
  promptText?: string | null;
  openingMessage?: string | null;
};

export const unwrapAiCallLabPage = <T>(
  response: AiCallLabResponse<T>,
): AiCallLabPage<T> => {
  const data = response.data;
  if (data && !Array.isArray(data) && Array.isArray(data.rows)) {
    return { rows: data.rows, total: Number(data.total) || 0 };
  }
  if (Array.isArray(response.rows)) {
    return {
      rows: response.rows,
      total: Number(response.total) || response.rows.length,
    };
  }
  if (Array.isArray(data)) {
    return { rows: data, total: data.length };
  }
  return { rows: [], total: 0 };
};

export const getAiCallLabVoiceProfiles = async () => {
  const response = await request<AiCallLabResponse<AiCallLabVoiceProfile>>(
    `${AI_CALL_LAB_PREFIX}/voice-profiles`,
    {
      method: 'get',
      params: { pageSize: 200 },
    },
  );
  return unwrapAiCallLabPage(response);
};

export const getAiCallLabPromptProfiles = async () => {
  const response = await request<AiCallLabResponse<AiCallLabPromptProfile>>(
    `${AI_CALL_LAB_PREFIX}/prompt-profiles`,
    {
      method: 'get',
      params: { pageSize: 200 },
    },
  );
  return unwrapAiCallLabPage(response);
};
