import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  SalesIcpAttributePolicy,
  SalesIcpTemplate,
  SalesTask,
} from '@/modules/sales/services/sales';
import {
  buildDefaultTemplateItems,
  buildTaskCardView,
  buildTemplateCardView,
  getCardPreviewItems,
  getVisibleIcpAttributePolicies,
} from './viewModel';

const source = readFileSync(join(__dirname, 'index.tsx'), 'utf8');

const buildTask = (overrides: Partial<SalesTask> = {}): SalesTask => ({
  id: 1,
  taskName: '越南智能玩具生产商采集',
  templateId: 10,
  status: '1',
  canStart: true,
  missing: [],
  errorMessage: '',
  requirements: [
    {
      type: 'required',
      attributeName: '区域',
      text: '越南',
    },
    {
      type: 'preferred',
      attributeName: '行业',
      text: '智能玩具',
    },
  ],
  createTime: '2026-06-26 10:50:54',
  raw: {},
  ...overrides,
});

const buildTemplate = (
  overrides: Partial<SalesIcpTemplate> = {},
): SalesIcpTemplate => ({
  id: 11,
  tplName: '东南亚智能玩具出海 ICP 模板',
  description: '面向东南亚市场的智能硬件与玩具生产商筛选。',
  status: '1',
  items: [
    {
      attrSource: 'system',
      attrKey: 'market_scope',
      attrName: '区域',
      requirementType: 'required',
      matchMode: 'any',
      scoreWeight: 10,
      valueText: '越南',
      sortOrder: 1,
      enabled: true,
    },
    {
      attrSource: 'system',
      attrKey: 'product_or_service',
      attrName: '行业',
      requirementType: 'preferred',
      matchMode: 'all',
      scoreWeight: 10,
      valueText: '智能玩具',
      sortOrder: 2,
      enabled: true,
    },
  ],
  raw: {},
  ...overrides,
});

describe('sales ICP card view model', () => {
  it('builds task cards from task fields returned by current APIs', () => {
    const card = buildTaskCardView(buildTask());

    expect(card.title).toBe('越南智能玩具生产商采集');
    expect(card.statusText).toBe('待开始');
    expect(card.description).toContain('区域：越南');
    expect(card.tags).toEqual(['越南', '智能玩具']);
  });

  it('builds template cards from template fields returned by current APIs', () => {
    const card = buildTemplateCardView(buildTemplate());

    expect(card.title).toBe('东南亚智能玩具出海 ICP 模板');
    expect(card.description).toBe('面向东南亚市场的智能硬件与玩具生产商筛选。');
    expect(card.tags).toEqual(['越南', '智能玩具']);
  });

  it('limits preview chips so long interface payloads do not stretch cards', () => {
    expect(getCardPreviewItems(['A', 'B', 'C', 'D', 'E'])).toEqual([
      'A',
      'B',
      'C',
    ]);
  });
});

describe('sales ICP template policy view model', () => {
  const policies: SalesIcpAttributePolicy[] = [
    {
      key: 'market_scope',
      name: '目标市场',
      display: true,
      enabled: true,
      sortOrder: 20,
      scoreWeight: 15,
    },
    {
      key: 'product_or_service',
      name: '产品/服务/行业',
      display: '1',
      enabled: '1',
      sort_order: 10,
      required: true,
    },
    {
      key: 'hidden_policy',
      name: '隐藏属性',
      display: '0',
      enabled: '1',
      sortOrder: 30,
    },
    {
      key: 'disabled_policy',
      name: '停用属性',
      display: '1',
      enabled: '0',
      sortOrder: 40,
    },
    {
      name: '缺少 key 的属性',
      display: true,
      enabled: true,
      sortOrder: 50,
    },
  ];

  it('keeps only visible enabled built-in policies in configured order', () => {
    expect(
      getVisibleIcpAttributePolicies(policies).map((item) => item.key),
    ).toEqual(['product_or_service', 'market_scope']);
  });

  it('builds the default manual template rows from built-in policies', () => {
    expect(buildDefaultTemplateItems(policies)).toEqual([
      {
        attrSource: 'system',
        attrKey: 'product_or_service',
        attrName: '产品/服务/行业',
        requirementType: 'required',
        matchMode: 'all',
        scoreWeight: 10,
        valueText: '',
        sortOrder: 1,
        enabled: true,
      },
      {
        attrSource: 'system',
        attrKey: 'market_scope',
        attrName: '目标市场',
        requirementType: 'preferred',
        matchMode: 'all',
        scoreWeight: 15,
        valueText: '',
        sortOrder: 2,
        enabled: false,
      },
    ]);
  });
});

