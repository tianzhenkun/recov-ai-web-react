import { WarningOutlined } from '@ant-design/icons';
import { Alert, Form, Input, InputNumber, Modal, Space, Spin, Tag } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import { useEffect, useMemo, useState } from 'react';
import {
  addStanding,
  getStanding,
  getStandingRange,
  type StandingCode,
  type StandingForm,
  type StandingRangeVO,
  updateStanding,
} from '@/modules/recov/services/standing';
import {
  computeRangeIssues,
  DEFAULT_STANDING_RANGE,
  defaultStandingForm,
  getStandingTypeName,
  hasAvailableStandingRange,
  normalizeRangeBoundary,
  type UsedRangeRef,
} from './_shared';
import StandingPdfUpload from './StandingPdfUpload';

type StandingFormDrawerProps = {
  open: boolean;
  mode: 'add' | 'edit';
  editingId?: number | string;
  standingCode: StandingCode;
  allUsedRanges: UsedRangeRef[];
  wildcardUsed?: boolean;
  onClose: () => void;
  onSaved: () => void;
  messageApi: MessageInstance;
};

type FormShape = {
  standingName: string;
  standingOssId: string;
  startNum: number | null;
  endNum: number | null;
};

const StandingFormDrawer = ({
  open,
  mode,
  editingId,
  standingCode,
  allUsedRanges,
  wildcardUsed,
  onClose,
  onSaved,
  messageApi,
}: StandingFormDrawerProps) => {
  const [form] = Form.useForm<FormShape>();
  const [rangeInfo, setRangeInfo] = useState<StandingRangeVO>(
    DEFAULT_STANDING_RANGE,
  );
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
  const [currentStandingCode, setCurrentStandingCode] =
    useState<StandingCode>(standingCode);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const init = async () => {
      setLoading(true);
      try {
        if (mode === 'edit' && editingId != null) {
          const detailRes = await getStanding(editingId);
          if (cancelled) return;
          const detail = detailRes.data;
          if (detail) {
            const code = (detail.standingCode ?? standingCode) as StandingCode;
            const next: FormShape = {
              standingName: detail.standingName ?? '',
              standingOssId:
                detail.standingOssId == null
                  ? ''
                  : String(detail.standingOssId),
              startNum: detail.startNum ?? null,
              endNum: detail.endNum ?? null,
            };
            setCurrentStandingCode(code);
            form.setFieldsValue(next);
            setRangeValues({
              startNum: next.startNum,
              endNum: next.endNum,
            });
            setOwnedRange({
              startNum: next.startNum,
              endNum: next.endNum,
            });
            const rangeRes = await getStandingRange(code, editingId);
            if (cancelled) return;
            setRangeInfo({
              usedRanges: rangeRes.data?.usedRanges ?? [],
              wildcardUsed: rangeRes.data?.wildcardUsed ?? false,
              minAvailable: normalizeRangeBoundary(rangeRes.data?.minAvailable),
              maxAvailable: normalizeRangeBoundary(rangeRes.data?.maxAvailable),
            });
          }
        } else {
          form.resetFields();
          const empty = defaultStandingForm();
          const next: FormShape = {
            standingName: empty.standingName,
            standingOssId: String(empty.standingOssId ?? ''),
            startNum: empty.startNum ?? null,
            endNum: empty.endNum ?? null,
          };
          setCurrentStandingCode(standingCode);
          form.setFieldsValue(next);
          setRangeValues({ startNum: null, endNum: null });
          setOwnedRange({ startNum: null, endNum: null });
          const rangeRes = await getStandingRange(standingCode);
          if (cancelled) return;
          setRangeInfo({
            usedRanges: rangeRes.data?.usedRanges ?? [],
            wildcardUsed: rangeRes.data?.wildcardUsed ?? false,
            minAvailable: normalizeRangeBoundary(rangeRes.data?.minAvailable),
            maxAvailable: normalizeRangeBoundary(rangeRes.data?.maxAvailable),
          });
        }
      } catch {
        if (!cancelled) setRangeInfo(DEFAULT_STANDING_RANGE);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [open, mode, editingId, standingCode, form]);

  const usedRanges = useMemo(
    () =>
      allUsedRanges.length > 0
        ? allUsedRanges
        : (rangeInfo.usedRanges ?? []).map((range) => ({
            ...range,
            standingName: getStandingTypeName(currentStandingCode),
          })),
    [allUsedRanges, rangeInfo.usedRanges, currentStandingCode],
  );

  const rangeAvailable = hasAvailableStandingRange(rangeInfo);
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
        usedRanges,
        wildcardUsed: wildcardUsed ?? rangeInfo.wildcardUsed,
      }),
    [rangeValues, effectiveRangeInfo, usedRanges, wildcardUsed, rangeInfo],
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
      messageApi.warning('暂无可用资产编号范围，无法新增主体资格材料');
      return;
    }

    try {
      const values = await form.validateFields();
      const submitIssues = computeRangeIssues({
        startNum: values.startNum ?? null,
        endNum: values.endNum ?? null,
        rangeInfo: effectiveRangeInfo,
        usedRanges,
        wildcardUsed: wildcardUsed ?? rangeInfo.wildcardUsed,
      });
      const submitShrinkRangeCleared =
        shrinkOnly && (values.startNum == null || values.endNum == null);

      if (submitShrinkRangeCleared) {
        messageApi.warning('当前仅支持缩小已有资产编号范围');
        return;
      }
      if (rangeValidationEnabled && submitIssues.partialRange) {
        messageApi.warning('资产编号范围必须同时填写起始和结束编号');
        return;
      }
      if (rangeValidationEnabled && submitIssues.wildcardConflict) {
        messageApi.warning('同一材料类型下只能启用一个全量适用材料');
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
        messageApi.warning(submitIssues.conflictDetail || '资产编号范围冲突');
        return;
      }

      const payload: StandingForm = {
        id: mode === 'edit' ? editingId : undefined,
        standingCode: currentStandingCode,
        standingName: values.standingName,
        standingOssId: values.standingOssId,
        startNum: values.startNum ?? null,
        endNum: values.endNum ?? null,
      };

      setSubmitting(true);
      if (mode === 'edit') {
        await updateStanding(payload);
      } else {
        await addStanding(payload);
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
  const standingTypeLabel = getStandingTypeName(currentStandingCode);

  return (
    <Modal
      open={open}
      title={
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold text-zinc-900">
            {mode === 'edit' ? '编辑主体资格材料' : '新增主体资格材料'}
          </span>
          <Tag color="blue" className="!mr-0">
            {standingTypeLabel}
          </Tag>
        </div>
      }
      width={560}
      centered
      mask={{ closable: false }}
      destroyOnHidden
      okText={mode === 'edit' ? '保存材料' : '新增材料'}
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
          className="[&_.ant-form-item-label>label]:!font-medium [&_.ant-form-item-label>label]:!text-zinc-800"
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
            label="材料名称"
            name="standingName"
            rules={[
              { required: true, message: '材料名称不能为空' },
              { whitespace: true, message: '材料名称不能为空' },
            ]}
          >
            <Input placeholder="请输入材料名称" maxLength={64} />
          </Form.Item>

          <Form.Item
            label="PDF 文件"
            name="standingOssId"
            rules={[{ required: true, message: 'PDF 文件不能为空' }]}
            valuePropName="value"
            trigger="onChange"
          >
            <StandingPdfUploadField messageApi={messageApi} />
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
                留空表示全部资产；可填写资产编号：{rangeInfo.minAvailable} -{' '}
                {rangeInfo.maxAvailable}
                {usedRanges.length > 0 ? (
                  <span className="ml-3 inline-flex flex-wrap items-center gap-1">
                    同类型已占用：
                    <Space size={[4, 4]} wrap>
                      {usedRanges.map((r) => (
                        <Tag
                          key={`${r.standingName}-${r.startNum}-${r.endNum}`}
                          color="default"
                          className="font-mono"
                        >
                          {r.standingName}({r.startNum}-{r.endNum})
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
            {rangeValidationEnabled && issues.partialRange ? (
              <div className="mt-2 flex items-center gap-1 text-xs text-red-500">
                <WarningOutlined />
                资产编号范围必须同时填写起始和结束编号
              </div>
            ) : null}
            {rangeValidationEnabled && issues.wildcardConflict ? (
              <div className="mt-2 flex items-center gap-1 text-xs text-red-500">
                <WarningOutlined />
                同一材料类型下已存在全量适用材料
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
                {issues.conflictDetail || '所选范围冲突，请重新选择'}
              </div>
            ) : null}
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};

type StandingPdfUploadFieldProps = {
  value?: string;
  onChange?: (value: string) => void;
  messageApi: MessageInstance;
};

const StandingPdfUploadField = ({
  value,
  onChange,
  messageApi,
}: StandingPdfUploadFieldProps) => (
  <StandingPdfUpload
    value={value}
    onChange={onChange}
    messageApi={messageApi}
  />
);

export default StandingFormDrawer;
