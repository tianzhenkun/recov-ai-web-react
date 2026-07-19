import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import React from 'react';
import { fetchLitigationFilingMaterials } from '../service';
import LitigationFilingMaterialsDrawer from './LitigationFilingMaterialsDrawer';

const workspaceStyles = readFileSync(
  join(__dirname, '../../instrument/components/DocumentPreviewWorkspace.css'),
  'utf8',
);

jest.mock('../service', () => ({
  fetchLitigationFilingMaterials: jest.fn(),
}));

jest.mock('@/components/PdfPreview', () => {
  const ReactRuntime = require('react');
  return (props: { height?: string; url?: string }) =>
    ReactRuntime.createElement('div', {
      'data-testid': 'pdf-preview',
      'data-height': props.height,
      'data-url': props.url,
    });
});

const fetchLitigationFilingMaterialsMock =
  fetchLitigationFilingMaterials as jest.Mock;

const row = {
  id: '900',
  flowId: '8001',
  debtNumber: 1,
  city: '广州市',
  organization: '越秀天宸',
  debtorName: '田先生',
  debtAmount: '4188',
  overdueAmount: '126',
  overdueDays: 141,
  courtName: '广州市越秀区人民法院',
  caseNo: null,
  status: '0' as const,
  failReason: null,
  result: null,
};

