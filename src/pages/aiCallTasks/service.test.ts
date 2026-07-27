import { ruoyiDownload } from '@/adapters/ruoyi/download';
import { ruoyiRequest } from '@/adapters/ruoyi/request';
import { RuoyiError } from '@/adapters/ruoyi/response';
import {
  cancelAiCallTask,
  createAiCallTask,
  createBatchValidation,
  downloadOutboundTargetTemplate,
  downloadValidationIssues,
  getAiCallTask,
  getValidationResult,
  listAiCallTasks,
  listAiCallTaskTargets,
  listValidationIssues,
  pauseAiCallTask,
  resumeAiCallTask,
  stopAiCallTask,
  updateAiCallTaskSchedule,
  validateSingleTarget,
} from './service';

jest.mock('@/adapters/ruoyi/request', () => ({
  ruoyiRequest: jest.fn(),
}));

jest.mock('@/adapters/ruoyi/download', () => ({
  ruoyiDownload: jest.fn(),
}));

const mockedRuoyiRequest = ruoyiRequest as jest.Mock;
const mockedRuoyiDownload = ruoyiDownload as jest.Mock;

const runningTask = {
  taskId: 'task-1',
  taskName: '合同审查客户回访',
  taskMode: 'batch',
  status: 'RUNNING',
  totalTargets: 100,
  completedTargets: 35,
  connectedTargets: 18,
  failedTargets: 5,
  executionMode: 'immediate',
  promptName: '合同审查产品介绍',
  sceneCode: 'intro_contract',
  voice: 'Cherry',
  ruleId: 'rule-1',
  ruleName: '工作日规则',
  ruleSummary: '09:00–18:00，最多重试 2 次',
  createdAt: '2026-07-27 09:00:00',
  updatedAt: '2026-07-27 09:10:00',
} as const;

const validationRequest = {
  taskName: '合同审查客户回访',
  taskMode: 'batch',
  promptProfileId: 'prompt-1',
  sceneCode: 'intro_contract',
  voice: 'Cherry',
  ruleId: 'rule-1',
  executionMode: 'immediate',
} as const;

const createPayload = validationRequest;

