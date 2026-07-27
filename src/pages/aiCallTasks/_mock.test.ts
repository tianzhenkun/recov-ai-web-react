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
});
