import {
  fetchApprovedLawyerCandidates,
  fetchLawyerCourtReviewPage,
  fetchLawyerReviewCandidates,
  resetLawyerCourtMockData,
} from './service';

describe('lawyer court local mock service', () => {
  beforeEach(() => {
    resetLawyerCourtMockData();
  });

  it('uses eight real lawyer review records as matched rows', async () => {
    const result = await fetchLawyerCourtReviewPage({
      tab: 'matched',
      pageNum: 1,
      pageSize: 10,
    });

    expect(result.total).toBe(8);
    expect(result.rows).toHaveLength(8);
    expect(result.rows[0]).toMatchObject({
      id: 'matched-2031998571292590081',
      lawyerId: '2031998571292590081',
      lawyerName: '张东亚',
      firm: '上海市浩信律师事务所',
      status: '已匹配',
      city: '上海市',
      region: '上海市',
      rating: 5,
    });
  });

  it('uses four real lawyer review records as unmatched rows', async () => {
    const result = await fetchLawyerCourtReviewPage({
      tab: 'unmatched',
      pageNum: 1,
      pageSize: 10,
    });

    expect(result.total).toBe(4);
    expect(result.rows).toHaveLength(4);
    expect(result.rows[0]).toMatchObject({
      id: 'unmatched-1998947250552528897',
      city: '深圳市',
      region: '广东省',
    });
    expect(result.rows[0]).toMatchObject({
      unmatchReason:
        '待匹配律师：韦煜钦，接口未返回案件匹配结果，暂以 mock 案件补齐',
    });
  });

  it('paginates matched rows locally', async () => {
    const result = await fetchLawyerCourtReviewPage({
      tab: 'matched',
      pageNum: 2,
      pageSize: 3,
    });

    expect(result.total).toBe(8);
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0]).toMatchObject({
      id: 'matched-1998206069795282945',
      lawyerName: '申红博',
    });
  });

  it('searches approved candidates from local review records', async () => {
    const result = await fetchApprovedLawyerCandidates({
      pageNum: 1,
      pageSize: 10,
      applyStatus: 2,
      lawyerName: '张',
    });

    expect(result.total).toBe(1);
    expect(result.rows[0]).toMatchObject({
      id: '2031998571292590081',
      lawyerName: '张东亚',
      lawyerFirm: '上海市浩信律师事务所',
      applyStatus: 2,
    });
  });

  it('searches pending candidates from the local unmatched slice', async () => {
    const result = await fetchLawyerReviewCandidates({
      pageNum: 1,
      pageSize: 10,
      applyStatus: 1,
      lawyerName: '杨',
    });

    expect(result.total).toBe(1);
    expect(result.rows[0]).toMatchObject({
      id: '1998290630436806658',
      lawyerName: '杨明春',
      lawyerFirm: '四川发现律师事务所',
      applyStatus: 1,
    });
  });
});