describe('AI Call task service', () => {
  beforeEach(() => {
    mockedRuoyiRequest.mockReset();
    mockedRuoyiDownload.mockReset();
  });

  it('normalizes task pagination and sends the isolated proxy options', async () => {
    mockedRuoyiRequest.mockResolvedValueOnce({
      code: 200,
      rows: [runningTask],
      total: 1,
    });

    await expect(
      listAiCallTasks({
        pageNum: 1,
        pageSize: 20,
        status: 'RUNNING',
      }),
    ).resolves.toEqual({ rows: [runningTask], total: 1 });

    expect(mockedRuoyiRequest).toHaveBeenCalledWith('/ai-call/outbound-tasks', {
      baseApi: '/ai-call-agent-api',
      method: 'get',
      params: { pageNum: 1, pageSize: 20, status: 'RUNNING' },
    });
  });

  it('unwraps ordinary task data and target pagination', async () => {
    mockedRuoyiRequest
      .mockResolvedValueOnce({ code: 200, data: runningTask })
      .mockResolvedValueOnce({
        code: 200,
        rows: [
          {
            targetId: 'target-1',
            taskId: 'task-1',
            phoneNumber: '19900001001',
            status: 'IN_CALL',
            attemptCount: 2,
            updatedAt: '2026-07-27 09:10:00',
          },
        ],
        total: 1,
      });

    await expect(getAiCallTask('task-1')).resolves.toEqual(runningTask);
    await expect(
      listAiCallTaskTargets('task-1', {
        pageNum: 1,
        pageSize: 20,
        phoneNumber: '199',
      }),
    ).resolves.toMatchObject({ total: 1 });

    expect(mockedRuoyiRequest).toHaveBeenNthCalledWith(
      2,
      '/ai-call/outbound-tasks/task-1/targets',
      {
        baseApi: '/ai-call-agent-api',
        method: 'get',
        params: { pageNum: 1, pageSize: 20, phoneNumber: '199' },
      },
    );
  });

  it.each([
    { rows: [runningTask], total: 1 },
    [runningTask],
    { code: 200, data: { rows: [runningTask], total: 1 } },
  ])('rejects a non-contract pagination response', async (response) => {
    mockedRuoyiRequest.mockResolvedValueOnce(response);

    await expect(listAiCallTasks({ pageNum: 1, pageSize: 20 })).rejects.toThrow(
      'code' in Object(response)
        ? '分页响应缺少 rows 或 total'
        : '接口响应缺少 code',
    );
  });

  it('rejects an ordinary response without data', async () => {
    mockedRuoyiRequest.mockResolvedValueOnce({ code: 200 });

    await expect(getAiCallTask('task-1')).rejects.toThrow('接口响应缺少 data');
  });

  it('does not swallow errors raised by the RuoYi request layer', async () => {
    const error = new RuoyiError('任务状态不允许暂停', {
      code: 409,
      msg: '任务状态不允许暂停',
    });
    mockedRuoyiRequest.mockRejectedValueOnce(error);

    await expect(pauseAiCallTask('task-1', 'idem-pause')).rejects.toBe(error);
  });

  it('creates a task with a validation id and idempotency key', async () => {
    mockedRuoyiRequest.mockResolvedValueOnce({
      code: 200,
      data: { taskId: 'task-1', accepted: true },
    });

    await expect(
      createAiCallTask(createPayload, 'validation-1', 'idem-create'),
    ).resolves.toEqual({ taskId: 'task-1', accepted: true });

    expect(mockedRuoyiRequest).toHaveBeenCalledWith('/ai-call/outbound-tasks', {
      baseApi: '/ai-call-agent-api',
      method: 'post',
      headers: { 'Idempotency-Key': 'idem-create' },
      data: { ...createPayload, validationId: 'validation-1' },
    });
  });

  it('maps scheduling and task actions to accepted commands', async () => {
    mockedRuoyiRequest.mockResolvedValue({
      code: 200,
      data: { accepted: true },
    });

    await updateAiCallTaskSchedule(
      'task-1',
      {
        taskName: '调整后的任务',
        scheduledAt: '2026-07-28 10:00:00',
      },
      'idem-schedule',
    );
    await pauseAiCallTask('task-1', 'idem-pause');
    await resumeAiCallTask('task-1', 'idem-resume');
    await stopAiCallTask('task-1', 'idem-stop');
    await cancelAiCallTask('task-1', 'idem-cancel');

    expect(mockedRuoyiRequest.mock.calls).toEqual([
      [
        '/ai-call/outbound-tasks/task-1/schedule',
        {
          baseApi: '/ai-call-agent-api',
          method: 'put',
          headers: { 'Idempotency-Key': 'idem-schedule' },
          data: {
            taskName: '调整后的任务',
            scheduledAt: '2026-07-28 10:00:00',
          },
        },
      ],
      [
        '/ai-call/outbound-tasks/task-1/pause',
        {
          baseApi: '/ai-call-agent-api',
          method: 'post',
          headers: { 'Idempotency-Key': 'idem-pause' },
        },
      ],
      [
        '/ai-call/outbound-tasks/task-1/resume',
        {
          baseApi: '/ai-call-agent-api',
          method: 'post',
          headers: { 'Idempotency-Key': 'idem-resume' },
        },
      ],
      [
        '/ai-call/outbound-tasks/task-1/stop',
        {
          baseApi: '/ai-call-agent-api',
          method: 'post',
          headers: { 'Idempotency-Key': 'idem-stop' },
        },
      ],
      [
        '/ai-call/outbound-tasks/task-1/cancel',
        {
          baseApi: '/ai-call-agent-api',
          method: 'post',
          headers: { 'Idempotency-Key': 'idem-cancel' },
        },
      ],
    ]);
  });

  it('maps single and batch validation requests', async () => {
    mockedRuoyiRequest
      .mockResolvedValueOnce({
        code: 200,
        data: {
          validationId: 'single-validation',
          status: 'PASSED',
          validTargetCount: 1,
          issueCount: 0,
        },
      })
      .mockResolvedValueOnce({
        code: 200,
        data: {
          validationId: 'batch-validation',
          status: 'VALIDATING',
          validTargetCount: 0,
          issueCount: 0,
          accepted: true,
        },
      });

    await validateSingleTarget({
      ...validationRequest,
      taskMode: 'single',
      phoneNumber: '19900001001',
      customerName: '王先生',
    });
    await createBatchValidation({
      ossId: 'oss-1',
      originalFilename: '外呼名单.xlsx',
      request: validationRequest,
    });

    expect(mockedRuoyiRequest).toHaveBeenNthCalledWith(
      1,
      '/ai-call/outbound-validations/single',
      {
        baseApi: '/ai-call-agent-api',
        method: 'post',
        data: {
          ...validationRequest,
          taskMode: 'single',
          phoneNumber: '19900001001',
          customerName: '王先生',
        },
      },
    );
    expect(mockedRuoyiRequest).toHaveBeenNthCalledWith(
      2,
      '/ai-call/outbound-validations/batch',
      {
        baseApi: '/ai-call-agent-api',
        method: 'post',
        data: {
          ossId: 'oss-1',
          originalFilename: '外呼名单.xlsx',
          request: validationRequest,
        },
      },
    );
  });

  it('queries validation state and issue pagination', async () => {
    mockedRuoyiRequest
      .mockResolvedValueOnce({
        code: 200,
        data: {
          validationId: 'validation-1',
          status: 'FAILED',
          validTargetCount: 1,
          issueCount: 2,
        },
      })
      .mockResolvedValueOnce({
        code: 200,
        rows: [
          {
            issueId: 'issue-1',
            rowNumber: 2,
            phoneNumber: '123',
            reasons: ['手机号格式错误'],
          },
        ],
        total: 1,
      });

    await getValidationResult('validation-1');
    await listValidationIssues('validation-1', {
      pageNum: 1,
      pageSize: 20,
      phoneNumber: '123',
      reason: '手机号格式错误',
    });

    expect(mockedRuoyiRequest).toHaveBeenNthCalledWith(
      2,
      '/ai-call/outbound-validations/validation-1/issues',
      {
        baseApi: '/ai-call-agent-api',
        method: 'get',
        params: {
          pageNum: 1,
          pageSize: 20,
          phoneNumber: '123',
          reason: '手机号格式错误',
        },
      },
    );
  });

  it('uses the shared downloader for the template and issue export', async () => {
    mockedRuoyiDownload.mockResolvedValue(undefined);

    await downloadOutboundTargetTemplate();
    await downloadValidationIssues('validation-1');

    expect(mockedRuoyiDownload).toHaveBeenNthCalledWith(
      1,
      '/ai-call/outbound-targets/import-template',
      {},
      '外呼名单导入模板.xlsx',
      { baseApi: '/ai-call-agent-api' },
    );
    expect(mockedRuoyiDownload).toHaveBeenNthCalledWith(
      2,
      '/ai-call/outbound-validations/validation-1/issues/export',
      {},
      '外呼名单问题明细.xlsx',
      { baseApi: '/ai-call-agent-api' },
    );
  });
});
