import {
  DeleteOutlined,
  DownloadOutlined,
  DownOutlined,
  EditOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import XMarkdown from '@ant-design/x-markdown';
import {
  Button,
  Dropdown,
  Empty,
  Form,
  Input,
  Modal,
  message,
  Space,
  Spin,
  Tabs,
  Tooltip,
  Upload,
} from 'antd';
import type { UploadProps } from 'antd/es/upload';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MarkdownEditor from '@/components/MarkdownEditor';
import { RecovPage } from '@/modules/recov/components/RecovListLayout';
import {
  addPersona,
  deletePersonas,
  getPersona,
  importPersona,
  importPersonaTemplate,
  listPersona,
  type PersonaForm,
  type PersonaItem,
  updatePersona,
} from '@/modules/recov/services/persona';

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
  traits: '',
  classification: '',
  keyword: '',
  dialogue: '',
};

const saveBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const PersonaPage = () => {
  const [form] = Form.useForm<PersonaForm>();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();

  const [profileList, setProfileList] = useState<PersonaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('');
  const [activeDetailTab, setActiveDetailTab] =
    useState<DetailTabKey>('classification');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | string | undefined>();
  const [submitLoading, setSubmitLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  const activeTabRef = useRef('');
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const uploadTriggerRef = useRef<HTMLButtonElement | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listPersona({ pageNum: 1, pageSize: 1000 });
      const rows = res.rows ?? [];
      setProfileList(rows);
      const exists = rows.some(
        (item) => String(item.id ?? '') === activeTabRef.current,
      );
      if (!exists) {
        const first = rows[0];
        setActiveTab(first?.id == null ? '' : String(first.id));
      }
    } catch {
      messageApi.error('获取画像列表失败');
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const selectedProfile = useMemo(() => {
    if (!activeTab) return null;
    return (
      profileList.find((item) => String(item.id ?? '') === activeTab) ?? null
    );
  }, [activeTab, profileList]);

  const profileTabItems = useMemo(
    () =>
      profileList.map((profile) => {
        const key = String(profile.id ?? '');
        return {
          key,
          label: (
            <span className="inline-block max-w-[160px] truncate align-bottom">
              {profile.personaName ?? '-'}
            </span>
          ),
        };
      }),
    [profileList],
  );

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setActiveDetailTab('classification');
  };

  const openCreate = () => {
    setEditingId(undefined);
    form.resetFields();
    form.setFieldsValue({ ...emptyForm });
    setModalOpen(true);
  };

  const openEdit = async (profile: PersonaItem) => {
    if (profile.id === undefined || profile.id === null) return;
    try {
      const res = await getPersona(profile.id);
      const data = res.data ?? {};
      setEditingId(profile.id);
      form.resetFields();
      form.setFieldsValue({
        id: data.id ?? profile.id,
        personaName: data.personaName ?? '',
        traits: data.traits ?? '',
        classification: data.classification ?? '',
        keyword: data.keyword ?? '',
        dialogue: data.dialogue ?? '',
      });
      setModalOpen(true);
    } catch {
      messageApi.error('获取画像详情失败');
    }
  };

  const handleSubmit = async () => {
    let values: PersonaForm;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSubmitLoading(true);
    try {
      const payload: PersonaForm = {
        personaName: values.personaName?.trim() ?? '',
        traits: values.traits ?? '',
        classification: values.classification ?? '',
        keyword: values.keyword ?? '',
        dialogue: values.dialogue ?? '',
      };
      if (editingId !== undefined) {
        await updatePersona({ ...payload, id: editingId });
        messageApi.success('编辑成功');
      } else {
        await addPersona(payload);
        messageApi.success('新增成功');
      }
      setModalOpen(false);
      setEditingId(undefined);
      form.resetFields();
      await fetchList();
    } catch {
      // request adapter 已统一弹错
    } finally {
      setSubmitLoading(false);
    }
  };

  const performDelete = async (profile: PersonaItem) => {
    if (profile.id === undefined || profile.id === null) return;
    try {
      await deletePersonas([profile.id]);
      messageApi.success('删除成功');
      if (activeTabRef.current === String(profile.id)) {
        setActiveTab('');
      }
      await fetchList();
    } catch {
      // request adapter 已统一弹错
    }
  };

  const confirmDelete = (profile: PersonaItem) => {
    modalApi.confirm({
      title: '删除画像',
      content: `确认删除画像「${profile.personaName ?? '-'}」吗？将删除画像编号 ${profile.id ?? '-'} 的数据，操作不可恢复。`,
      okText: '确认删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      autoFocusButton: 'cancel',
      onOk: () => performDelete(profile),
    });
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await importPersonaTemplate();
      saveBlob(blob, '用户画像配置导入模板.xlsx');
      messageApi.success('模板下载成功');
    } catch {
      messageApi.error('下载模板失败');
    }
  };

  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    const okType =
      file.type ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel';
    const okSize = file.size / 1024 / 1024 < 10;
    if (!okType) {
      messageApi.error('只能上传 Excel 文件!');
      return Upload.LIST_IGNORE;
    }
    if (!okSize) {
      messageApi.error('文件大小不能超过 10MB!');
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
      await importPersona(file as File);
      messageApi.success('导入成功');
      await fetchList();
      onSuccess?.({}, new XMLHttpRequest());
    } catch (err) {
      onError?.(err as Error);
    } finally {
      setUploadLoading(false);
    }
  };

  const pageActions = (
    <Space wrap size={8}>
      <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
        新增画像类型
      </Button>
      <Dropdown
        trigger={['click']}
        menu={{
          items: [
            {
              key: 'download',
              icon: <DownloadOutlined />,
              label: '下载模板',
            },
            {
              key: 'upload',
              icon: <UploadOutlined />,
              label: '上传画像文档',
            },
          ],
          onClick: ({ key }) => {
            if (key === 'download') {
              void handleDownloadTemplate();
            } else if (key === 'upload') {
              uploadTriggerRef.current?.click();
            }
          },
        }}
      >
        <Button loading={uploadLoading}>
          <Space size={4}>
            <UploadOutlined />
            导入
            <DownOutlined />
          </Space>
        </Button>
      </Dropdown>
      <Upload
        accept=".xlsx,.xls"
        showUploadList={false}
        beforeUpload={beforeUpload}
        customRequest={customRequest}
        style={{ display: 'none' }}
      >
        <button
          ref={uploadTriggerRef}
          type="button"
          aria-hidden
          style={{ display: 'none' }}
        />
      </Upload>
    </Space>
  );

  return (
    <RecovPage
      breadcrumbRender={false}
      title="目标群体画像管理"
      extra={pageActions}
    >
      {messageContextHolder}
      {modalContextHolder}
      <div className="flex flex-col gap-4 pb-4">
        <ProCard className="min-w-0 overflow-hidden">
          <Spin spinning={loading}>
            {profileList.length > 0 ? (
              <Tabs
                activeKey={activeTab}
                items={profileTabItems}
                more={{ trigger: 'click' }}
                onChange={handleTabChange}
                tabBarStyle={{ marginBottom: 0 }}
                style={{ maxWidth: '100%' }}
              />
            ) : (
              <div className="pb-4 pt-6">
                <Empty description="暂无画像数据" />
              </div>
            )}
          </Spin>
        </ProCard>

        {profileList.length > 0 ? (
          <ProCard
            className="min-w-0"
            title="画像配置详情"
            extra={
              selectedProfile ? (
                <Space size={4}>
                  <Tooltip title="编辑">
                    <Button
                      type="text"
                      shape="circle"
                      aria-label="编辑"
                      icon={<EditOutlined />}
                      onClick={() => void openEdit(selectedProfile)}
                    />
                  </Tooltip>
                  <Tooltip title="删除">
                    <Button
                      type="text"
                      shape="circle"
                      danger
                      aria-label="删除"
                      icon={<DeleteOutlined />}
                      onClick={() => confirmDelete(selectedProfile)}
                    />
                  </Tooltip>
                </Space>
              ) : null
            }
          >
            <Spin spinning={loading}>
              {selectedProfile ? (
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
                        <div className="min-h-[360px] rounded-md bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-700">
                          <XMarkdown>{String(md ?? '')}</XMarkdown>
                        </div>
                      ),
                    };
                  })}
                />
              ) : (
                <div className="pb-4 pt-6">
                  <Empty description="请选择画像类型" />
                </div>
              )}
            </Spin>
          </ProCard>
        ) : null}
      </div>

      <Modal
        title={editingId !== undefined ? '编辑画像' : '新增画像'}
        width="90%"
        style={{ top: 24, maxWidth: 1200 }}
        destroyOnHidden
        mask={{ closable: false }}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingId(undefined);
          form.resetFields();
        }}
        onOk={() => void handleSubmit()}
        confirmLoading={submitLoading}
        okText="确定"
        cancelText="取消"
        styles={{
          body: { maxHeight: 'calc(90vh - 110px)', overflowY: 'auto' },
        }}
      >
        <Form
          form={form}
          layout="vertical"
          preserve={false}
          initialValues={emptyForm}
          className="pt-2"
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

          <Form.Item
            name="classification"
            label="核心区分规则"
            rules={[
              { required: true, message: '请输入核心区分规则' },
              { max: 1000, message: '长度不能超过 1000 个字符' },
            ]}
          >
            <MarkdownEditor placeholder="请输入核心区分规则" height={250} />
          </Form.Item>

          <Form.Item
            name="traits"
            label="核心特征"
            rules={[
              { required: true, message: '请输入核心特征' },
              { max: 1000, message: '长度不能超过 1000 个字符' },
            ]}
          >
            <MarkdownEditor placeholder="请输入核心特征" height={250} />
          </Form.Item>

          <Form.Item
            name="keyword"
            label="关键词与话术"
            rules={[
              { required: true, message: '请输入关键词与话术' },
              { max: 1000, message: '长度不能超过 1000 个字符' },
            ]}
          >
            <MarkdownEditor placeholder="请输入关键词与话术" height={250} />
          </Form.Item>

          <Form.Item
            name="dialogue"
            label="沟通表现"
            rules={[
              { required: true, message: '请输入沟通表现' },
              { max: 1000, message: '长度不能超过 1000 个字符' },
            ]}
          >
            <MarkdownEditor placeholder="请输入沟通表现" height={250} />
          </Form.Item>
        </Form>
      </Modal>
    </RecovPage>
  );
};

export default PersonaPage;
