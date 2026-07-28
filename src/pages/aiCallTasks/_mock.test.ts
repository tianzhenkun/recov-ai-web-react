import mockRoutes from './_mock';

type MockHandler = (
  req: {
    body?: Record<string, unknown>;
    params: Record<string, string>;
    query: Record<string, unknown>;
  },
  res: MockResponse,
) => unknown;

type MockResponse = {
  statusCode: number;
  body?: unknown;
  status: (code: number) => MockResponse;
  json: (body: unknown) => unknown;
};

const createResponse = (): MockResponse => {
  const response: MockResponse = {
    statusCode: 200,
    status(code) {
      response.statusCode = code;
      return response;
    },
    json(body) {
      response.body = body;
      return body;
    },
  };
  return response;
};

const getHandler = (route: string) =>
  (mockRoutes as unknown as Record<string, MockHandler>)[route];

describe('AI Call task mock', () => {
  it('keeps the validated single target and configuration in task detail', () => {
    const validationResponse = createResponse();
    getHandler('POST /ai-call-agent-api/ai-call/outbound-validations/single')(
      {
        body: {
          taskName: '浏览器验收单号任务',
          taskMode: 'single',
          phoneNumber: '13800138000',
          customerName: '验收客户',
          promptProfileId: '1',
          sceneCode: 'intro_geo',
          voice: 'Tina',
          ruleId: 'rule-workday',
          executionMode: 'scheduled',
          scheduledAt: '2026-07-28 10:00:00',
        },
        params: {},
        query: {},
      },
      validationResponse,
    );

    const validationId = (
      validationResponse.body as {
        data: { validationId: string };
      }
    ).data.validationId;
    const createResponseBody = createResponse();
    getHandler('POST /ai-call-agent-api/ai-call/outbound-tasks')(
      {
        body: {
          taskName: '浏览器验收单号任务',
          taskMode: 'single',
          promptProfileId: '1',
          sceneCode: 'intro_geo',
          voice: 'Tina',
          ruleId: 'rule-workday',
          executionMode: 'scheduled',
          scheduledAt: '2026-07-28 10:00:00',
          validationId,
        },
        params: {},
        query: {},
      },
      createResponseBody,
    );

    const taskId = (
      createResponseBody.body as {
        data: { taskId: string };
      }
    ).data.taskId;
    const detailResponse = createResponse();
    getHandler('GET /ai-call-agent-api/ai-call/outbound-tasks/:taskId')(
      { body: {}, params: { taskId }, query: {} },
      detailResponse,
    );
    const targetsResponse = createResponse();
    getHandler('GET /ai-call-agent-api/ai-call/outbound-tasks/:taskId/targets')(
      { body: {}, params: { taskId }, query: {} },
      targetsResponse,
    );

    expect(detailResponse.body).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          promptName: 'GEO 产品介绍',
          sceneCode: 'intro_geo',
          voiceName: 'Tina',
        }),
      }),
    );
    expect(targetsResponse.body).toEqual(
      expect.objectContaining({
        rows: [
          expect.objectContaining({
            phoneNumber: '13800138000',
            customerName: '验收客户',
          }),
        ],
        total: 1,
      }),
    );
  });

  it('creates pageable target rows for a validated batch task', () => {
    const validationResponse = createResponse();
    getHandler('POST /ai-call-agent-api/ai-call/outbound-validations/batch')(
      {
        body: {
          file: { name: '外呼名单.xlsx' },
          request: JSON.stringify({
            taskName: '浏览器验收名单任务',
            taskMode: 'batch',
            promptProfileId: '1',
            sceneCode: 'intro_geo',
            voice: 'Tina',
            ruleId: 'rule-workday',
            executionMode: 'scheduled',
            scheduledAt: '2026-07-28 10:00:00',
          }),
        },
        params: {},
        query: {},
      },
      validationResponse,
    );

    const validationId = (
      validationResponse.body as {
        data: { validationId: string };
      }
    ).data.validationId;
    const createResponseBody = createResponse();
    getHandler('POST /ai-call-agent-api/ai-call/outbound-tasks')(
      {
        body: {
          taskName: '浏览器验收名单任务',
          taskMode: 'batch',
          promptProfileId: '1',
          sceneCode: 'intro_geo',
          voice: 'Tina',
          ruleId: 'rule-workday',
          executionMode: 'scheduled',
          scheduledAt: '2026-07-28 10:00:00',
          validationId,
        },
        params: {},
        query: {},
      },
      createResponseBody,
    );

    const taskId = (
      createResponseBody.body as {
        data: { taskId: string };
      }
    ).data.taskId;
    const firstPageResponse = createResponse();
    getHandler('GET /ai-call-agent-api/ai-call/outbound-tasks/:taskId/targets')(
      {
        body: {},
        params: { taskId },
        query: { pageNum: 1, pageSize: 10 },
      },
      firstPageResponse,
    );
    const secondPageResponse = createResponse();
    getHandler('GET /ai-call-agent-api/ai-call/outbound-tasks/:taskId/targets')(
      {
        body: {},
        params: { taskId },
        query: { pageNum: 2, pageSize: 10 },
      },
      secondPageResponse,
    );

    expect(firstPageResponse.body).toEqual(
      expect.objectContaining({
        rows: expect.arrayContaining([
          expect.objectContaining({
            taskId,
            phoneNumber: expect.stringMatching(/^1\d{10}$/),
          }),
        ]),
        total: 18,
      }),
    );
    expect((secondPageResponse.body as { rows: unknown[] }).rows).toHaveLength(
      8,
    );
  });

  it('exposes direct batch validation retry without a file upload route', () => {
    expect(
      Object.keys(mockRoutes).some(
        (route) => route.includes('/resource/') && route.includes('/upload'),
      ),
    ).toBe(false);

    const systemErrors: Array<{
      validationId: string;
      retryAction: 'REUPLOAD' | 'RETRY_VALIDATION';
    }> = [];
    for (let index = 0; index < 6 && systemErrors.length < 2; index += 1) {
      const validationResponse = createResponse();
      getHandler('POST /ai-call-agent-api/ai-call/outbound-validations/batch')(
        {
          body: {
            file: { name: `外呼名单-${index}.xlsx` },
            request: JSON.stringify({ taskMode: 'batch' }),
          },
          params: {},
          query: {},
        },
        validationResponse,
      );
      const validationId = (
        validationResponse.body as {
          data: { validationId: string };
        }
      ).data.validationId;
      const resultResponse = createResponse();
      const getValidation = getHandler(
        'GET /ai-call-agent-api/ai-call/outbound-validations/:validationId',
      );
      getValidation(
        { body: {}, params: { validationId }, query: {} },
        resultResponse,
      );
      getValidation(
        { body: {}, params: { validationId }, query: {} },
        resultResponse,
      );
      const result = (
        resultResponse.body as {
          data: {
            status: string;
            retryAction?: 'REUPLOAD' | 'RETRY_VALIDATION';
          };
        }
      ).data;
      if (result.status === 'SYSTEM_ERROR' && result.retryAction) {
        systemErrors.push({ validationId, retryAction: result.retryAction });
      }
    }

    expect(systemErrors.map((item) => item.retryAction)).toEqual(
      expect.arrayContaining(['REUPLOAD', 'RETRY_VALIDATION']),
    );
    const retryable = systemErrors.find(
      (item) => item.retryAction === 'RETRY_VALIDATION',
    );
    const reupload = systemErrors.find(
      (item) => item.retryAction === 'REUPLOAD',
    );
    if (!retryable || !reupload) {
      throw new Error('Mock 未生成两类系统错误');
    }

    const retryResponse = createResponse();
    const retryHandler = getHandler(
      'POST /ai-call-agent-api/ai-call/outbound-validations/:validationId/retry',
    );
    retryHandler(
      { body: {}, params: { validationId: retryable.validationId }, query: {} },
      retryResponse,
    );
    expect(retryResponse.body).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          validationId: retryable.validationId,
          status: 'VALIDATING',
        }),
      }),
    );

    const rejectedResponse = createResponse();
    retryHandler(
      { body: {}, params: { validationId: reupload.validationId }, query: {} },
      rejectedResponse,
    );
    expect(rejectedResponse.statusCode).toBe(409);
  });
});
