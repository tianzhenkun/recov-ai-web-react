import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';
import {
  getFilingMaterialSubmitEvidence,
  getFlowEvents,
  getFlowExecutionTrace,
  getFlowInstanceDetail,
  retryFlowCurrentStep,
} from '@/services/ruoyi/flowInstance';
import { listOssByIds } from '@/services/ruoyi/oss';
import FlowTraceDrawer from './FlowTraceDrawer';

jest.mock('@/services/ruoyi/flowInstance', () => ({
  getFilingMaterialSubmitEvidence: jest.fn(),
  getFlowEvents: jest.fn(),
  getFlowExecutionTrace: jest.fn(),
  getFlowInstanceDetail: jest.fn(),
  retryFlowCurrentStep: jest.fn(),
}));

jest.mock('@/services/ruoyi/oss', () => ({
  listOssByIds: jest.fn(),
}));

const getFilingMaterialSubmitEvidenceMock =
  getFilingMaterialSubmitEvidence as jest.Mock;
const getFlowExecutionTraceMock = getFlowExecutionTrace as jest.Mock;
const getFlowInstanceDetailMock = getFlowInstanceDetail as jest.Mock;
const getFlowEventsMock = getFlowEvents as jest.Mock;
const retryFlowCurrentStepMock = retryFlowCurrentStep as jest.Mock;
const listOssByIdsMock = listOssByIds as jest.Mock;

