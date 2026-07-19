import { ProCard } from '@ant-design/pro-components';
import {
  Button,
  Empty,
  Form,
  InputNumber,
  Modal,
  message,
  Pagination,
  Popover,
  Select,
  Spin,
  Tabs,
  Tag,
  theme,
} from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRuoyiDict } from '@/hooks/useRuoyiDict';
import { RecovPage } from '@/modules/recov/components/RecovListLayout';
import {
  type ConcurrencyConfigVo,
  getConcurrencyConfig,
  getVoiceConfigList,
  getVoiceLibraryPage,
  type SaveConfigDTO,
  saveConfig,
  type VoiceConfigVo,
  type VoiceLibraryItem,
} from '@/modules/recov/services/voice';
import {
  buildVoiceQuery,
  defaultConcurrencyForm,
  getVoiceAvatarBg,
  getVoiceGenderLabel,
  getVoiceGenderTagStyle,
  isConcurrencySnapshotEqual,
  RETRY_INTERVAL_FALLBACK_OPTIONS,
  VOICE_TAB_OPTIONS,
  type VoiceListTab,
} from './_shared';
import IdentityConfigCard from './IdentityConfigCard';

const VOICE_PAGE_SIZE = 18;

const VoiceEngineConfigPage = () => {
  const { token } = theme.useToken();
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

  const [voiceTab, setVoiceTab] = useState<VoiceListTab>('男');
  const [voicePageNum, setVoicePageNum] = useState(1);
  const [voiceList, setVoiceList] = useState<VoiceLibraryItem[]>([]);
  const [voiceTotal, setVoiceTotal] = useState(0);
  const [loadingVoice, setLoadingVoice] = useState(false);
  const voiceRequestSeqRef = useRef(0);
  const voiceGenderTagStyle = useMemo(
    () =>
      getVoiceGenderTagStyle({
        colorPrimary: token.colorPrimary,
        colorPrimaryBg: token.colorPrimaryBg,
        colorPrimaryBorder: token.colorPrimaryBorder,
      }),
    [token.colorPrimary, token.colorPrimaryBg, token.colorPrimaryBorder],
  );
  const voiceTabItems = useMemo(
    () =>
      VOICE_TAB_OPTIONS.map((item) => ({
        key: item.value,
        label: item.label,
      })),
    [],
  );

  const [identityList, setIdentityList] = useState<VoiceConfigVo[]>([]);
  const [allVoiceOptions, setAllVoiceOptions] = useState<VoiceLibraryItem[]>(
    [],
  );
  const [loadingIdentity, setLoadingIdentity] = useState(false);

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
    void fetchVoiceList('男', 1);
    void fetchIdentityList();
  }, [fetchConcurrencyConfig, fetchVoiceList, fetchIdentityList]);

  const handleConcurrencyValuesChange = (
    _changed: Partial<ConcurrencyConfigVo>,
    all: ConcurrencyConfigVo,
  ) => {
    setConcurrencyCurrent((prev) => ({
      maxConcurrency:
        Number(all.maxConcurrency ?? prev.maxConcurrency) ||
        defaultConcurrencyForm.maxConcurrency,
      maxRetry: Number(all.maxRetry) || 0,
      retryInterval: Number(all.retryInterval) || 0,
    }));
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
      messageApi.success('重拨策略保存成功');
      setConcurrencyOriginal(concurrencyCurrent);
    } finally {
      setSavingConcurrency(false);
    }
  };

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
          <Tag className="shrink-0" styles={{ root: voiceGenderTagStyle }}>
            {getVoiceGenderLabel(voice.gender)}
          </Tag>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          {[
            { label: '语言', value: voice.language },
            { label: '音色性别', value: voice.gender },
          ].map((item) => (
            <div key={item.label} className="min-w-0">
              <div className="text-zinc-500">{item.label}</div>
              <div className="truncate font-medium text-zinc-800">
                {item.value || '-'}
              </div>
            </div>
          ))}
        </div>
        <div className="text-xs leading-5 text-zinc-500">
          {voice.description || '-'}
        </div>
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
                className="!mt-1 !text-[10px]"
                styles={{ root: voiceGenderTagStyle }}
              >
                {getVoiceGenderLabel(voice.gender)}
              </Tag>
            </div>
          </div>
        </div>
      </Popover>
    );
  };

  return (
    <RecovPage breadcrumbRender={false} title="语音引擎配置">
      {messageContextHolder}
      {modalContextHolder}
      <div className="flex flex-col gap-4 pb-4">
        <ProCard
          title="重拨策略"
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
              <div className="grid grid-cols-1 gap-x-8 gap-y-4 lg:grid-cols-2">
                <Form.Item
                  label="重拨间隔下限"
                  name="retryInterval"
                  rules={[{ required: true, message: '请选择重拨间隔' }]}
                >
                  <Select
                    options={retryIntervalOptions}
                    loading={retryIntervalDict.loading}
                    placeholder="请选择重拨间隔"
                    style={{ width: '100%' }}
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

        <ProCard title="音色资产库">
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
    </RecovPage>
  );
};

export default VoiceEngineConfigPage;
