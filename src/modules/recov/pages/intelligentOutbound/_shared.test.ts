import {
  buildMetricDisplay,
  buildOutboundOverview,
  formatDuration,
  resolveOutboundStartDisabledReason,
  resolveOutboundStartNotice,
} from './_shared';

describe('intelligent outbound shared helpers', () => {
  it('resolves the same outbound start disabled reasons as datelligence', () => {
    expect(
      resolveOutboundStartDisabledReason({
        outboundStarting: true,
        recordTotal: 10,
      }),
    ).toBe('催收流程正在发起，请稍后');

    expect(
      resolveOutboundStartDisabledReason({
        outboundFlowProcessing: true,
        recordTotal: 10,
      }),
    ).toBe('催收流程批次处理中，请稍后');

    expect(resolveOutboundStartDisabledReason({ recordTotal: 0 })).toBe(
      '暂无债务记录，无法开启外呼',
    );

    expect(
      resolveOutboundStartDisabledReason({
        isImportWorkflowProcessing: true,
        recordTotal: 10,
      }),
    ).toBe('当前导入任务处理中，请等待完成后再开启外呼');

    expect(
      resolveOutboundStartDisabledReason({
        pipelineStatus: 'failed',
        recordTotal: 10,
      }),
    ).toBe('');

    expect(
      resolveOutboundStartDisabledReason({
        pipelineStatus: 'partial_failed',
        recordTotal: 10,
      }),
    ).toBe('后续处理存在失败，请重试或忽略后再开启外呼');

    expect(
      resolveOutboundStartDisabledReason({
        hasBlockingImportFailure: true,
        recordTotal: 10,
      }),
    ).toBe('导入链路存在失败，请处理后再开启外呼');

    expect(resolveOutboundStartDisabledReason({ recordTotal: 10 })).toBe('');
  });

  it('warns on non-blocking import failure before starting outbound', () => {
    expect(
      resolveOutboundStartNotice({
        pipelineStatus: 'failed',
      }),
    ).toBe('最近一次导入失败，本次仅处理已入库且未开始的债务。');

    expect(
      resolveOutboundStartNotice({
        hasNonBlockingImportFailure: true,
      }),
    ).toBe('最近一次导入失败，本次仅处理已入库且未开始的债务。');

    expect(
      resolveOutboundStartNotice({
        pipelineStatus: 'partial_failed',
      }),
    ).toBe('');
  });

  it('formats call duration with natural time text instead of decimal hours', () => {
    const overview = buildOutboundOverview({
      totalCallDurationSeconds: 98,
      todayCallDurationSeconds: 98,
    });

    const totalDurationMetric = overview.metrics.find(
      (metric) => metric.key === 'totalTalkHours',
    );

    expect(totalDurationMetric).toBeTruthy();
    if (!totalDurationMetric) throw new Error('missing total duration metric');
    expect(buildMetricDisplay(totalDurationMetric).primary).toBe('1 分 38 秒');
    expect(overview.liveStats.totalTalkSecondsToday).toBe(98);
  });

  it('supports hour-level natural duration text', () => {
    expect(formatDuration(3725)).toBe('1 小时 2 分 5 秒');
  });
});
