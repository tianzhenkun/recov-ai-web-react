import { render, screen } from '@testing-library/react';
import React from 'react';
import type { StandingVO } from '@/services/ruoyi/standing';
import StandingCard, {
  getParseStatusTooltipTitle,
  shouldShowRetryParseAction,
} from './StandingCard';

const buildStanding = (overrides: Partial<StandingVO> = {}): StandingVO => ({
  id: 1,
  standingCode: 'LEGAL_REP_CERT',
  standingName: '法定代表人身份证明书',
  standingOssId: 1001,
  status: '1',
  parseStatus: 'SUCCESS',
  legalRepName: '张三',
  legalRepIdCard: '440101199001011234',
  legalRepPhone: '13800138000',
  legalRepAddress: '广州市天河区',
  updateTime: '2026-06-01 10:38:00',
  ...overrides,
});

const noop = () => {};

describe('StandingCard parse presentation', () => {
  it('does not render retry parse action after parsing succeeds', () => {
    render(
      <StandingCard
        item={buildStanding()}
        onPreview={noop}
        onDownload={noop}
        onEdit={noop}
        onDelete={noop}
        onToggleStatus={noop}
        onRetryParse={noop}
      />,
    );

    expect(shouldShowRetryParseAction(buildStanding())).toBe(false);
    expect(screen.queryByRole('button', { name: '已解析成功' })).toBeNull();
    expect(screen.queryByRole('button', { name: '重新解析' })).toBeNull();
  });

  it('only shows phone as the legal representative certificate parse result', () => {
    const title = getParseStatusTooltipTitle(buildStanding());

    expect(title).toContain('联系电话：13800138000');
    expect(title).not.toContain('姓名：张三');
    expect(title).not.toContain('身份证号：440101199001011234');
    expect(title).not.toContain('联系地址：广州市天河区');
  });

  it('does not show phone in legal representative id card parse result', () => {
    const title = getParseStatusTooltipTitle(
      buildStanding({
        standingCode: 'LEGAL_REP_ID_CARD',
        standingName: '法人身份证',
        legalRepAge: 36,
      }),
    );

    expect(title).toContain('姓名：张三');
    expect(title).toContain('身份证号：440101199001011234');
    expect(title).toContain('年龄：36');
    expect(title).toContain('联系地址：广州市天河区');
    expect(title).not.toContain('联系电话：13800138000');
  });

  it('uses the error message as failed parse tooltip', () => {
    const title = getParseStatusTooltipTitle(
      buildStanding({
        parseStatus: 'FAILED',
        parseErrorMessage: '文件内容无法识别',
      }),
    );

    expect(title).toBe('文件内容无法识别');
  });
});
