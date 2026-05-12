import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import XMarkdown from '@ant-design/x-markdown';
import '@ant-design/x-markdown/es/XMarkdown/index.css';
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  message,
  Popconfirm,
  Spin,
  Tabs,
  Typography,
  Upload,
} from 'antd';
import type { Rule } from 'antd/es/form';
import type { UploadProps } from 'antd/es/upload';
import clsx from 'clsx';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addPersona,
  deletePersonas,
  getPersona,
  importPersona,
  listPersona,
  type PersonaForm,
  type PersonaItem,
  updatePersona,
} from '@/services/ruoyi/persona';
import PersonaIconSelect, { personaProfileIconSrc } from './PersonaIconSelect';
import PersonaMdEditor from './PersonaMdEditor';

const { Title, Text } = Typography;

const FILTER_TABS = [
  { key: 'all', label: '全部画像' },
  { key: '疏忽遗忘型', label: '疏忽遗忘型' },
  { key: '暂时困难型', label: '暂时困难型' },
  { key: '投诉挂碍型', label: '投诉挂碍型' },
  { key: '习惯性拖延/博弃型', label: '习惯性拖延/博弃型' },
  { key: '房屋空置型', label: '房屋空置型' },
  { key: '产权纠纷型', label: '产权纠纷型' },
  { key: '租赁希望型', label: '租赁希望型' },
  { key: '历史遗留问题型', label: '历史遗留问题型' },
  { key: '信息失联型', label: '信息失联型' },
] as const;

type FilterTabKey = (typeof FILTER_TABS)[number]['key'];

type DetailTabKey = 'classification' | 'traits' | 'dialogue' | 'keyword';

const DETAIL_TAB_ITEMS: { key: DetailTabKey; label: string }[] = [
  { key: 'classification', label: '核心区分规则' },
  { key: 'traits', label: '核心特征' },
  { key: 'dialogue', label: '沟通表现' },
  { key: 'keyword', label: '典型关键词与话术' },
];

const emptyForm: PersonaForm = {
  id: undefined,
  personaName: '',
  icon: '',
  traits: '',
  classification: '',
  keyword: '',
  dialogue: '',
  motivation: '',
  overview: '',
  tags: [],
  priority: '',
};

const CardMarkdownPreview = ({ content }: { content: string }) => (
  <div className="line-clamp-3 max-h-16 overflow-hidden text-zinc-500 [&_.markdown]:text-sm">
    <XMarkdown>{content || ''}</XMarkdown>
  </div>
);

const MarkdownFormField = ({
  name,
  label,
  placeholder,
  rules,
  height = 220,
}: {
  name: keyof PersonaForm;
  label: string;
  placeholder: string;
  rules: Rule[];
  height?: number;
}) => {
  const isRequired = rules.some((r) => 'required' in r && r.required);
  return (
    <Form.Item label={label} required={isRequired}>
      <Form.Item name={name} noStyle rules={rules}>
        <PersonaMdEditor placeholder={placeholder} height={height} />
      </Form.Item>
    </Form.Item>
  );
};

