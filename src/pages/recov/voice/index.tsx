import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import {
  Button,
  Col,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  message,
  Pagination,
  Popover,
  Row,
  Select,
  Slider,
  Spin,
  Tabs,
  Tag,
  Tooltip,
} from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDeleteConfirm } from '@/hooks/useDeleteConfirm';
import { useRuoyiDict } from '@/hooks/useRuoyiDict';
import {
  type AddVoiceDTO,
  addVoice,
  type ConcurrencyConfigVo,
  deleteVoices,
  getConcurrencyConfig,
  getVoiceConfigList,
  getVoiceLibraryPage,
  type SaveConfigDTO,
  saveConfig,
  updateVoice,
  type VoiceConfigVo,
  type VoiceLibraryItem,
} from '@/services/ruoyi/voice';
import {
  buildVoiceQuery,
  defaultConcurrencyForm,
  defaultVoiceForm,
  getVoiceAvatarBg,
  getVoiceGenderLabel,
  getVoiceGenderTagColor,
  isConcurrencySnapshotEqual,
  RETRY_INTERVAL_FALLBACK_OPTIONS,
  VOICE_TAB_OPTIONS,
  type VoiceFormState,
  type VoiceListTab,
} from './_shared';
import IdentityConfigCard from './IdentityConfigCard';

type VoiceDialogMode = 'add' | 'edit';

const sliderPercentTip = (value?: number) =>
  value === undefined ? '' : `${value}x`;

const VOICE_PAGE_SIZE = 18;