describe('LitigationFilingMaterialsDrawer', () => {
  beforeEach(() => {
    fetchLitigationFilingMaterialsMock.mockResolvedValue({
      litigationId: '900',
      debtId: '1001',
      debtNumber: 1,
      debtorName: '田先生',
      city: '广州市',
      organization: '越秀天宸',
      courtName: '广州市越秀区人民法院',
      caseNo: '',
      submitReady: false,
      summaryMessage: '当前有1项立案材料不可提交',
      readyCount: 1,
      blockedCount: 1,
      missingCount: 0,
      documents: [
        {
          taskId: '11',
          revisionId: '111',
          taskSource: '',
          instrumentCode: 'LT_CP',
          instrumentName: '起诉状正文',
          category: '诉讼材料',
          displayGroupCode: 'LITIGATION_MATERIALS',
          materialType: '起诉状',
          status: 5,
          statusName: '已盖章',
          fileStage: 'SEALED',
          ossId: '1011',
          publicUrl: 'https://example.test/complaint-sealed.pdf',
          viewable: true,
          downloadable: true,
          submittable: true,
          errorMessage: '',
        },
        {
          taskId: '12',
          revisionId: '112',
          taskSource: '',
          instrumentCode: 'DEFENDANT_STATEMENT',
          instrumentName: '被告主体材料',
          category: '诉讼材料',
          displayGroupCode: 'SUBJECT_STANDING',
          materialType: '当事人身份证明',
          status: 6,
          statusName: '盖章失败',
          fileStage: 'DRAFT',
          ossId: '1012',
          publicUrl: 'https://example.test/subject-draft.pdf',
          viewable: true,
          downloadable: true,
          submittable: false,
          errorMessage: '盖章失败：印章缺失',
        },
        {
          taskId: '13',
          revisionId: '113',
          taskSource: '',
          instrumentCode: 'DEFENDANT_EXTRA',
          instrumentName: '被告补充主体材料',
          category: '诉讼材料',
          displayGroupCode: 'SUBJECT_STANDING',
          materialType: '当事人身份证明',
          status: 5,
          statusName: '已盖章',
          fileStage: 'SEALED',
          ossId: '1013',
          publicUrl: 'https://example.test/subject-extra.pdf',
          viewable: true,
          downloadable: true,
          submittable: true,
          errorMessage: '',
        },
      ],
      missingItems: [],
    });
  });

  it('uses a left type list and previews the selected material on the right', async () => {
    render(
      React.createElement(
        ConfigProvider,
        null,
        React.createElement(LitigationFilingMaterialsDrawer, {
          open: true,
          row,
          onClose: jest.fn(),
        }),
      ),
    );

    await waitFor(() => {
      expect(screen.getByTestId('filing-material-type-list')).toBeTruthy();
    });

    expect(screen.getAllByText('起诉状').length).toBeGreaterThan(0);
    expect(screen.getAllByText('当事人身份证明').length).toBeGreaterThan(0);
    expect(screen.queryByText('必需立案材料齐全，可提交立案')).toBeNull();
    expect(document.querySelector('.ant-modal')).toBeTruthy();
    expect(document.querySelector('.ant-drawer')).toBeNull();
    expect(
      document.querySelector(
        '.litigation-filing-workspace .instrument-workspace-shell',
      ),
    ).toBeTruthy();
    expect(
      document.querySelector(
        '.litigation-filing-workspace .instrument-doc-sidebar',
      ),
    ).toBeTruthy();
    expect(
      document.querySelector(
        '.litigation-filing-workspace .instrument-doc-main',
      ),
    ).toBeTruthy();
    const typeListText =
      screen.getByTestId('filing-material-type-list').textContent ?? '';
    expect(typeListText).toContain('起诉状');
    expect(typeListText).toContain('当事人身份证明');
    expect(typeListText).not.toContain('起诉状正文');
    expect(typeListText.match(/当事人身份证明/g)).toHaveLength(2);
    expect(typeListText).not.toContain('2份');
    expect(typeListText).toContain('被告主体材料');
    expect(typeListText).toContain('被告补充主体材料');
    expect(typeListText).not.toContain('已盖章');
    expect(typeListText).not.toContain('盖章文件');
    expect(typeListText).not.toContain('可提交');
    expect(
      document.querySelector(
        '[data-testid="filing-material-type-list"] .instrument-doc-item',
      ),
    ).toBeTruthy();
    expect(screen.getByTestId('filing-material-preview-pane')).toBeTruthy();
    const previewHeading =
      screen.getByTestId('filing-material-preview-heading').textContent ?? '';
    expect(previewHeading).toContain('起诉状');
    expect(previewHeading).not.toContain('查看');
    expect(previewHeading).toContain('下载');
    expect(previewHeading).not.toContain('起诉状正文');
    expect(previewHeading).not.toContain('已盖章');
    expect(previewHeading).not.toContain('盖章文件');
    expect(screen.getByTestId('pdf-preview').getAttribute('data-url')).toBe(
      'https://example.test/complaint-sealed.pdf',
    );
    expect(screen.getByTestId('pdf-preview').getAttribute('data-height')).toBe(
      'auto',
    );

    fireEvent.click(screen.getByText('被告补充主体材料'));

    expect(screen.getByTestId('pdf-preview').getAttribute('data-url')).toBe(
      'https://example.test/subject-extra.pdf',
    );
  });

  it('lets the filing-material preview pane own scrolling', () => {
    const previewPaneBlock =
      workspaceStyles.match(
        /\.litigation-filing-preview-pane\s*\{[^}]+}/,
      )?.[0] ?? '';
    const stageBlock =
      workspaceStyles.match(
        /\.litigation-filing-preview-pane \.instrument-doc-stage\s*\{[^}]+}/,
      )?.[0] ?? '';

    expect(previewPaneBlock).toContain('overflow: auto;');
    expect(previewPaneBlock).toContain('overscroll-behavior: contain;');
    expect(workspaceStyles).toContain(
      '.litigation-filing-preview-pane .instrument-doc-stage',
    );
    expect(workspaceStyles).toContain(
      '.litigation-filing-preview-pane .instrument-preview-frame',
    );
    expect(workspaceStyles).toContain('min-height: 0;');
    expect(stageBlock).toContain('overflow: visible;');
    expect(workspaceStyles).toContain('width: 100%;');
    expect(workspaceStyles).not.toContain('.litigation-filing-material-group');
  });
});
