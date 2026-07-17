import {
  ApiOutlined,
  ChromeOutlined,
  CloudOutlined,
  ContactsOutlined,
  DatabaseOutlined,
  FacebookOutlined,
  GlobalOutlined,
  GoogleOutlined,
  InstagramOutlined,
  LinkedinOutlined,
  RedditOutlined,
  SafetyOutlined,
  SearchOutlined,
  ShopOutlined,
  TikTokOutlined,
  WhatsAppOutlined,
  XOutlined,
  YoutubeOutlined,
  ZhihuOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { Alert, Empty, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { FC, ReactNode } from 'react';

type CapabilityItem = {
  key: string;
  name: string;
  status: string;
  statusColor: string;
  icon: ReactNode;
  description: string;
  output: string;
};

type PublicSourceItem = {
  key: string;
  name: string;
  type: string;
  icon: ReactNode;
  status: string;
  statusColor: string;
  description: string;
};

type LeadFieldItem = {
  key: string;
  field: string;
  category: string;
  categoryColor: string;
  display: string;
  displayColor: string;
  description: string;
};

type BoundaryItem = {
  key: string;
  ability: string;
  boundary: string;
  reason: string;
};

const coreCapabilities: CapabilityItem[] = [
  {
    key: 'web-search',
    name: '公开网页搜索',
    status: '系统能力',
    statusColor: 'blue',
    icon: <SearchOutlined />,
    description:
      '通过 Web Search Provider 返回公开网页结果，当前后端支持 Serper / Brave。',
    output: '候选公司、官网、目录页、新闻页、公开平台页',
  },
  {
    key: 'places',
    name: '地图 / 商户目录',
    status: '需配置 Key',
    statusColor: 'cyan',
    icon: <ShopOutlined />,
    description: '通过 Google Places 发现有地点属性的公司、门店和服务商。',
    output: '公司名、地址、电话、评分、分类、官网',
  },
  {
    key: 'official-site',
    name: '官网证据抓取',
    status: '系统能力',
    statusColor: 'green',
    icon: <GlobalOutlined />,
    description:
      '对候选公司的官网和可访问页面做抓取、快照、文本抽取和证据归档。',
    output: '业务摘要、匹配证据、公司级邮箱 / 电话',
  },
  {
    key: 'contact-public-search',
    name: '联系人公开搜索',
    status: '已接入',
    statusColor: 'geekblue',
    icon: <ContactsOutlined />,
    description:
      '公司画像归档后，对 LinkedIn 个人公开页做轻量搜索，只解析搜索结果标题、摘要和 URL。',
    output: '联系人姓名、职位、LinkedIn 个人页、联系人证据',
  },
  {
    key: 'hunter-enrichment',
    name: 'Hunter 邮箱增强',
    status: '需配置 Key',
    statusColor: 'purple',
    icon: <ApiOutlined />,
    description: '用于补全已识别联系人职业邮箱和验证状态，不验证公司公共邮箱。',
    output: '联系人邮箱、验证状态、数据源调用记录',
  },
];

const publicSources: PublicSourceItem[] = [
  {
    key: 'official-website',
    name: '公司官网',
    type: '主证据源',
    icon: <GlobalOutlined />,
    status: '直接抓取',
    statusColor: 'green',
    description: '用于确认公司身份、产品服务、市场范围和公开联系方式。',
  },
  {
    key: 'google-search',
    name: 'Google / 公开搜索结果',
    type: '搜索入口',
    icon: <GoogleOutlined />,
    status: '搜索命中',
    statusColor: 'blue',
    description: '作为公开网页索引来源，不等同于按平台逐个 API 深挖。',
  },
  {
    key: 'linkedin',
    name: 'LinkedIn 公开页',
    type: '公开平台页',
    icon: <LinkedinOutlined />,
    status: '可能命中公开页',
    statusColor: 'geekblue',
    description:
      '公司主页和个人页都可能经公开搜索命中；联系人阶段只解析个人公开页搜索结果，不登录抓取页面。',
  },
  {
    key: 'crunchbase',
    name: 'Crunchbase 公开页',
    type: '企业目录页',
    icon: <DatabaseOutlined />,
    status: '可能命中公开页',
    statusColor: 'purple',
    description: '适合作为公司背景辅助来源，当前未接 Crunchbase 专用 API。',
  },
  {
    key: 'yelp',
    name: 'Yelp 公开页',
    type: '商户目录页',
    icon: <ShopOutlined />,
    status: '可能命中公开页',
    statusColor: 'volcano',
    description:
      '可作为本地服务商目录来源，当前主目录能力由 Google Places 承担。',
  },
  {
    key: 'facebook',
    name: 'Facebook 公开页',
    type: '社交主页',
    icon: <FacebookOutlined />,
    status: '可能命中公开页',
    statusColor: 'blue',
    description: '仅处理公开可访问页面，不登录、不采集私域内容。',
  },
  {
    key: 'instagram',
    name: 'Instagram 公开页',
    type: '社交主页',
    icon: <InstagramOutlined />,
    status: '可能命中公开页',
    statusColor: 'magenta',
    description: '可记录公开主页来源，动态内容和登录后内容不作承诺。',
  },
  {
    key: 'x',
    name: 'Twitter / X 公开页',
    type: '社交主页',
    icon: <XOutlined />,
    status: '可能命中公开页',
    statusColor: 'default',
    description: '可作为公开主页或讨论线索来源，不作为联系人数据源。',
  },
  {
    key: 'youtube',
    name: 'YouTube 公开页',
    type: '内容平台',
    icon: <YoutubeOutlined />,
    status: '可能命中公开页',
    statusColor: 'red',
    description: '可作为品牌、案例或频道来源，当前不解析平台内部账号数据。',
  },
  {
    key: 'tiktok',
    name: 'TikTok 公开页',
    type: '内容平台',
    icon: <TikTokOutlined />,
    status: '可能命中公开页',
    statusColor: 'default',
    description: '只作为公开页面来源，不承诺动态内容完整抓取。',
  },
  {
    key: 'reddit',
    name: 'Reddit 公开页',
    type: '社区内容',
    icon: <RedditOutlined />,
    status: '可能命中公开页',
    statusColor: 'orange',
    description: '适合作为公开讨论线索，不作为公司身份确认主来源。',
  },
  {
    key: 'quora',
    name: 'Quora 公开页',
    type: '问答社区',
    icon: <ZhihuOutlined />,
    status: '可能命中公开页',
    statusColor: 'gold',
    description: '适合作为公开问答线索，不作为联系人或账号数据源。',
  },
  {
    key: 'whatsapp',
    name: 'WhatsApp 公开入口',
    type: '触达渠道',
    icon: <WhatsAppOutlined />,
    status: '公开出现时识别',
    statusColor: 'green',
    description:
      '不是独立数据源；官网、社媒页或目录页公开出现 WhatsApp 链接或号码时，可作为公司或联系人渠道。',
  },
  {
    key: 'news-directory',
    name: '新闻 / 博客 / 行业目录',
    type: '公开网页',
    icon: <ChromeOutlined />,
    status: '可能命中公开页',
    statusColor: 'lime',
    description: '用于补充公司业务、案例、资质和市场活动证据。',
  },
];

const leadFields: LeadFieldItem[] = [
  {
    key: 'company-name',
    field: '公司名称',
    category: '稳定字段',
    categoryColor: 'green',
    display: '默认展示',
    displayColor: 'blue',
    description:
      '由搜索结果、目录信息和官网证据共同确认，置信度不足时会保留待确认状态。',
  },
  {
    key: 'website',
    field: '官网',
    category: '稳定字段',
    categoryColor: 'green',
    display: '默认展示',
    displayColor: 'blue',
    description: '用于识别公司身份和后续官网证据抓取。',
  },
  {
    key: 'registered-domain',
    field: '主域名',
    category: '稳定字段',
    categoryColor: 'green',
    display: '默认展示',
    displayColor: 'blue',
    description: '用于同一公司的候选合并、去重和来源归因。',
  },
  {
    key: 'business-summary',
    field: '业务摘要',
    category: '稳定字段',
    categoryColor: 'green',
    display: '默认展示',
    displayColor: 'blue',
    description: '基于公开页面和证据生成的公司级业务概括。',
  },
  {
    key: 'decision',
    field: '匹配判断 / 匹配理由',
    category: '稳定字段',
    categoryColor: 'green',
    display: '默认展示',
    displayColor: 'blue',
    description: '展示系统对 ICP 的候选、待确认、排除等判断和理由。',
  },
  {
    key: 'review-status',
    field: '人工审核状态',
    category: '稳定字段',
    categoryColor: 'green',
    display: '默认展示',
    displayColor: 'blue',
    description: '用于线索台账里的确认、排除和待补证工作流。',
  },
  {
    key: 'source-type',
    field: '来源类型',
    category: '稳定字段',
    categoryColor: 'green',
    display: '默认展示',
    displayColor: 'blue',
    description: '例如官网、目录页、公开平台页、搜索结果页等来源角色。',
  },
  {
    key: 'email',
    field: '公司邮箱',
    category: '命中字段',
    categoryColor: 'cyan',
    display: '可选展示',
    displayColor: 'purple',
    description: '从公开官网或页面文本中抽取；没有公开出现时不会强行生成。',
  },
  {
    key: 'phone',
    field: '公司电话',
    category: '命中字段',
    categoryColor: 'cyan',
    display: '可选展示',
    displayColor: 'purple',
    description: '来自官网公开文本或 Google Places 等目录结果，可能为空。',
  },
  {
    key: 'address',
    field: '地址',
    category: '命中字段',
    categoryColor: 'cyan',
    display: '可选展示',
    displayColor: 'purple',
    description: '主要来自地图/商户目录或官网公开信息。',
  },
  {
    key: 'rating-category',
    field: '评分 / 分类',
    category: '命中字段',
    categoryColor: 'cyan',
    display: '可选展示',
    displayColor: 'purple',
    description: 'Google Places 命中时可展示评分、评论数、业务分类等信息。',
  },
  {
    key: 'source-url',
    field: '来源 URL',
    category: '结果明细',
    categoryColor: 'gold',
    display: '详情 / 导出',
    displayColor: 'default',
    description: '用于复核证据来源，列表可收纳，详情和导出中保留。',
  },
  {
    key: 'icp-coverage',
    field: 'ICP 覆盖',
    category: '结果明细',
    categoryColor: 'gold',
    display: '详情 / 导出',
    displayColor: 'default',
    description: '展示每个 ICP 条件的证据覆盖情况。',
  },
  {
    key: 'evidence',
    field: '证据片段 / 页面快照',
    category: '结果明细',
    categoryColor: 'gold',
    display: '详情 / 导出',
    displayColor: 'default',
    description: '用于解释为什么保留或排除该候选公司。',
  },
  {
    key: 'contact-person',
    field: '联系人 / 部门 / 岗位',
    category: '联系人阶段',
    categoryColor: 'geekblue',
    display: '联系人列表',
    displayColor: 'blue',
    description:
      '公司画像归档后进入联系人发现；只有明确人名或个人主页/个人职位证据的人才进入联系人表。',
  },
  {
    key: 'mobile-account',
    field: '手机号 / 平台账号',
    category: '触达渠道',
    categoryColor: 'cyan',
    display: '命中时展示',
    displayColor: 'purple',
    description:
      '能归属到明确联系人时展示为联系人渠道；只有公司级公开入口时展示为公司渠道。',
  },
];

const boundaryItems: BoundaryItem[] = [
  {
    key: 'platform-api',
    ability: '平台专用 API 深挖',
    boundary: '不作为默认能力',
    reason:
      '当前保留公开搜索可能命中的平台页，不按 LinkedIn、Crunchbase、Facebook 等平台逐个接专用 API。',
  },
  {
    key: 'login-content',
    ability: '登录后内容 / 私域内容',
    boundary: '不承诺',
    reason: '涉及登录态、平台规则、反爬和合规授权，不能作为默认公开来源。',
  },
  {
    key: 'contact-enrichment',
    ability: '联系人、岗位、手机号、平台账号补全',
    boundary: '联系人阶段处理',
    reason:
      '联系人和个人渠道不混入公司 fitScore；必须有明确人名或个人主页/职位证据才进入联系人表。',
  },
  {
    key: 'whatsapp',
    ability: 'WhatsApp',
    boundary: '不是数据源',
    reason:
      '它是联系方式或触达渠道，只有公开页面出现时才可能作为联系方式被识别。',
  },
];

const boundaryColumns: ColumnsType<BoundaryItem> = [
  {
    title: '能力项',
    dataIndex: 'ability',
    width: 220,
  },
  {
    title: '当前边界',
    dataIndex: 'boundary',
    width: 180,
    render: (value: string) => <Tag color="orange">{value}</Tag>,
  },
  {
    title: '说明',
    dataIndex: 'reason',
  },
];

const leadFieldColumns: ColumnsType<LeadFieldItem> = [
  {
    title: '字段',
    dataIndex: 'field',
    width: 190,
  },
  {
    title: '字段类型',
    dataIndex: 'category',
    width: 130,
    render: (value: string, record) => (
      <Tag color={record.categoryColor}>{value}</Tag>
    ),
  },
  {
    title: '展示口径',
    dataIndex: 'display',
    width: 140,
    render: (value: string, record) => (
      <Tag color={record.displayColor}>{value}</Tag>
    ),
  },
  {
    title: '说明',
    dataIndex: 'description',
  },
];

const SalesSourceCoveragePage: FC = () => (
  <PageContainer breadcrumbRender={false} title="来源与字段覆盖">
    <div className="flex flex-col gap-4">
      <Alert
        showIcon
        icon={<SafetyOutlined />}
        type="info"
        message="来源与字段覆盖是只读能力说明，不是任务执行配置。"
        description="任务会按系统策略尽量采集公司和联系人阶段的可用信息；来源名称用于结果归因，字段说明用于列表和导出口径，不代表登录内容采集或平台专用 API 深挖。"
      />

      <section className="rounded-lg border border-solid border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-[var(--ant-color-text)]">
              核心采集入口
            </div>
            <div className="mt-1 text-sm text-[var(--ant-color-text-secondary)]">
              这些入口会影响候选发现、证据抓取和联系人增强链路。
            </div>
          </div>
          <Tag icon={<ApiOutlined />} color="blue">
            系统策略
          </Tag>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {coreCapabilities.map((item) => (
            <div
              key={item.key}
              className="flex min-h-[172px] flex-col justify-between rounded-md border border-solid border-[var(--ant-color-border-secondary)] px-4 py-3"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <Space size={10}>
                    <span className="text-xl text-[var(--ant-color-primary)]">
                      {item.icon}
                    </span>
                    <span className="font-semibold text-[var(--ant-color-text)]">
                      {item.name}
                    </span>
                  </Space>
                  <Tag color={item.statusColor}>{item.status}</Tag>
                </div>
                <div className="mt-3 text-sm leading-6 text-[var(--ant-color-text-secondary)]">
                  {item.description}
                </div>
              </div>
              <div className="mt-3 rounded-md bg-[var(--ant-color-fill-quaternary)] px-3 py-2 text-sm text-[var(--ant-color-text)]">
                {item.output}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-solid border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] p-4">
        <div className="mb-4">
          <div className="text-base font-semibold text-[var(--ant-color-text)]">
            可归因的公开来源
          </div>
          <div className="mt-1 text-sm text-[var(--ant-color-text-secondary)]">
            这些来源可能通过公开网页搜索命中并记录在结果中，不作为独立 API
            开关。
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {publicSources.map((source) => (
            <div
              key={source.key}
              className="min-h-[138px] rounded-md border border-solid border-[var(--ant-color-border-secondary)] px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <Space size={10}>
                  <span className="text-xl text-[var(--ant-color-text-secondary)]">
                    {source.icon}
                  </span>
                  <div>
                    <div className="font-semibold text-[var(--ant-color-text)]">
                      {source.name}
                    </div>
                    <div className="mt-1 text-xs text-[var(--ant-color-text-tertiary)]">
                      {source.type}
                    </div>
                  </div>
                </Space>
                <Tag color={source.statusColor}>{source.status}</Tag>
              </div>
              <div className="mt-3 text-sm leading-6 text-[var(--ant-color-text-secondary)]">
                {source.description}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-solid border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-[var(--ant-color-text)]">
              线索字段覆盖
            </div>
            <div className="mt-1 text-sm text-[var(--ant-color-text-secondary)]">
              字段池用于后续列表展示和 Excel
              导出选择，不控制采集链路；未选字段仍会照常采集和归档。
            </div>
          </div>
          <Tag icon={<DatabaseOutlined />} color="green">
            展示 / 导出口径
          </Tag>
        </div>
        <Table<LeadFieldItem>
          rowKey="key"
          columns={leadFieldColumns}
          dataSource={leadFields}
          pagination={false}
          size="middle"
          scroll={{ x: 960 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无字段说明"
              />
            ),
          }}
        />
      </section>

      <section className="rounded-lg border border-solid border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-[var(--ant-color-text)]">
              能力边界
            </div>
            <div className="mt-1 text-sm text-[var(--ant-color-text-secondary)]">
              避免把公开网页来源误解成平台私域采集或专用 API 深挖。
            </div>
          </div>
          <Tag icon={<CloudOutlined />} color="default">
            公开网页优先
          </Tag>
        </div>
        <Table<BoundaryItem>
          rowKey="key"
          columns={boundaryColumns}
          dataSource={boundaryItems}
          pagination={false}
          size="middle"
          scroll={{ x: 860 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无边界说明"
              />
            ),
          }}
        />
      </section>
    </div>
  </PageContainer>
);

export default SalesSourceCoveragePage;