const VoiceEngineConfigPage = () => {
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();

  const retryIntervalDict = useRuoyiDict(
    'call_retry_interval',
    RETRY_INTERVAL_FALLBACK_OPTIONS.map((item) => ({
      label: item.label,
      value: item.value,
      raw: {
        dictLabel: item.label,
        dictValue: item.value,
      },
    })),
  );

  const retryIntervalOptions = useMemo(
    () =>
      retryIntervalDict.options.map((item) => ({
        label: item.label,
        value: Number(item.value),
      })),
    [retryIntervalDict.options],
  );

  const [concurrencyForm] = Form.useForm<ConcurrencyConfigVo>();
  const [concurrencyLoading, setConcurrencyLoading] = useState(false);
  const [savingConcurrency, setSavingConcurrency] = useState(false);
  const [concurrencyCurrent, setConcurrencyCurrent] =
    useState<ConcurrencyConfigVo>(defaultConcurrencyForm);
  const [concurrencyOriginal, setConcurrencyOriginal] =
    useState<ConcurrencyConfigVo>(defaultConcurrencyForm);

  const isConcurrencyDirty = useMemo(
    () => !isConcurrencySnapshotEqual(concurrencyCurrent, concurrencyOriginal),
    [concurrencyCurrent, concurrencyOriginal],
  );

  const [voiceTab, setVoiceTab] = useState<VoiceListTab>('MALE');
  const [voicePageNum, setVoicePageNum] = useState(1);
  const [voiceList, setVoiceList] = useState<VoiceLibraryItem[]>([]);
  const [voiceTotal, setVoiceTotal] = useState(0);
  const [loadingVoice, setLoadingVoice] = useState(false);
  const voiceRequestSeqRef = useRef(0);
  const voiceTabItems = useMemo(
    () =>
      VOICE_TAB_OPTIONS.map((item) => ({
        key: item.value,
        label: item.label,
      })),
    [],
  );

  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const [voiceDialogMode, setVoiceDialogMode] =
    useState<VoiceDialogMode>('add');
  const [voiceEditId, setVoiceEditId] = useState<string | null>(null);
  const [savingVoice, setSavingVoice] = useState(false);
  const [voiceForm] = Form.useForm<VoiceFormState>();

  const [identityList, setIdentityList] = useState<VoiceConfigVo[]>([]);
  const [allVoiceOptions, setAllVoiceOptions] = useState<VoiceLibraryItem[]>(
    [],
  );
  const [loadingIdentity, setLoadingIdentity] = useState(false);

  const confirmDelete = useDeleteConfirm({ modal: modalApi, messageApi });

  const fetchConcurrencyConfig = useCallback(async () => {
    setConcurrencyLoading(true);
    try {
      const res = await getConcurrencyConfig();
      const next: ConcurrencyConfigVo = {
        maxConcurrency:
          Number(res.data?.maxConcurrency) ||
          defaultConcurrencyForm.maxConcurrency,
        maxRetry: Number(res.data?.maxRetry) || defaultConcurrencyForm.maxRetry,
        retryInterval:
          Number(res.data?.retryInterval) ||
          defaultConcurrencyForm.retryInterval,
      };
      concurrencyForm.setFieldsValue(next);
      setConcurrencyCurrent(next);
      setConcurrencyOriginal(next);
    } finally {
      setConcurrencyLoading(false);
    }
  }, [concurrencyForm]);

  const fetchVoiceList = useCallback(
    async (tab: VoiceListTab, pageNum: number) => {
      voiceRequestSeqRef.current += 1;
      const seq = voiceRequestSeqRef.current;
      setLoadingVoice(true);
      try {
        const res = await getVoiceLibraryPage(
          buildVoiceQuery(tab, pageNum, VOICE_PAGE_SIZE),
        );
        if (seq !== voiceRequestSeqRef.current) return;
        setVoiceList(Array.isArray(res.rows) ? res.rows : []);
        setVoiceTotal(Number(res.total) || 0);
      } finally {
        if (seq === voiceRequestSeqRef.current) setLoadingVoice(false);
      }
    },
    [],
  );

  const fetchIdentityList = useCallback(async () => {
    setLoadingIdentity(true);
    try {
      const [configRes, voiceRes] = await Promise.all([
        getVoiceConfigList(),
        getVoiceLibraryPage({ pageNum: 1, pageSize: 999 }),
      ]);
      setIdentityList(Array.isArray(configRes.data) ? configRes.data : []);
      setAllVoiceOptions(Array.isArray(voiceRes.rows) ? voiceRes.rows : []);
    } finally {
      setLoadingIdentity(false);
    }
  }, []);

  useEffect(() => {
    void fetchConcurrencyConfig();
    void fetchVoiceList('MALE', 1);
    void fetchIdentityList();
  }, [fetchConcurrencyConfig, fetchVoiceList, fetchIdentityList]);

  const handleConcurrencyValuesChange = (
    _changed: Partial<ConcurrencyConfigVo>,
    all: ConcurrencyConfigVo,
  ) => {
    setConcurrencyCurrent({
      maxConcurrency: Number(all.maxConcurrency) || 0,
      maxRetry: Number(all.maxRetry) || 0,
      retryInterval: Number(all.retryInterval) || 0,
    });
  };

  const handleSaveConcurrency = async () => {
    try {
      await concurrencyForm.validateFields();
    } catch {
      return;
    }
    setSavingConcurrency(true);
    try {
      const payload: SaveConfigDTO = {
        maxConcurrency: concurrencyCurrent.maxConcurrency,
        maxRetry: concurrencyCurrent.maxRetry,
        retryInterval: concurrencyCurrent.retryInterval,
      };
      await saveConfig(payload);
      messageApi.success('并发与重拨策略保存成功');
      setConcurrencyOriginal(concurrencyCurrent);
    } finally {
      setSavingConcurrency(false);
    }
  };

  const confirmDiscardConcurrency = useCallback((): Promise<boolean> => {
    if (!isConcurrencyDirty) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      modalApi.confirm({
        title: '未保存修改',
        content:
          '当前并发与重拨策略有未保存修改，切换后会丢弃这些改动。是否继续切换？',
        okText: '继续切换',
        cancelText: '留在当前',
        autoFocusButton: 'cancel',
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  }, [isConcurrencyDirty, modalApi]);

  const handleVoiceTabChange = (next: VoiceListTab) => {
    if (next === voiceTab) return;
    setVoiceTab(next);
    setVoicePageNum(1);
    void fetchVoiceList(next, 1);
  };

  const handleVoicePageChange = (page: number) => {
    setVoicePageNum(page);
    void fetchVoiceList(voiceTab, page);
  };

  const openVoiceDialog = (mode: VoiceDialogMode, row?: VoiceLibraryItem) => {
    setVoiceDialogMode(mode);
    if (mode === 'edit' && row) {
      setVoiceEditId(row.id);
      voiceForm.setFieldsValue({
        voiceName: row.voiceName ?? '',
        baseVoiceId: row.baseVoiceId ?? '',
        gender: row.gender ?? '0',
        language: row.language ?? '',
        dialect: row.dialect ?? '',
        emotion: row.emotion ?? '',
        style: row.style ?? '',
        speechRate: Number.parseFloat(row.speechRate) || 1,
        pitch: Number.parseFloat(row.pitch) || 1,
        volume: Number(row.volume) || 0,
        description: row.description ?? '',
        sampleAudioUrl: row.sampleAudioUrl ?? '',
        isCustom: row.isCustom ?? '0',
      });
    } else {
      setVoiceEditId(null);
      voiceForm.setFieldsValue({ ...defaultVoiceForm });
    }
    setVoiceDialogOpen(true);
  };

  const closeVoiceDialog = () => {
    setVoiceDialogOpen(false);
    setVoiceEditId(null);
    voiceForm.resetFields();
    voiceForm.setFieldsValue({ ...defaultVoiceForm });
  };

  const handleSaveVoice = async () => {
    let values: VoiceFormState;
    try {
      values = await voiceForm.validateFields();
    } catch {
      return;
    }
    setSavingVoice(true);
    try {
      const payload: AddVoiceDTO = {
        ...defaultVoiceForm,
        ...values,
      };
      if (voiceDialogMode === 'add') {
        await addVoice(payload);
        messageApi.success('音色新增成功');
      } else {
        await updateVoice({ id: voiceEditId ?? undefined, ...payload });
        messageApi.success('音色修改成功');
      }
      setVoiceDialogOpen(false);
      setVoiceEditId(null);
      voiceForm.resetFields();
      voiceForm.setFieldsValue({ ...defaultVoiceForm });
      void fetchVoiceList(voiceTab, voicePageNum);
    } finally {
      setSavingVoice(false);
    }
  };

  const handleDeleteVoice = (voice: VoiceLibraryItem) => {
    confirmDelete({
      records: [voice],
      entityName: '音色',
      getName: (record) => record.voiceName,
      description: '此操作不可恢复。',
      onConfirm: async () => {
        await deleteVoices(voice.id);
      },
      onSuccess: () => {
        void fetchVoiceList(voiceTab, voicePageNum);
      },
    });
  };

  const renderVoiceCard = (voice: VoiceLibraryItem) => {
    const popoverContent = (
      <div className="w-[260px] space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-zinc-800">
              {voice.voiceName}
            </div>
            <div className="truncate text-[11px] text-zinc-500">
              {voice.baseVoiceId || '未配置基础音色'}
            </div>
          </div>
          <Tag
            color={getVoiceGenderTagColor(voice.gender)}
            className="shrink-0"
          >
            {getVoiceGenderLabel(voice.gender)}
          </Tag>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          {[
            { label: '语言', value: voice.language },
            { label: '方言', value: voice.dialect },
            { label: '情感', value: voice.emotion },
            { label: '风格', value: voice.style },
          ].map((item) => (
            <div key={item.label} className="min-w-0">
              <div className="text-zinc-500">{item.label}</div>
              <div className="truncate font-medium text-zinc-800">
                {item.value || '-'}
              </div>
            </div>
          ))}
        </div>
        <Tag color={voice.isCustom === '1' ? 'orange' : 'blue'}>
          {voice.isCustom === '1' ? '自定义' : '系统内置'}
        </Tag>
      </div>
    );
    return (
      <Popover
        key={voice.id}
        trigger="hover"
        placement="top"
        mouseEnterDelay={0.18}
        content={popoverContent}
      >
        <div className="group relative min-h-[112px] cursor-default rounded-xl border border-solid border-zinc-100 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex min-h-[78px] flex-col items-center justify-center gap-2 text-center">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl text-base font-bold text-white"
              style={{ backgroundColor: getVoiceAvatarBg(voice.gender) }}
            >
              {voice.voiceName?.charAt(0) || '音'}
            </div>
            <div className="w-full min-w-0">
              <div className="truncate text-sm font-semibold text-zinc-800">
                {voice.voiceName}
              </div>
              <Tag
                color={getVoiceGenderTagColor(voice.gender)}
                className="!mt-1 !text-[10px]"
              >
                {getVoiceGenderLabel(voice.gender)}
              </Tag>
            </div>
          </div>
          <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Tooltip title="编辑" placement="top">
              <Button
                size="small"
                shape="circle"
                icon={<EditOutlined />}
                onClick={(event) => {
                  event.stopPropagation();
                  openVoiceDialog('edit', voice);
                }}
              />
            </Tooltip>
            <Tooltip title="删除" placement="top">
              <Button
                size="small"
                shape="circle"
                danger
                icon={<DeleteOutlined />}
                onClick={(event) => {
                  event.stopPropagation();
                  handleDeleteVoice(voice);
                }}
              />
            </Tooltip>
          </div>
        </div>
      </Popover>
    );
  };

  return (
    <PageContainer breadcrumbRender={false} title="语音引擎配置">
      {messageContextHolder}
      {modalContextHolder}
      <div className="flex flex-col gap-4 pb-4">
        <ProCard
          title="并发与重拨策略"
          extra={
            isConcurrencyDirty ? (
              <Button
                type="primary"
                loading={savingConcurrency}
                onClick={() => void handleSaveConcurrency()}
              >
                保存配置
              </Button>
            ) : null
          }
        >
          <Spin spinning={concurrencyLoading}>
            <Form<ConcurrencyConfigVo>
              form={concurrencyForm}
              layout="vertical"
              requiredMark={false}
              initialValues={defaultConcurrencyForm}
              onValuesChange={handleConcurrencyValuesChange}
              className="[&_.ant-form-item]:!mb-0"
            >
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
                <Form.Item
                  label="外呼并发上限"
                  name="maxConcurrency"
                  rules={[{ required: true, message: '请输入外呼并发上限' }]}
                >
                  <InputNumber
                    min={1}
                    precision={0}
                    suffix="并发线路"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
                <Form.Item
                  label="重拨间隔下限"
                  name="retryInterval"
                  rules={[{ required: true, message: '请选择重拨间隔' }]}
                >
                  <Select
                    options={retryIntervalOptions}
                    loading={retryIntervalDict.loading}
                    placeholder="请选择重拨间隔"
                  />
                </Form.Item>
                <Form.Item
                  label="每节点重拨上限"
                  name="maxRetry"
                  rules={[{ required: true, message: '请输入每节点重拨上限' }]}
                >
                  <InputNumber
                    min={0}
                    precision={0}
                    suffix="次"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </div>
            </Form>
          </Spin>
        </ProCard>

        <ProCard
          title="音色资产库"
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={async () => {
                const canSwitch = await confirmDiscardConcurrency();
                if (!canSwitch) return;
                openVoiceDialog('add');
              }}
            >
              新增音色
            </Button>
          }
        >
          <div className="flex flex-col gap-4">
            <Tabs
              activeKey={voiceTab}
              items={voiceTabItems}
              onChange={(key) => handleVoiceTabChange(key as VoiceListTab)}
              tabBarGutter={28}
              className="[&_.ant-tabs-nav]:!mb-0"
            />
            <Spin spinning={loadingVoice}>
              <div className="min-h-[180px]">
                {!loadingVoice && voiceList.length === 0 ? (
                  <Empty
                    description="暂无音色"
                    styles={{ image: { height: 80 } }}
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
                    {voiceList.map(renderVoiceCard)}
                  </div>
                )}
              </div>
            </Spin>
            {voiceTotal > 0 ? (
              <div className="flex justify-end">
                <Pagination
                  current={voicePageNum}
                  pageSize={VOICE_PAGE_SIZE}
                  total={voiceTotal}
                  showSizeChanger={false}
                  onChange={handleVoicePageChange}
                />
              </div>
            ) : null}
          </div>
        </ProCard>

        <ProCard title="数字员工配置">
          <Spin spinning={loadingIdentity}>
            {identityList.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {identityList.map((item) => (
                  <IdentityConfigCard
                    key={item.identityName}
                    config={item}
                    voiceOptions={allVoiceOptions}
                    messageApi={messageApi}
                    modalApi={modalApi}
                    onRefresh={() => void fetchIdentityList()}
                  />
                ))}
              </div>
            ) : (
              <Empty
                description="暂无身份配置"
                styles={{ image: { height: 80 } }}
              />
            )}
          </Spin>
        </ProCard>
      </div>

      <Drawer
        title={voiceDialogMode === 'add' ? '新增音色' : '编辑音色'}
        size={560}
        open={voiceDialogOpen}
        destroyOnHidden
        onClose={closeVoiceDialog}
        footer={
          <div className="flex justify-end gap-3">
            <Button onClick={closeVoiceDialog}>取消</Button>
            <Button
              type="primary"
              loading={savingVoice}
              onClick={() => void handleSaveVoice()}
            >
              确定
            </Button>
          </div>
        }
      >
        <Form<VoiceFormState>
          form={voiceForm}
          layout="vertical"
          initialValues={defaultVoiceForm}
          preserve={false}
        >
          <Row gutter={[24, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="音色名称"
                name="voiceName"
                rules={[{ required: true, message: '请输入音色名称' }]}
              >
                <Input placeholder="请输入音色名称" maxLength={30} showCount />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="基础音色ID"
                name="baseVoiceId"
                rules={[{ required: true, message: '请输入基础音色ID' }]}
              >
                <Input placeholder="如 longxiaochun" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="性别"
                name="gender"
                rules={[{ required: true, message: '请选择性别' }]}
              >
                <Select
                  options={[
                    { label: '男声', value: '0' },
                    { label: '女声', value: '1' },
                    { label: '自定义', value: 'CUSTOM' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="语言" name="language">
                <Input placeholder="zh-CN" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="方言" name="dialect">
                <Input placeholder="普通话" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="情感" name="emotion">
                <Input placeholder="gentle" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="风格" name="style">
                <Input placeholder="温柔" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="语速" name="speechRate">
                <Slider
                  min={0.5}
                  max={2}
                  step={0.1}
                  tooltip={{ formatter: sliderPercentTip }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="音调" name="pitch">
                <Slider
                  min={0.5}
                  max={2}
                  step={0.1}
                  tooltip={{ formatter: sliderPercentTip }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="音量" name="volume">
                <Slider min={0} max={100} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="描述" name="description">
                <Input.TextArea
                  rows={2}
                  maxLength={200}
                  showCount
                  placeholder="音色描述"
                />
              </Form.Item>
            </Col>
            <Form.Item name="sampleAudioUrl" hidden>
              <Input />
            </Form.Item>
            <Form.Item name="isCustom" hidden>
              <Input />
            </Form.Item>
          </Row>
        </Form>
      </Drawer>
    </PageContainer>
  );
};

export default VoiceEngineConfigPage;