describe('FlowTraceDrawer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    retryFlowCurrentStepMock.mockResolvedValue({ data: null });
    getFlowEventsMock.mockResolvedValue({ data: [] });
    getFilingMaterialSubmitEvidenceMock.mockResolvedValue({
      data: {
        nodeCode: 'filing_material_submit',
        nodeType: 'material_submit',
        status: '3',
        statusName: '失败',
        message: '账号配置缺少用户名或密码',
        screenshots: [],
      },
    });
    listOssByIdsMock.mockResolvedValue({ data: [] });
    getFlowInstanceDetailMock.mockResolvedValue({
      data: {
        completedStepCount: 2,
        failedStepCount: 1,
        totalStepCount: 3,
      },
    });
    getFlowExecutionTraceMock.mockResolvedValue({
      data: {
        instanceId: 'instance-1',
        debtRecordId: 'debt-1',
        debtNumber: 'A-001',
        debtorName: '张三',
        city: '深圳市',
        organization: '星河项目',
        personaId: 'persona-1',
        flowStatus: '3',
        flowStatusName: '节点失败',
        currentStepId: 'step-1',
        currentNodeCode: 'filing_material_submit',
        currentTaskId: 'task-1',
        canRetryCurrentStep: true,
        canTerminate: true,
        completedStepCount: 2,
        failedStepCount: 1,
        totalStepCount: 3,
        steps: [
          {
            stepId: 'step-corp-letter',
            stepIndex: 0,
            nodeCode: 'corp_letter',
            stepStatus: 'DONE',
            stepStatusName: '执行成功',
            latestProgressMessage:
              '[UR_CO] 等待送达终态: deliveryId=2060961996654505985, deliveryTaskId=2060961996931330049, status=0',
            latestResultMessage:
              '送达成功: deliveryId=2060961996654505985, deliveryTaskId=2060961998411919362, message=express sent by mock provider',
          },
          {
            stepId: 'step-law-letter',
            stepIndex: 1,
            nodeCode: 'law_letter',
            stepStatus: 'DONE',
            stepStatusName: '执行成功',
            latestProgressMessage:
              '[UR_LAW] 文书已盖章: instrumentTaskId=2060962072055508993, sealedOssId=2060962081983352833',
            latestResultMessage:
              '送达成功: deliveryId=2060962084302876674, deliveryTaskId=2060962084554534913, message=express sent by mock provider',
          },
          {
            stepId: 'step-1',
            stepIndex: 2,
            nodeCode: 'filing_material_submit',
            current: true,
            stepStatus: 'BLOCKED',
            stepStatusName: '执行失败，流程阻塞',
            latestResultMessage: '账号配置缺少用户名或密码: lawyer_001',
          },
        ],
      },
    });
  });

  it('orders overview fields by business context and omits duplicate step progress', async () => {
    render(
      <FlowTraceDrawer
        open={true}
        instanceId="instance-1"
        onClose={jest.fn()}
      />,
    );

    expect(await screen.findByText('资产编号')).toBeTruthy();

    await waitFor(() => {
      expect(screen.queryByText('步骤进度')).toBeNull();
    });

    const overviewText =
      document.querySelector('.ant-descriptions')?.textContent ?? '';

    expect(overviewText.indexOf('资产编号')).toBeLessThan(
      overviewText.indexOf('当前流程状态'),
    );
    expect(overviewText.indexOf('业主姓名')).toBeLessThan(
      overviewText.indexOf('当前节点'),
    );
    expect(overviewText.indexOf('所属项目')).toBeLessThan(
      overviewText.indexOf('当前流程状态'),
    );
    expect(overviewText).not.toContain('债务记录 ID');
    expect(overviewText).not.toContain('当前任务 ID');
    expect(overviewText).not.toContain('画像 ID');
    expect(screen.getByText('流程步骤')).toBeTruthy();
  });

  it('keeps overview descriptions within two columns on desktop', async () => {
    render(
      <FlowTraceDrawer
        open={true}
        instanceId="instance-1"
        onClose={jest.fn()}
      />,
    );

    expect(await screen.findByText('资产编号')).toBeTruthy();

    const maxLabelCount = Math.max(
      ...Array.from(document.querySelectorAll('.ant-descriptions-row')).map(
        (row) => row.querySelectorAll('.ant-descriptions-item-label').length,
      ),
    );

    expect(maxLabelCount).toBeLessThanOrEqual(2);
  });

  it('renders user-facing step summaries without backend debug payloads', async () => {
    render(
      <FlowTraceDrawer
        open={true}
        instanceId="instance-1"
        onClose={jest.fn()}
      />,
    );

    expect(await screen.findByText('资产编号')).toBeTruthy();

    fireEvent.click(screen.getByText('流程步骤'));

    expect(await screen.findByText('企业催收函')).toBeTruthy();
    expect(screen.getAllByText('律师函').length).toBeGreaterThan(0);
    expect(screen.getAllByText('发送申请诉讼截图').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText('账号配置缺少用户名或密码').length,
    ).toBeGreaterThan(0);

    const drawerText = document.body.textContent ?? '';

    expect(drawerText).not.toContain('deliveryId=');
    expect(drawerText).not.toContain('deliveryTaskId=');
    expect(drawerText).not.toContain('instrumentTaskId=');
    expect(drawerText).not.toContain('sealedOssId=');
    expect(drawerText).not.toContain('mock provider');
    expect(drawerText).not.toContain('corp_letter');
    expect(drawerText).not.toContain('law_letter');
    expect(drawerText).not.toContain('filing_material_submit');
    expect(drawerText).not.toContain('lawyer_001');
    expect(screen.queryByText('执行记录')).toBeNull();
  });

  it('links completed step tags to the theme color instead of the preset blue tag', async () => {
    render(
      <FlowTraceDrawer
        open={true}
        instanceId="instance-1"
        onClose={jest.fn()}
      />,
    );

    expect(await screen.findByText('资产编号')).toBeTruthy();

    fireEvent.click(screen.getByText('流程步骤'));

    const completedTag = screen
      .getAllByText('已完成')
      .map((node) => node.closest('.ant-tag'))
      .find(Boolean) as HTMLElement | undefined;

    expect(completedTag).toBeTruthy();
    expect(completedTag?.className).not.toContain('ant-tag-blue');
  });

  it('uses a compact drawer width and timeline-like step rows', async () => {
    render(
      <FlowTraceDrawer
        open={true}
        instanceId="instance-1"
        onClose={jest.fn()}
      />,
    );

    expect(await screen.findByText('资产编号')).toBeTruthy();

    const drawerWrapper = document.querySelector(
      '.ant-drawer-content-wrapper',
    ) as HTMLElement | null;

    expect(drawerWrapper?.style.width).toContain('760px');
    expect(drawerWrapper?.style.width).not.toContain('1080px');

    fireEvent.click(screen.getByText('流程步骤'));

    expect(await screen.findByText('企业催收函')).toBeTruthy();
    expect(document.querySelector('.flow-trace-step-content')).toBeTruthy();
    expect(document.querySelector('.flow-trace-step-card')).toBeNull();
  });

  it('only exposes the primary retry action in the footer', async () => {
    render(
      <FlowTraceDrawer
        open={true}
        instanceId="instance-1"
        onClose={jest.fn()}
      />,
    );

    expect(await screen.findByText('资产编号')).toBeTruthy();

    expect(screen.queryByText('刷新')).toBeNull();
    expect(screen.queryByText('人工终止')).toBeNull();

    const retryButton = screen.getByRole('button', { name: '重试当前节点' });
    expect(retryButton.className).toContain('ant-btn-primary');
  });

  it('marks the current running step with an icon instead of a tag', async () => {
    getFlowExecutionTraceMock.mockResolvedValueOnce({
      data: {
        instanceId: 'instance-1',
        debtNumber: 'A-001',
        debtorName: '张三',
        city: '深圳市',
        organization: '星河项目',
        flowStatus: '1',
        flowStatusName: '等待回调',
        currentStepId: 'step-running',
        currentNodeCode: 'law_letter',
        canRetryCurrentStep: false,
        steps: [
          {
            stepId: 'step-done',
            stepIndex: 0,
            nodeCode: 'corp_letter',
            stepStatus: 'DONE',
            stepStatusName: '执行成功',
          },
          {
            stepId: 'step-running',
            stepIndex: 1,
            nodeCode: 'law_letter',
            current: true,
            stepStatus: 'RUNNING',
            stepStatusName: '执行中',
          },
        ],
      },
    });

    render(
      <FlowTraceDrawer
        open={true}
        instanceId="instance-1"
        onClose={jest.fn()}
      />,
    );

    expect(await screen.findByText('资产编号')).toBeTruthy();

    fireEvent.click(screen.getByText('流程步骤'));

    expect(await screen.findByText('企业催收函')).toBeTruthy();
    expect(screen.getAllByText('律师函').length).toBeGreaterThan(0);
    const currentNodeTags = Array.from(
      document.querySelectorAll('.ant-tag'),
    ).filter((item) => item.textContent === '当前节点');
    expect(currentNodeTags).toHaveLength(0);
    expect(document.querySelector('.flow-trace-current-step-dot')).toBeTruthy();
    expect(document.querySelector('.ant-timeline-item-head-green')).toBeNull();
  });

  it('renders only submitted RPA evidence screenshots in the overview', async () => {
    getFlowExecutionTraceMock.mockResolvedValueOnce({
      data: {
        instanceId: 'instance-1',
        debtNumber: 'A-001',
        debtorName: '张三',
        city: '深圳市',
        organization: '星河项目',
        flowStatus: '2',
        flowStatusName: '已完成',
        currentStepId: 'step-1',
        currentNodeCode: 'filing_material_submit',
        canRetryCurrentStep: false,
        steps: [
          {
            stepId: 'step-1',
            stepIndex: 0,
            nodeCode: 'filing_material_submit',
            reached: true,
            stepStatus: 'DONE',
            stepStatusName: '执行成功',
          },
        ],
      },
    });
    getFilingMaterialSubmitEvidenceMock.mockResolvedValueOnce({
      data: {
        nodeCode: 'filing_material_submit',
        nodeType: 'material_submit',
        status: '2',
        statusName: '已完成',
        message: '材料已提交法院',
        rpaStatus: 'SUCCESS_SUBMITTED',
        screenshots: [
          { name: '提交成功截图', type: 'submitted', ossId: '1001' },
        ],
      },
    });
    listOssByIdsMock.mockResolvedValueOnce({
      data: [
        {
          ossId: '1001',
          originalName: 'submit-success.png',
          url: 'https://example.test/submit-success.png',
        },
      ],
    });

    render(
      <FlowTraceDrawer
        open={true}
        instanceId="instance-1"
        onClose={jest.fn()}
      />,
    );

    expect(await screen.findByText('RPA执行证据')).toBeTruthy();
    expect(screen.queryByText('SUCCESS_SUBMITTED')).toBeNull();
    expect(screen.getByText('提交成功截图')).toBeTruthy();
    await waitFor(() => {
      expect(listOssByIdsMock).toHaveBeenCalledWith('1001');
    });
    expect(
      document.querySelector(
        'a[href="https://example.test/submit-success.png"]',
      ),
    ).toBeTruthy();
  });

  it('shows a local loading panel while RPA evidence is loading', async () => {
    getFlowExecutionTraceMock.mockResolvedValueOnce({
      data: {
        instanceId: 'instance-1',
        debtNumber: 'A-001',
        debtorName: '张三',
        city: '深圳市',
        organization: '星河项目',
        flowStatus: '2',
        flowStatusName: '已完成',
        currentStepId: 'step-1',
        currentNodeCode: 'filing_material_submit',
        canRetryCurrentStep: false,
        steps: [
          {
            stepId: 'step-1',
            stepIndex: 0,
            nodeCode: 'filing_material_submit',
            reached: true,
            stepStatus: 'DONE',
            stepStatusName: '执行成功',
          },
        ],
      },
    });

    let resolveEvidence: (value: {
      data: {
        nodeCode: string;
        nodeType: string;
        status: string;
        statusName: string;
        screenshots: never[];
      };
    }) => void = () => {};
    getFilingMaterialSubmitEvidenceMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveEvidence = resolve;
      }),
    );

    render(
      <FlowTraceDrawer
        open={true}
        instanceId="instance-1"
        onClose={jest.fn()}
      />,
    );

    expect(await screen.findByText('资产编号')).toBeTruthy();
    expect(await screen.findByText('RPA执行证据')).toBeTruthy();
    expect(screen.getByText('正在加载RPA执行证据')).toBeTruthy();

    resolveEvidence({
      data: {
        nodeCode: 'filing_material_submit',
        nodeType: 'material_submit',
        status: '2',
        statusName: '已完成',
        screenshots: [],
      },
    });

    await waitFor(() => {
      expect(screen.queryByText('正在加载RPA执行证据')).toBeNull();
    });
  });

  it('renders only RPA failure screenshots in the event tab', async () => {
    getFlowExecutionTraceMock.mockResolvedValueOnce({
      data: {
        instanceId: 'instance-1',
        debtNumber: 'A-001',
        debtorName: '张三',
        city: '深圳市',
        organization: '星河项目',
        flowStatus: '3',
        flowStatusName: '节点失败',
        currentStepId: 'step-1',
        currentNodeCode: 'filing_material_submit',
        canRetryCurrentStep: true,
        steps: [
          {
            stepId: 'step-1',
            stepIndex: 0,
            nodeCode: 'filing_material_submit',
            reached: true,
            current: true,
            stepStatus: 'BLOCKED',
            stepStatusName: '执行失败，流程阻塞',
            latestResultMessage: 'RPA材料提交失败：登录失败',
          },
        ],
      },
    });
    getFilingMaterialSubmitEvidenceMock.mockResolvedValueOnce({
      data: {
        nodeCode: 'filing_material_submit',
        nodeType: 'material_submit',
        status: '3',
        statusName: '失败',
        message: '登录失败',
        rpaStatus: 'FAILED',
        screenshots: [{ name: 'RPA失败现场', type: 'failure', ossId: '1002' }],
      },
    });
    listOssByIdsMock.mockResolvedValueOnce({
      data: [
        {
          ossId: '1002',
          originalName: 'failure.png',
          url: 'https://example.test/failure.png',
        },
      ],
    });

    render(
      <FlowTraceDrawer
        open={true}
        instanceId="instance-1"
        onClose={jest.fn()}
      />,
    );

    expect(await screen.findByText('RPA执行证据')).toBeTruthy();
    fireEvent.click(screen.getByText('流程动态'));
    expect((await screen.findAllByText('RPA失败现场')).length).toBeGreaterThan(
      0,
    );
    expect(screen.queryByText('FAILED')).toBeNull();
    expect(
      document.querySelector('a[href="https://example.test/failure.png"]'),
    ).toBeTruthy();
  });

  it('hides RPA evidence when there are no screenshots', async () => {
    getFlowExecutionTraceMock.mockResolvedValueOnce({
      data: {
        instanceId: 'instance-1',
        debtNumber: 'A-001',
        debtorName: '张三',
        city: '深圳市',
        organization: '星河项目',
        flowStatus: '3',
        flowStatusName: '节点失败',
        currentStepId: 'step-1',
        currentNodeCode: 'filing_material_submit',
        canRetryCurrentStep: true,
        steps: [
          {
            stepId: 'step-1',
            stepIndex: 0,
            nodeCode: 'filing_material_submit',
            reached: true,
            current: true,
            stepStatus: 'BLOCKED',
            stepStatusName: '执行失败，流程阻塞',
            latestResultMessage: '无法自动确定受理法院，请选择法院后继续',
          },
        ],
      },
    });
    getFilingMaterialSubmitEvidenceMock.mockResolvedValueOnce({
      data: {
        nodeCode: 'filing_material_submit',
        nodeType: 'material_submit',
        status: '3',
        statusName: '失败',
        message: '无法自动确定受理法院，请选择法院后继续',
        screenshots: [],
      },
    });

    render(
      <FlowTraceDrawer
        open={true}
        instanceId="instance-1"
        onClose={jest.fn()}
      />,
    );

    expect(await screen.findByText('资产编号')).toBeTruthy();
    expect(screen.queryByText('RPA执行证据')).toBeNull();
    expect(screen.queryByText('暂无RPA截图')).toBeNull();
    expect(listOssByIdsMock).not.toHaveBeenCalled();
  });

  it('hides RPA evidence silently when evidence loading fails', async () => {
    getFlowExecutionTraceMock.mockResolvedValueOnce({
      data: {
        instanceId: 'instance-1',
        debtNumber: 'A-001',
        debtorName: '张三',
        city: '深圳市',
        organization: '星河项目',
        flowStatus: '3',
        flowStatusName: '节点失败',
        currentStepId: 'step-1',
        currentNodeCode: 'filing_material_submit',
        canRetryCurrentStep: true,
        steps: [
          {
            stepId: 'step-1',
            stepIndex: 0,
            nodeCode: 'filing_material_submit',
            reached: true,
            current: true,
            stepStatus: 'BLOCKED',
            stepStatusName: '执行失败，流程阻塞',
            latestResultMessage: 'RPA材料提交失败',
          },
        ],
      },
    });
    getFilingMaterialSubmitEvidenceMock.mockRejectedValueOnce(
      new Error('evidence unavailable'),
    );

    render(
      <FlowTraceDrawer
        open={true}
        instanceId="instance-1"
        onClose={jest.fn()}
      />,
    );

    expect(await screen.findByText('资产编号')).toBeTruthy();
    await waitFor(() => {
      expect(getFilingMaterialSubmitEvidenceMock).toHaveBeenCalled();
    });
    expect(screen.queryByText('RPA执行证据')).toBeNull();
    expect(screen.queryByText('RPA执行证据加载失败，请稍后重试')).toBeNull();
  });

  it('does not show stale RPA evidence while the filing node retry is waiting for callback', async () => {
    getFlowExecutionTraceMock.mockResolvedValueOnce({
      data: {
        instanceId: 'instance-1',
        debtNumber: 'A-001',
        debtorName: '张三',
        city: '深圳市',
        organization: '星河项目',
        flowStatus: '1',
        flowStatusName: '等待回调',
        currentStepId: 'step-1',
        currentNodeCode: 'filing_material_submit',
        canRetryCurrentStep: false,
        steps: [
          {
            stepId: 'step-1',
            stepIndex: 0,
            nodeCode: 'filing_material_submit',
            reached: true,
            current: true,
            stepStatus: 'RUNNING',
            stepStatusName: '等待节点回调',
            latestProgressMessage: '业务侧已接收',
          },
        ],
      },
    });

    render(
      <FlowTraceDrawer
        open={true}
        instanceId="instance-1"
        onClose={jest.fn()}
      />,
    );

    expect(await screen.findByText('资产编号')).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText('等待回调')).toBeTruthy();
    });
    expect(getFilingMaterialSubmitEvidenceMock).not.toHaveBeenCalled();
    expect(screen.queryByText('RPA执行证据')).toBeNull();
  });

  it('does not request RPA evidence before the filing node is reached', async () => {
    getFlowExecutionTraceMock.mockResolvedValueOnce({
      data: {
        instanceId: 'instance-1',
        debtNumber: 'A-001',
        debtorName: '张三',
        city: '深圳市',
        organization: '星河项目',
        flowStatus: '1',
        flowStatusName: '等待回调',
        currentStepId: 'step-corp-letter',
        currentNodeCode: 'corp_letter',
        canRetryCurrentStep: false,
        steps: [
          {
            stepId: 'step-corp-letter',
            stepIndex: 0,
            nodeCode: 'corp_letter',
            reached: true,
            current: true,
            stepStatus: 'RUNNING',
            stepStatusName: '执行中',
          },
          {
            stepId: 'step-1',
            stepIndex: 1,
            nodeCode: 'filing_material_submit',
            reached: false,
            stepStatus: 'PENDING',
            stepStatusName: '未开始',
          },
        ],
      },
    });

    render(
      <FlowTraceDrawer
        open={true}
        instanceId="instance-1"
        onClose={jest.fn()}
      />,
    );

    expect(await screen.findByText('资产编号')).toBeTruthy();
    expect(getFilingMaterialSubmitEvidenceMock).not.toHaveBeenCalled();
    expect(screen.queryByText('RPA执行证据')).toBeNull();
  });
});
