import { ruoyiRequest } from '@/adapters/ruoyi/request';
import {
  getLitigationFilingMaterials,
  unwrapLitigationFilingMaterials,
} from './litigation-process';

jest.mock('@/adapters/ruoyi/request', () => ({
  ruoyiRequest: jest.fn(),
}));

const mockedRequest = ruoyiRequest as jest.Mock;

describe('litigation process filing materials service', () => {
  beforeEach(() => {
    mockedRequest.mockResolvedValue({ code: 200, data: null });
  });

  it('uses the litigation filing-materials endpoint', async () => {
    await getLitigationFilingMaterials('900');

    expect(mockedRequest).toHaveBeenCalledWith(
      '/system/recov/litigation/900/filing-materials',
      { method: 'get' },
    );
  });

  it('keeps problem material files viewable and not submittable', () => {
    const result = unwrapLitigationFilingMaterials({
      code: 200,
      msg: 'success',
      data: {
        litigationId: 900,
        debtId: 1001,
        debtNumber: 1,
        debtorName: '田先生',
        submitReady: false,
        readyCount: 1,
        blockedCount: 1,
        missingCount: 0,
        documents: [
          {
            taskId: 12,
            instrumentCode: 'DEFENDANT_STATEMENT',
            instrumentName: '被告主体材料',
            materialType: '当事人身份证明',
            status: 6,
            statusName: '盖章失败',
            fileStage: 'DRAFT',
            publicUrl: 'https://example.test/subject-draft.pdf',
            viewable: true,
            downloadable: true,
            submittable: false,
            errorMessage: '盖章失败：印章缺失',
          },
        ],
        missingItems: [],
      },
    });

    expect(result.litigationId).toBe('900');
    expect(result.debtId).toBe('1001');
    expect(result.submitReady).toBe(false);
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0]).toMatchObject({
      taskId: '12',
      instrumentCode: 'DEFENDANT_STATEMENT',
      viewable: true,
      downloadable: true,
      submittable: false,
      fileStage: 'DRAFT',
      errorMessage: '盖章失败：印章缺失',
    });
  });
});
