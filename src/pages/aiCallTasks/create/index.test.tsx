import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import * as React from 'react';
import { listAiCallRules } from '@/pages/aiCallRules/service';
import {
  getAiCallLabPromptProfiles,
  getAiCallLabVoiceProfiles,
} from '@/services/ruoyi/ai-call-lab';
import { uploadOssFile } from '@/services/ruoyi/oss';
import {
  createAiCallTask,
  createBatchValidation,
  downloadOutboundTargetTemplate,
  validateSingleTarget,
} from '../service';
import AiCallTaskCreatePage from './index';

const mockPush = jest.fn();

jest.mock('@umijs/max', () => ({
  history: { push: (...args: unknown[]) => mockPush(...args) },
}));

jest.mock('@/services/ruoyi/ai-call-lab', () => ({
  getAiCallLabPromptProfiles: jest.fn(),
  getAiCallLabVoiceProfiles: jest.fn(),
}));

jest.mock('@/pages/aiCallRules/service', () => ({
  listAiCallRules: jest.fn(),
}));

jest.mock('../service', () => ({
  createAiCallTask: jest.fn(),
  createBatchValidation: jest.fn(),
  downloadOutboundTargetTemplate: jest.fn(),
  downloadValidationIssues: jest.fn(),
  getValidationResult: jest.fn(),
  listValidationIssues: jest.fn(),
  validateSingleTarget: jest.fn(),
}));

jest.mock('@/services/ruoyi/oss', () => ({
  uploadOssFile: jest.fn(),
}));

const mockedPromptProfiles = getAiCallLabPromptProfiles as jest.Mock;
const mockedVoiceProfiles = getAiCallLabVoiceProfiles as jest.Mock;
const mockedListRules = listAiCallRules as jest.Mock;
const mockedValidateSingle = validateSingleTarget as jest.Mock;
const mockedCreateTask = createAiCallTask as jest.Mock;
const mockedCreateBatch = createBatchValidation as jest.Mock;
const mockedDownloadTemplate = downloadOutboundTargetTemplate as jest.Mock;
const mockedUploadOss = uploadOssFile as jest.Mock;

