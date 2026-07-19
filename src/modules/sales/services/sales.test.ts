import { ruoyiRequest } from '@/api/main';
import {
  getSalesLeadEvidenceDetail,
  getSalesTaskProgress,
  normalizeSalesAccountContacts,
  normalizeSalesAccountProfile,
  normalizeSalesLeadEvidenceDetail,
  normalizeSalesLeadResult,
  normalizeSalesSearchRun,
  normalizeSalesSearchRunProgress,
  querySalesLeadPage,
  querySalesLeadResultPage,
  updateSalesAccountProfileReview,
} from './sales';

jest.mock('@/api/main', () => ({
  ruoyiRequest: jest.fn(),
}));

describe('sales service run normalization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses parsed report object when Java returns report_json only', () => {
    const run = normalizeSalesSearchRun({
      id: '1001',
      task_id: '2001',
      status: 'completed',
      report_json: JSON.stringify({
        account_profiles: [{ company: { primaryDomain: 'example.com' } }],
      }),
    });

    expect(run?.report).toEqual({
      account_profiles: [{ company: { primaryDomain: 'example.com' } }],
    });
  });

  it('prefers report object over report_json fallback', () => {
    const run = normalizeSalesSearchRun({
      id: '1002',
      report: { provider_summary: { provider: 'serper' } },
      report_json: '{"provider_summary":{"provider":"brave"}}',
    });

    expect(run?.report).toEqual({ provider_summary: { provider: 'serper' } });
  });

  it('normalizes archived account profile fields from Java payload', () => {
    const profile = normalizeSalesAccountProfile({
      id: '3001',
      run_id: '1002',
      task_id: '2002',
      task_name: '沙特工业阀门搜索',
      run_status: 'completed',
      profile_key: 'abc',
      primary_domain: 'example.com',
      display_name: 'Example Trading',
      website_url: 'https://example.com',
      country_code: 'SA',
      city: 'Riyadh',
      source_types: ['google_places', 'official_site'],
      decision: 'candidate',
      decision_reason: 'matches ICP',
      review_status: 'needs_more_evidence',
      review_note: '需要补充官网证据',
    });

    expect(profile).toMatchObject({
      id: '3001',
      runId: '1002',
      taskId: '2002',
      taskName: '沙特工业阀门搜索',
      runStatus: 'completed',
      profileKey: 'abc',
      primaryDomain: 'example.com',
      displayName: 'Example Trading',
      websiteUrl: 'https://example.com',
      countryCode: 'SA',
      city: 'Riyadh',
      sourceTypes: ['google_places', 'official_site'],
      decision: 'candidate',
      decisionReason: 'matches ICP',
      reviewStatus: 'needs_more_evidence',
      reviewNote: '需要补充官网证据',
    });
  });

  it('updates account profile review through the account profile endpoint', async () => {
    jest.mocked(ruoyiRequest).mockResolvedValue({
      code: 200,
      msg: 'ok',
      data: {
        id: '3001',
        primary_domain: 'example.com',
        review_status: 'approved',
      },
    });

    const response = await updateSalesAccountProfileReview('3001', {
      reviewStatus: 'approved',
      reviewNote: '匹配目标客户',
    });

    expect(ruoyiRequest).toHaveBeenCalledWith(
      '/system/sales/search/runs/account-profiles/3001/review',
      {
        method: 'put',
        data: {
          reviewStatus: 'approved',
          reviewNote: '匹配目标客户',
        },
      },
    );
    expect(response.data?.reviewStatus).toBe('approved');
  });

  it('queries sales lead ledger page from Java archived account profiles', async () => {
    jest.mocked(ruoyiRequest).mockResolvedValue({
      code: 200,
      msg: 'ok',
      rows: [
        {
          id: '3001',
          primary_domain: 'example.com',
          review_status: 'pending',
        },
      ],
      total: 1,
    });

    const response = await querySalesLeadPage({
      pageNum: 1,
      pageSize: 10,
      keyword: 'example',
      reviewStatus: 'pending',
    });

    expect(ruoyiRequest).toHaveBeenCalledWith('/system/sales/leads/page', {
      method: 'get',
      params: {
        pageNum: 1,
        pageSize: 10,
        keyword: 'example',
        reviewStatus: 'pending',
      },
    });
    expect(response.rows?.[0].primaryDomain).toBe('example.com');
    expect(response.total).toBe(1);
  });

  it('queries flattened sales lead task results from Java', async () => {
    jest.mocked(ruoyiRequest).mockResolvedValue({
      code: 200,
      msg: 'ok',
      rows: [
        {
          profile_id: '3001',
          contact_id: '7001',
          task_id: '2001',
          task_name: 'Saudi valves',
          task_status: 'completed',
          primary_domain: 'example.com',
          display_name: 'Example Trading',
          full_name: 'Ahmed Ali',
          job_title: 'Procurement Manager',
          contact_score: 82,
          company_channel_count: 2,
          company_channels: [
            {
              id: '8001',
              profile_id: '3001',
              channel_type: 'email',
              channel_value: 'sales@example.com',
              normalized_value: 'sales@example.com',
              confidence: 65,
              verified_status: 'format_valid',
              reason: '公开页面抽取到的公共邮箱',
              raw: {
                ownerScope: 'company',
                attributionStatus: 'company_level',
              },
            },
          ],
          contact_evidence_count: 1,
          contact_channels: [
            {
              id: '9001',
              contact_id: '7001',
              profile_id: '3001',
              channel_type: 'email',
              channel_value: 'ahmed@example.com',
              normalized_value: 'ahmed@example.com',
              confidence: 75,
              verified_status: 'format_valid',
            },
            {
              id: '9002',
              contact_id: '7001',
              profile_id: '3001',
              channel_type: 'linkedin',
              channel_value: 'https://linkedin.com/in/ahmed-ali',
              normalized_value: 'https://linkedin.com/in/ahmed-ali',
              confidence: 60,
              verified_status: 'unverified',
            },
          ],
        },
      ],
      total: 1,
    });

    const response = await querySalesLeadResultPage({
      pageNum: 1,
      pageSize: 10,
      taskStatus: 'completed',
      taskId: '2001',
    });

    expect(ruoyiRequest).toHaveBeenCalledWith(
      '/system/sales/leads/results/page',
      {
        method: 'get',
        params: {
          pageNum: 1,
          pageSize: 10,
          taskStatus: 'completed',
          taskId: '2001',
        },
      },
    );
    expect(response.rows?.[0]).toMatchObject({
      profileId: '3001',
      contactId: '7001',
      taskName: 'Saudi valves',
      primaryDomain: 'example.com',
      fullName: 'Ahmed Ali',
      contactScore: 82,
      companyChannelCount: 2,
      contactEvidenceCount: 1,
    });
    expect(response.rows?.[0].contactChannels).toHaveLength(2);
    expect(response.rows?.[0].companyChannels).toHaveLength(1);
    expect(response.rows?.[0].companyChannels[0]).toMatchObject({
      channelType: 'email',
      channelValue: 'sales@example.com',
      raw: {
        attributionStatus: 'company_level',
      },
    });
    expect(response.rows?.[0].contactChannels[0]).toMatchObject({
      channelType: 'email',
      channelValue: 'ahmed@example.com',
      verifiedStatus: 'format_valid',
    });
    expect(response.rows?.[0].contactChannels[1]).toMatchObject({
      channelType: 'linkedin',
      channelValue: 'https://linkedin.com/in/ahmed-ali',
    });
  });

  it('normalizes flattened sales lead company-only result rows', () => {
    const row = normalizeSalesLeadResult({
      profile_id: '3002',
      task_status: 'completed',
      primary_domain: 'company-only.com',
      display_name: 'Company Only',
      decision: 'uncertain',
      fit_score: 55,
      company_review_status: 'pending',
      company_channel_count: 3,
      company_channels: [
        {
          id: '8002',
          profile_id: '3002',
          channel_type: 'email',
          channel_value: 'john@company-only.com',
          normalized_value: 'john@company-only.com',
          confidence: 55,
          verified_status: 'format_valid',
          reason:
            '疑似个人邮箱，但未发现明确姓名或职位，先作为公司待归属渠道保留',
          raw: {
            ownerScope: 'company',
            attributionStatus: 'unassigned_personal_like',
          },
        },
      ],
      evidence_count: 4,
    });

    expect(row).toBeDefined();
    if (!row) throw new Error('missing normalized lead result');
    expect(row).toMatchObject({
      profileId: '3002',
      contactId: undefined,
      primaryDomain: 'company-only.com',
      displayName: 'Company Only',
      fitScore: 55,
      companyReviewStatus: 'pending',
      companyChannelCount: 3,
      evidenceCount: 4,
    });
    expect(row.companyChannels[0]).toMatchObject({
      channelType: 'email',
      channelValue: 'john@company-only.com',
      raw: {
        attributionStatus: 'unassigned_personal_like',
      },
    });
  });

  it('normalizes account contact provider usage ledger fields', () => {
    const detail = normalizeSalesAccountContacts({
      profile_id: '3001',
      provider_usage_summary: {
        event_count: 3,
        executed_requests: 1,
        billable_requests: 1,
        cache_hit_count: 1,
        skip_count: 1,
        budget_skip_count: 1,
        error_count: 0,
        providers: [
          {
            provider: 'hunter',
            event_count: 3,
            executed_requests: 1,
            billable_requests: 1,
            cache_hit_count: 1,
            skip_count: 1,
          },
        ],
      },
      discovery_outcome: {
        status: 'provider_no_result',
        label: '已增强无联系人',
        description: '已调用外部数据源，但未返回满足入库规则的联系人',
        provider_attempted: true,
        cache_only: false,
        has_company_channels: true,
      },
      provider_usage_events: [
        {
          provider: 'hunter',
          endpoint: 'domain_search',
          object_key: 'example.com',
          status: 'success',
          unit_count: 1,
          unit_type: 'request',
          billable: true,
        },
      ],
    });

    expect(detail).toBeDefined();
    if (!detail) throw new Error('missing normalized account contacts');
    expect(detail.providerUsageSummary).toMatchObject({
      eventCount: 3,
      executedRequests: 1,
      billableRequests: 1,
      cacheHitCount: 1,
      skipCount: 1,
      budgetSkipCount: 1,
      errorCount: 0,
    });
    expect(detail.providerUsageSummary.providers[0]).toMatchObject({
      provider: 'hunter',
      executedRequests: 1,
    });
    expect(detail.discoveryOutcome).toMatchObject({
      status: 'provider_no_result',
      label: '已增强无联系人',
      providerAttempted: true,
      hasCompanyChannels: true,
    });
    expect(detail.providerUsageEvents[0]).toMatchObject({
      provider: 'hunter',
      endpoint: 'domain_search',
      objectKey: 'example.com',
      status: 'success',
      unitCount: 1,
      billable: true,
    });
  });

  it('normalizes lead evidence detail from archived evidence fields', () => {
    const detail = normalizeSalesLeadEvidenceDetail({
      profile: {
        id: '3001',
        primary_domain: 'example.com',
        review_status: 'pending',
      },
      summary: {
        evidence_count: 2,
        supported_count: 1,
        missing_required_count: 0,
      },
      requirement_coverages: [
        {
          requirement_id: 'req_product',
          requirement_text: '做工业阀门进口分销',
          judgment: 'supported',
          evidence_count: 1,
        },
      ],
      evidences: [
        {
          id: '4001',
          evidence_key: 'ev_1',
          requirement_id: 'req_product',
          judgment: 'supported',
          evidence_text: 'Distributor of industrial valves',
          source_url: 'https://example.com/products',
          query_text: 'industrial valve distributor Saudi',
        },
      ],
      sources: [
        {
          id: '5001',
          source_url: 'https://example.com/products',
          source_role: 'product_page',
          matched_terms: ['industrial valves'],
        },
      ],
      run_progress: {
        task_id: '2001',
        run_id: '1001',
        task_status: 'running',
        run_status: 'running',
        progress: 55,
        current_stage: 'evidence_extract',
        current_stage_label: '抽取证据',
        query_count: 3,
        result_count: 10,
        profile_count: 4,
        source_count: 5,
        evidence_count: 6,
        contact_count: 1,
        event_count: 2,
        recent_events: [
          {
            event_id: 'evt-1',
            event_type: 'progress',
            stage: 'evidence_extract',
            stage_label: '抽取证据',
            progress: 55,
            message: '正在抽取证据',
          },
        ],
      },
    });

    expect(detail?.profile.primaryDomain).toBe('example.com');
    expect(detail?.summary.evidenceCount).toBe(2);
    expect(detail?.summary.supportedCount).toBe(1);
    expect(detail?.requirementCoverages[0]).toMatchObject({
      requirementId: 'req_product',
      judgment: 'supported',
      evidenceCount: 1,
    });
    expect(detail?.evidences[0].sourceUrl).toBe('https://example.com/products');
    expect(detail?.sources[0].matchedTerms).toEqual(['industrial valves']);
    expect(detail?.runProgress).toMatchObject({
      taskId: '2001',
      runId: '1001',
      currentStage: 'evidence_extract',
      queryCount: 3,
      evidenceCount: 6,
      contactCount: 1,
    });
    expect(detail?.runProgress?.recentEvents[0]).toMatchObject({
      eventId: 'evt-1',
      stageLabel: '抽取证据',
    });
  });

  it('normalizes and queries sales task progress', async () => {
    const progress = normalizeSalesSearchRunProgress({
      task_id: '2001',
      task_name: 'Saudi valves',
      task_status: 'running',
      run_id: '1001',
      run_status: 'running',
      progress: 62,
      current_stage_label: '抽取证据',
      contact_count: 1,
      recent_events: [{ event_id: 'evt-1', event_type: 'progress' }],
    });
    expect(progress).toMatchObject({
      taskId: '2001',
      taskName: 'Saudi valves',
      progress: 62,
      currentStageLabel: '抽取证据',
      contactCount: 1,
    });

    jest.mocked(ruoyiRequest).mockResolvedValue({
      code: 200,
      msg: 'ok',
      data: {
        task_id: '2001',
        run_id: '1001',
        progress: 62,
        current_stage_label: '抽取证据',
        recent_events: [],
      },
    });

    const response = await getSalesTaskProgress('2001');

    expect(ruoyiRequest).toHaveBeenCalledWith(
      '/system/sales/tasks/2001/progress',
      {
        method: 'get',
      },
    );
    expect(response.data?.runId).toBe('1001');
    expect(response.data?.progress).toBe(62);
  });

  it('queries sales lead evidence detail by account profile id', async () => {
    jest.mocked(ruoyiRequest).mockResolvedValue({
      code: 200,
      msg: 'ok',
      data: {
        profile: {
          id: '3001',
          primary_domain: 'example.com',
          review_status: 'pending',
        },
        summary: {
          evidenceCount: 1,
        },
        requirementCoverages: [],
        evidences: [],
        sources: [],
      },
    });

    const response = await getSalesLeadEvidenceDetail('3001');

    expect(ruoyiRequest).toHaveBeenCalledWith('/system/sales/leads/3001', {
      method: 'get',
    });
    expect(response.data?.profile.primaryDomain).toBe('example.com');
    expect(response.data?.summary.evidenceCount).toBe(1);
  });
});