describe('sales ICP modeling page copy', () => {
  it('uses customer-facing wording and avoids unsupported first-screen entries', () => {
    expect(source).toContain('客户画像建模');
    expect(source).not.toContain('新建空白模板');
    expect(source).not.toContain('上传文件');
    expect(source).not.toContain('产品资料');
    expect(source).not.toContain('目标市场');
  });

  it('keeps the centered command layout and direct three-column card groups', () => {
    expect(source).toContain('max-w-[820px]');
    expect(source).not.toContain('xl:grid-cols-[minmax(0,1fr)_280px]');
    expect(source).not.toMatch(/>\s*T\s*<\/span>/);
    expect(source).not.toMatch(/>\s*M\s*<\/span>/);
    expect(source).not.toContain('展开任务与模板');
    expect(source.match(/lg:grid-cols-3/g)?.length || 0).toBeGreaterThanOrEqual(
      2,
    );
  });

  it('keeps a compact centered hero so first-screen cards are readable', () => {
    expect(source).toContain('min-h-[380px]');
    expect(source).not.toContain('min-h-[60vh]');
    expect(source).toContain('text-center');
    expect(source).toContain('shadow-[0_24px_64px_rgba(25,33,61,0.10)]');
    expect(source).toContain("style={{ padding: '20px 28px 12px' }}");
    expect(source).not.toContain('px-6 pb-2 pt-5');
    expect(source).toContain('border-dashed');
    expect(source).not.toContain(
      'col-span-full rounded-lg border border-solid',
    );
  });

  it('keeps recent task card titles single-line and exposes the full title on hover', () => {
    const taskCardStart = source.indexOf('visibleTaskCards.map');
    const taskCardEnd = source.indexOf('visibleTemplateCards.map');
    const taskCardSection = source.slice(taskCardStart, taskCardEnd);

    expect(source).toContain('Tooltip');
    expect(taskCardSection).toContain('<Tooltip title={card.title}>');
    expect(taskCardSection).toContain('truncate text-base font-semibold');
    expect(taskCardSection).not.toContain(
      'line-clamp-2 text-base font-semibold',
    );
  });

  it('uses the refined prototype actions for the hero and section headers', () => {
    expect(source).toContain('StarOutlined');
    expect(source).not.toContain('RobotOutlined');
    expect(source).toContain('icon={<StarOutlined />}');
    expect(source).toContain('type="link"');
    expect(source).not.toContain('查看任务详情或开启可搜索任务');
    expect(source).not.toContain('模板是稳定资产，可直接创建同类任务');
  });

  it('uses a stable compact empty state and keeps template cards action-light', () => {
    expect(source).toContain('min-h-[212px]');
    expect(source).toContain("renderCardEmptyState('暂无任务记录'");
    expect(source).toMatch(/renderCardEmptyState\(\s*'暂无客户画像模板'/);

    const templateCardStart = source.indexOf('visibleTemplateCards.map');
    const templateCardEnd = source.indexOf('description="暂无客户画像模板"');
    const templateCardSection = source.slice(
      templateCardStart,
      templateCardEnd,
    );

    expect(templateCardSection).not.toContain('TableActions');
    expect(templateCardSection).not.toContain('openEditEditor(template)');
    expect(templateCardSection).not.toContain('toggleTemplateStatus(template)');
  });
});