describe('single target AI Call task creation', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockedPromptProfiles.mockReset();
    mockedVoiceProfiles.mockReset();
    mockedListRules.mockReset();
    mockedValidateSingle.mockReset();
    mockedCreateTask.mockReset();
    mockedCreateBatch.mockReset();
    mockedDownloadTemplate.mockReset();
    mockedUploadOss.mockReset();
    mockedPromptProfiles.mockResolvedValue({
      rows: [
        {
          id: 'prompt-1',
          name: '客户回访',
          sceneCode: 'intro_follow_up',
        },
      ],
      total: 1,
    });
    mockedVoiceProfiles.mockResolvedValue({
      rows: [{ voice: 'Cherry', displayName: '芊悦' }],
      total: 1,
    });
    mockedListRules.mockResolvedValue({
      rows: [
        {
          ruleId: 'rule-1',
          ruleName: '工作日规则',
          enabled: true,
          callWindows: [{ startTime: '00:00', endTime: '23:59' }],
          retryCount: 1,
          retryIntervalsMinutes: [30],
          retryableResults: ['no_answer'],
          updatedAt: '2026-07-27 10:00:00',
        },
      ],
      total: 1,
    });
    mockedValidateSingle.mockResolvedValue({
      validationId: 'validation-1',
      status: 'PASSED',
      validTargetCount: 1,
      issueCount: 0,
    });
    mockedCreateTask.mockResolvedValue({
      accepted: true,
      taskId: 'task-created',
    });
    mockedCreateBatch.mockResolvedValue({
      validationId: 'validation-batch',
      status: 'PASSED',
      validTargetCount: 2,
      issueCount: 0,
    });
    mockedDownloadTemplate.mockResolvedValue(undefined);
    mockedUploadOss.mockResolvedValue({
      data: {
        ossId: 'oss-1',
        fileName: 'targets.xlsx',
        url: '/targets.xlsx',
      },
    });
  });

  afterEach(cleanup);

  it('is a single page with only the approved single-target fields', async () => {
    render(<AiCallTaskCreatePage />);
    await screen.findAllByText('客户回访 / intro_follow_up');

    expect(
      (screen.getByRole('radio', { name: '单号码' }) as HTMLInputElement)
        .checked,
    ).toBe(true);
    expect(screen.getByText('手机号')).toBeTruthy();
    expect(screen.getByText('客户名称')).toBeTruthy();
    expect(screen.queryByText('公司名称')).toBeNull();
    expect(screen.queryByText('产品名称')).toBeNull();
    expect(screen.queryByText('业务参数')).toBeNull();
    expect(screen.queryByText('草稿')).toBeNull();
    expect(screen.queryByText('上一步')).toBeNull();
    expect(screen.queryByText('下一步')).toBeNull();
    expect(screen.queryByText(/版本/)).toBeNull();
    expect(screen.getByText('00:00–23:59，最多重试 1 次')).toBeTruthy();
  });

  it('validates a target, shows an inline confirmation and creates once', async () => {
    render(<AiCallTaskCreatePage />);
    await screen.findAllByText('客户回访 / intro_follow_up');

    fireEvent.change(screen.getByPlaceholderText('请输入任务名称'), {
      target: { value: '重点客户回访' },
    });
    fireEvent.change(screen.getByPlaceholderText('请输入手机号'), {
      target: { value: '19900001001' },
    });
    fireEvent.change(screen.getByPlaceholderText('请输入客户名称（选填）'), {
      target: { value: '张先生' },
    });
    fireEvent.click(screen.getByRole('button', { name: '校验任务' }));

    await waitFor(() =>
      expect(mockedValidateSingle).toHaveBeenCalledWith(
        expect.objectContaining({
          taskMode: 'single',
          phoneNumber: '19900001001',
          customerName: '张先生',
          promptProfileId: 'prompt-1',
          sceneCode: 'intro_follow_up',
        }),
      ),
    );
    expect(await screen.findByText('人工确认摘要')).toBeTruthy();
    expect(
      screen.getAllByText('客户回访 / intro_follow_up').length,
    ).toBeGreaterThan(1);

    const confirm = screen.getByRole('button', { name: '确认启动' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await waitFor(() => expect(mockedCreateTask).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith('/ai-call/tasks/task-created'),
    );
  });

  it('downloads the template, uploads one complete list and validates by ossId', async () => {
    const { container } = render(<AiCallTaskCreatePage />);
    await screen.findAllByText('客户回访 / intro_follow_up');

    fireEvent.click(screen.getByRole('radio', { name: '名单外呼' }));
    fireEvent.click(
      await screen.findByRole('button', { name: /下载名单模板/ }),
    );
    await waitFor(() =>
      expect(mockedDownloadTemplate).toHaveBeenCalledTimes(1),
    );

    fireEvent.change(screen.getByPlaceholderText('请输入任务名称'), {
      target: { value: '批量客户回访' },
    });
    const input = container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('未找到名单文件选择框');
    }
    expect(input.accept).toBe('.xlsx,.xls,.csv');
    const file = new File(['手机号,客户名称'], 'targets.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: '校验任务' }));

    await waitFor(() => expect(mockedUploadOss).toHaveBeenCalledWith(file));
    await waitFor(() =>
      expect(mockedCreateBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          ossId: 'oss-1',
          originalFilename: 'targets.xlsx',
          request: expect.objectContaining({
            taskMode: 'batch',
            taskName: '批量客户回访',
          }),
        }),
      ),
    );
    expect(await screen.findByText('有效外呼对象 2 个')).toBeTruthy();
    expect(screen.getByText('人工确认摘要')).toBeTruthy();
  });
});
