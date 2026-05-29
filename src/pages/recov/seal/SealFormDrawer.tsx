import { WarningOutlined } from '@ant-design/icons';
import {
  Alert,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
} from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import { useEffect, useMemo, useState } from 'react';
import {
  addSeal,
  getSeal,
  getSealRange,
  type SealCode,
  type SealForm,
  type SealRangeVO,
  type SealTypeVO,
  updateSeal,
} from '@/services/ruoyi/seal';
import {
  computeRangeIssues,
  DEFAULT_SEAL_RANGE,
  defaultSealForm,
  hasAvailableSealRange,
  normalizeRangeBoundary,
  type UsedRangeRef,
} from './_shared';
import SealImageUpload from './SealImageUpload';

type SealFormDrawerProps = {
  open: boolean;
  mode: 'add' | 'edit';
  sealCode: SealCode;
  editingId?: number | string;
  sealTypeList: SealTypeVO[];
  sameTypeUsedRanges: UsedRangeRef[];
  onClose: () => void;
  onSaved: () => void;
  messageApi: MessageInstance;
};

type FormShape = {
  sealName: string;
  sealOssId: string;
  instrumentTypeCodes: string[];
  startNum: number | null;
  endNum: number | null;
};

const SealFormDrawer = ({
  open,
  mode,
  sealCode,
  editingId,
  sealTypeList,
  sameTypeUsedRanges,
  onClose,
  onSaved,
  messageApi,
}: SealFormDrawerProps) => {
  const [form] = Form.useForm<FormShape>();
  const [rangeInfo, setRangeInfo] = useState<SealRangeVO>(DEFAULT_SEAL_RANGE);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rangeValues, setRangeValues] = useState<{
    startNum: number | null;
    endNum: number | null;
  }>({ startNum: null, endNum: null });
  const [ownedRange, setOwnedRange] = useState<{
    startNum: number | null;
    endNum: number | null;
  }>({ startNum: null, endNum: null });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const init = async () => {
      setLoading(true);
      try {
        if (mode === 'edit' && editingId != null) {
          const [detailRes, rangeRes] = await Promise.all([
            getSeal(editingId),
            getSealRange(sealCode, editingId),
          ]);
          if (cancelled) return;
          const detail = detailRes.data;
          if (detail) {
            const next: FormShape = {
              sealName: detail.sealName ?? '',
              sealOssId:
                detail.sealOssId == null ? '' : String(detail.sealOssId),
              instrumentTypeCodes:
                detail.instrumentTypeCodeList ??
                detail.instrumentTypeCodes ??
                [],
              startNum: detail.startNum ?? null,
              endNum: detail.endNum ?? null,
            };
            form.setFieldsValue(next);
            setRangeValues({
              startNum: next.startNum,
              endNum: next.endNum,
            });
            setOwnedRange({
              startNum: next.startNum,
              endNum: next.endNum,
            });
          }
          setRangeInfo({
            usedRanges: rangeRes.data?.usedRanges ?? [],
            minAvailable: normalizeRangeBoundary(rangeRes.data?.minAvailable),
            maxAvailable: normalizeRangeBoundary(rangeRes.data?.maxAvailable),
          });
        } else {
          form.resetFields();
          const empty = defaultSealForm(sealCode);
          form.setFieldsValue({
            sealName: empty.sealName,
            sealOssId: empty.sealOssId,
            instrumentTypeCodes: empty.instrumentTypeCodes,
            startNum: empty.startNum ?? null,
            endNum: empty.endNum ?? null,
          });
          setRangeValues({ startNum: null, endNum: null });
          setOwnedRange({ startNum: null, endNum: null });
          const rangeRes = await getSealRange(sealCode);
          if (cancelled) return;
          setRangeInfo({
            usedRanges: rangeRes.data?.usedRanges ?? [],
            minAvailable: normalizeRangeBoundary(rangeRes.data?.minAvailable),
            maxAvailable: normalizeRangeBoundary(rangeRes.data?.maxAvailable),
          });
        }
      } catch {
        if (!cancelled) {
          setRangeInfo(DEFAULT_SEAL_RANGE);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [open, mode, editingId, sealCode, form]);

  const rangeAvailable = hasAvailableSealRange(rangeInfo);
  const ownedRangeAvailable =
    mode === 'edit' &&
    ownedRange.startNum != null &&
    ownedRange.endNum != null &&
    ownedRange.startNum <= ownedRange.endNum;
  const shrinkOnly = ownedRangeAvailable;
  const rangeEditable = !loading && (rangeAvailable || ownedRangeAvailable);
  const rangeValidationEnabled = rangeAvailable || ownedRangeAvailable;
  const effectiveRangeInfo = useMemo(
    () =>
      ownedRangeAvailable
        ? {
            ...rangeInfo,
            minAvailable: ownedRange.startNum,
            maxAvailable: ownedRange.endNum,
          }
        : rangeInfo,
    [rangeAvailable, ownedRangeAvailable, rangeInfo, ownedRange],
  );

  const issues = useMemo(
    () =>
      computeRangeIssues({
        startNum: rangeValues.startNum,
        endNum: rangeValues.endNum,
        rangeInfo: effectiveRangeInfo,
        usedRanges: sameTypeUsedRanges,
      }),
    [rangeValues, effectiveRangeInfo, sameTypeUsedRanges],
  );
  const shrinkRangeCleared =
    shrinkOnly && (rangeValues.startNum == null || rangeValues.endNum == null);

  const handleValuesChange = (
    _: Partial<FormShape>,
    all: Partial<FormShape>,
  ) => {
    setRangeValues({
      startNum: all.startNum ?? null,
      endNum: all.endNum ?? null,
    });
  };

  const handleSubmit = async () => {
    if (mode === 'add' && !rangeAvailable) {
      messageApi.warning('暂无可用资产编号范围，无法新增印章配置');
      return;
    }

    try {
      const values = await form.validateFields();
      const submitIssues = computeRangeIssues({
        startNum: values.startNum ?? null,
        endNum: values.endNum ?? null,
        rangeInfo: effectiveRangeInfo,
        usedRanges: sameTypeUsedRanges,
      });
      const submitShrinkRangeCleared =
        shrinkOnly && (values.startNum == null || values.endNum == null);

      if (submitShrinkRangeCleared) {
        messageApi.warning('当前仅支持缩小已有资产编号范围');
        return;
      }
      if (rangeValidationEnabled && submitIssues.rangeOrderInvalid) {
        messageApi.warning('结束编号不能小于起始编号');
        return;
      }
      if (rangeValidationEnabled && submitIssues.rangeOutOfBounds) {
        messageApi.warning(
          shrinkOnly
            ? '只能在当前资产编号范围内缩小'
            : `资产编号范围需在 ${effectiveRangeInfo.minAvailable} - ${effectiveRangeInfo.maxAvailable} 之间`,
        );
        return;
      }
      if (rangeValidationEnabled && submitIssues.rangeConflict) {
        messageApi.warning(
          submitIssues.conflictDetail || '资产编号范围与同类型印章冲突',
        );
        return;
      }

      const payload: SealForm = {
        id: mode === 'edit' ? (editingId as number) : undefined,
        sealCode,
        sealName: values.sealName,
        sealOssId: values.sealOssId,
        instrumentTypeCodes: values.instrumentTypeCodes ?? [],
        startNum: values.startNum ?? null,
        endNum: values.endNum ?? null,
      };

      setSubmitting(true);
      if (mode === 'edit') {
        await updateSeal(payload);
      } else {
        await addSeal(payload);
      }
      messageApi.success('操作成功');
      onSaved();
      onClose();
    } catch (err) {
      if ((err as { errorFields?: unknown[] })?.errorFields) return;
      messageApi.error('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDisabled = loading || submitting;

  return (
    <Modal
      open={open}
      title={
        <span className="text-base font-semibold text-zinc-900">
          {mode === 'edit' ? '编辑印章' : '新增印章'}
        </span>
      }
      width={560}
      centered
      mask={{ closable: false }}
      destroyOnHidden
      okText={mode === 'edit' ? '保存印章' : '新增印章'}
      cancelText="取消"
      okButtonProps={{ disabled: confirmDisabled }}
      confirmLoading={submitting}
      styles={{
        body: { paddingTop: 4 },
        footer: { marginTop: 24 },
        header: { marginBottom: 16 },
      }}
      onOk={handleSubmit}
      onCancel={() => (submitting ? undefined : onClose())}
    >
      <Spin spinning={loading}>
        <Form<FormShape>
          form={form}
          layout="vertical"
          requiredMark={false}
          variant="outlined"
          disabled={loading}
          onValuesChange={handleValuesChange}
          preserve={false}
          className="[&_.ant-form-item]:!mb-4 [&_.ant-form-item-label>label]:!font-medium [&_.ant-form-item-label>label]:!text-zinc-800"
        >
          {!rangeAvailable && !loading ? (
            <Alert
              type="warning"
              showIcon
              title={
                shrinkOnly
                  ? '暂无新增可用资产编号范围，仅支持缩小当前资产编号范围'
                  : '暂无可用资产编号范围，资产编号范围暂不可编辑'
              }
              className="!mb-4"
            />
          ) : null}

          <Form.Item
            label="印章名称"
            name="sealName"
            rules={[
              { required: true, message: '印章名称不能为空' },
              { whitespace: true, message: '印章名称不能为空' },
            ]}
          >
            <Input placeholder="请输入印章名称" maxLength={64} />
          </Form.Item>

          <Form.Item
            label="印章图片"
            name="sealOssId"
            rules={[{ required: true, message: '印章图片不能为空' }]}
            valuePropName="value"
            trigger="onChange"
          >
            <SealImageUploadField messageApi={messageApi} />
          </Form.Item>

          <Form.Item
            label="关联文书"
            name="instrumentTypeCodes"
            rules={[{ required: true, message: '请选择关联文书' }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择关联文书"
              showSearch={{ optionFilterProp: 'label' }}
              options={sealTypeList.map((item) => ({
                label: item.name,
                value: item.code,
              }))}
              allowClear
            />
          </Form.Item>

          <Form.Item label="资产编号范围">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <Form.Item name="startNum" noStyle>
                <InputNumber
                  placeholder="起始编号"
                  precision={0}
                  min={effectiveRangeInfo.minAvailable ?? undefined}
                  max={effectiveRangeInfo.maxAvailable ?? undefined}
                  controls={false}
                  disabled={!rangeEditable}
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <span className="text-gray-500">至</span>
              <Form.Item name="endNum" noStyle>
                <InputNumber
                  placeholder="结束编号"
                  precision={0}
                  min={effectiveRangeInfo.minAvailable ?? undefined}
                  max={effectiveRangeInfo.maxAvailable ?? undefined}
                  controls={false}
                  disabled={!rangeEditable}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </div>
            {rangeAvailable ? (
              <div className="mt-2 text-xs text-gray-500">
                可填写资产编号：{rangeInfo.minAvailable} -{' '}
                {rangeInfo.maxAvailable}
                {sameTypeUsedRanges.length > 0 ? (
                  <span className="ml-3 inline-flex flex-wrap items-center gap-1">
                    同类型已占用：
                    <Space size={[4, 4]} wrap>
                      {sameTypeUsedRanges.map((r) => (
                        <Tag
                          key={`${r.sealName}-${r.startNum}-${r.endNum}`}
                          color="default"
                          className="font-mono"
                        >
                          {r.sealName}({r.startNum}-{r.endNum})
                        </Tag>
                      ))}
                    </Space>
                  </span>
                ) : null}
              </div>
            ) : null}
            {shrinkRangeCleared ? (
              <div className="mt-2 flex items-center gap-1 text-xs text-red-500">
                <WarningOutlined />
                当前仅支持缩小已有资产编号范围
              </div>
            ) : null}
            {rangeValidationEnabled && issues.rangeOrderInvalid ? (
              <div className="mt-2 flex items-center gap-1 text-xs text-red-500">
                <WarningOutlined />
                结束编号不能小于起始编号
              </div>
            ) : null}
            {rangeValidationEnabled && issues.rangeOutOfBounds ? (
              <div className="mt-2 flex items-center gap-1 text-xs text-red-500">
                <WarningOutlined />
                {shrinkOnly
                  ? '只能在当前资产编号范围内缩小'
                  : '输入编号需在可选范围内'}
              </div>
            ) : null}
            {rangeValidationEnabled && issues.rangeConflict ? (
              <div className="mt-2 flex items-center gap-1 text-xs text-red-500">
                <WarningOutlined />
                {issues.conflictDetail ||
                  '所选范围与同类型印章冲突，请重新选择'}
              </div>
            ) : null}
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};

type SealImageUploadFieldProps = {
  value?: string;
  onChange?: (value: string) => void;
  messageApi: MessageInstance;
};

const SealImageUploadField = ({
  value,
  onChange,
  messageApi,
}: SealImageUploadFieldProps) => (
  <SealImageUpload
    value={value}
    onChange={onChange}
    messageApi={messageApi}
    size={88}
    showTip={false}
  />
);

export default SealFormDrawer;