const PersonaPage = () => {
  const [form] = Form.useForm<PersonaForm>();
  const [profileList, setProfileList] = useState<PersonaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTabKey>('all');
  const [selectedProfile, setSelectedProfile] = useState<PersonaItem | null>(
    null,
  );
  const [activeDetailTab, setActiveDetailTab] =
    useState<DetailTabKey>('classification');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('新增画像');
  const [editingId, setEditingId] = useState<number | string | undefined>();
  const [submitLoading, setSubmitLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listPersona({ pageNum: 1, pageSize: 1000 });
      const rows = res.rows ?? [];
      setProfileList(rows);
    } catch {
      message.error('获取画像列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const filteredList = useMemo(() => {
    if (activeTab === 'all') return profileList;
    return profileList.filter((p) =>
      String(p.personaName ?? '').includes(activeTab),
    );
  }, [activeTab, profileList]);

  const openCreate = () => {
    setModalTitle('新增画像');
    setEditingId(undefined);
    form.setFieldsValue({ ...emptyForm });
    setModalOpen(true);
  };

  const openEdit = async (profile: PersonaItem) => {
    if (profile.id === undefined || profile.id === null) return;
    setModalTitle('编辑画像');
    setEditingId(profile.id);
    try {
      const res = await getPersona(profile.id);
      const data = res.data;
      form.setFieldsValue({
        id: data?.id,
        personaName: data?.personaName ?? '',
        icon: data?.icon ?? '',
        traits: data?.traits ?? '',
        classification: data?.classification ?? '',
        keyword: data?.keyword ?? '',
        dialogue: data?.dialogue ?? '',
        motivation: data?.motivation ?? '',
        overview: data?.overview ?? '',
        tags: data?.tags ?? [],
        priority: data?.priority ?? '',
      });
      setModalOpen(true);
    } catch {
      message.error('获取画像详情失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitLoading(true);
      const payload: PersonaForm = {
        ...emptyForm,
        ...values,
        tags: values.tags ?? [],
      };
      if (editingId !== undefined) {
        await updatePersona({ ...payload, id: editingId });
        message.success('编辑成功');
      } else {
        await addPersona(payload);
        message.success('新增成功');
      }
      setModalOpen(false);
      await fetchList();
      if (
        selectedProfile &&
        editingId !== undefined &&
        String(selectedProfile.id) === String(editingId)
      ) {
        try {
          const detail = await getPersona(editingId);
          if (detail.data) {
            setSelectedProfile(detail.data);
          }
        } catch {
          /* keep previous selection */
        }
      }
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'errorFields' in e) return;
      message.error('操作失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (profile: PersonaItem) => {
    if (profile.id === undefined || profile.id === null) return;
    try {
      await deletePersonas([profile.id]);
      message.success('删除成功');
      await fetchList();
      if (selectedProfile?.id === profile.id) {
        setSelectedProfile(null);
      }
    } catch {
      message.error('删除画像失败');
    }
  };

  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    const okType =
      file.type ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel';
    const okSize = file.size / 1024 / 1024 < 10;
    if (!okType) {
      message.error('只能上传 Excel 文件!');
      return Upload.LIST_IGNORE;
    }
    if (!okSize) {
      message.error('文件大小不能超过 10MB!');
      return Upload.LIST_IGNORE;
    }
    setUploadLoading(true);
    return true;
  };

  const customRequest: UploadProps['customRequest'] = async ({
    file,
    onSuccess,
    onError,
  }) => {
    try {
      const f = file as File;
      await importPersona(f);
      message.success('导入成功');
      setSelectedProfile(null);
      await fetchList();
      onSuccess?.({}, new XMLHttpRequest());
    } catch (err) {
      onError?.(err as Error);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleModalClose = () => {
    form.resetFields();
    setEditingId(undefined);
  };

  const selectProfile = (profile: PersonaItem) => {
    setSelectedProfile(profile);
    setActiveDetailTab('classification');
  };

  return (
    <PageContainer title="目标群体画像管理">
      <div className="flex flex-col gap-5 pb-8">
        <ProCard>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Title level={3} className="!mb-1 !mt-0">
                目标群体画像管理
              </Title>
              <Text type="secondary">
                管理债务人画像类型，支持预置画像和自定义画像
              </Text>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openCreate}
              >
                新增画像类型
              </Button>
              <Upload
                accept=".xlsx,.xls"
                showUploadList={false}
                beforeUpload={beforeUpload}
                customRequest={customRequest}
              >
                <Button
                  type="primary"
                  icon={<UploadOutlined />}
                  loading={uploadLoading}
                >
                  上传画像文档
                </Button>
              </Upload>
            </div>
          </div>
        </ProCard>

        <ProCard className="[&_.ant-pro-card-body]:pt-2">
          <Tabs
            activeKey={activeTab}
            onChange={(key) => {
              setActiveTab(key as FilterTabKey);
              setSelectedProfile(null);
            }}
            items={FILTER_TABS.map((t) => ({ key: t.key, label: t.label }))}
          />
        </ProCard>

        {selectedProfile ? (
          <ProCard
            title={selectedProfile.personaName}
            extra={
              <Button
                type="link"
                onClick={() => void openEdit(selectedProfile)}
              >
                编辑
              </Button>
            }
          >
            <Tabs
              activeKey={activeDetailTab}
              onChange={(k) => setActiveDetailTab(k as DetailTabKey)}
              items={DETAIL_TAB_ITEMS.map((tab) => {
                const md =
                  tab.key === 'classification'
                    ? selectedProfile.classification
                    : tab.key === 'traits'
                      ? selectedProfile.traits
                      : tab.key === 'dialogue'
                        ? selectedProfile.dialogue
                        : selectedProfile.keyword;
                return {
                  key: tab.key,
                  label: tab.label,
                  children: (
                    <div className="min-h-[120px] pt-2">
                      <XMarkdown>{String(md ?? '')}</XMarkdown>
                    </div>
                  ),
                };
              })}
            />
          </ProCard>
        ) : null}

        <ProCard>
          <Spin spinning={loading}>
            {filteredList.length === 0 ? (
              <Empty description="暂无画像数据" />
            ) : (
              <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]">
                {filteredList.map((profile) => {
                  const isActive = selectedProfile?.id === profile.id;
                  const iconName = String(profile.icon ?? '');
                  return (
                    <div key={String(profile.id)} className="relative">
                      <Card
                        hoverable
                        className={clsx(
                          'h-full cursor-pointer transition-all',
                          isActive &&
                            'border-primary ring-2 ring-primary/15 dark:ring-primary/25',
                        )}
                        styles={{ body: { padding: 0 } }}
                        onClick={() => selectProfile(profile)}
                      >
                        <div className="px-5 pb-14 pt-5">
                          <div className="mb-3 flex items-center gap-3">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#f0f7ff] dark:bg-blue-950/40">
                              {iconName ? (
                                <img
                                  alt=""
                                  src={personaProfileIconSrc(iconName)}
                                  width={28}
                                  height={28}
                                />
                              ) : null}
                            </div>
                            <Title level={5} ellipsis className="!mb-0 flex-1">
                              {profile.personaName}
                            </Title>
                          </div>
                          <CardMarkdownPreview
                            content={String(profile.traits ?? '')}
                          />
                        </div>
                        <div
                          className="absolute bottom-0 left-0 right-0 flex justify-end gap-3 border-0 border-t border-solid border-zinc-100 bg-zinc-50 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/60"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                          role="presentation"
                        >
                          <Button
                            type="text"
                            icon={<EditOutlined />}
                            aria-label="编辑"
                            onClick={() => void openEdit(profile)}
                          />
                          <Popconfirm
                            title="确定要删除该画像吗？"
                            okText="确定"
                            cancelText="取消"
                            onConfirm={() => void handleDelete(profile)}
                          >
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              aria-label="删除"
                            />
                          </Popconfirm>
                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>
            )}
          </Spin>
        </ProCard>
      </div>

      <Modal
        title={modalTitle}
        width={1040}
        destroyOnClose
        maskClosable={false}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          handleModalClose();
        }}
        onOk={() => void handleSubmit()}
        confirmLoading={submitLoading}
        okText="确定"
        cancelText="取消"
        styles={{ body: { maxHeight: 'min(85vh, 900px)', overflowY: 'auto' } }}
      >
        <Form
          form={form}
          layout="horizontal"
          labelCol={{ flex: '112px' }}
          wrapperCol={{ flex: 1 }}
          labelAlign="right"
          colon={false}
          preserve={false}
          className="pt-2"
          initialValues={emptyForm}
        >
          <Form.Item
            name="personaName"
            label="画像名称"
            rules={[
              { required: true, message: '请输入画像名称' },
              { min: 2, max: 20, message: '长度在 2 到 20 个字符' },
            ]}
          >
            <Input placeholder="请输入画像名称" maxLength={20} showCount />
          </Form.Item>

          <MarkdownFormField
            name="traits"
            label="核心特征"
            placeholder="请输入核心特征"
            rules={[
              { required: true, message: '请输入核心特征' },
              { max: 500, message: '长度不能超过 500 个字符' },
            ]}
          />

          <MarkdownFormField
            name="classification"
            label="核心区分规则"
            placeholder="请输入核心区分规则"
            rules={[]}
          />

          <MarkdownFormField
            name="keyword"
            label="关键词与话术"
            placeholder="请输入关键词与话术"
            rules={[]}
          />

          <MarkdownFormField
            name="dialogue"
            label="沟通表现"
            placeholder="请输入沟通表现"
            rules={[]}
          />

          <Form.Item name="icon" label="图标标识">
            <PersonaIconSelect />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default PersonaPage;
