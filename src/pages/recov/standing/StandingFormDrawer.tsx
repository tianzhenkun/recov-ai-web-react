import { WarningOutlined } from '@ant-design/icons';
import {
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
  addStanding,
  getStanding,
  getStandingRange,
  type StandingForm,
  type StandingRangeVO,
  updateStanding,
} from '@/services/ruoyi/standing';
import {
  computeRangeIssues,
  DEFAULT_STANDING_RANGE,
  defaultStandingForm,
  getStandingTypeName,
  STANDING_TYPES,
  type UsedRangeRef,
} from './_shared';
import StandingPdfUpload from './StandingPdfUpload';

type StandingFormDrawerProps = {
  open: boolean;
  mode: 'add' | 'edit';
  editingId?: number | string;
  allUsedRanges: UsedRangeRef[];
  wildcardUsed?: boolean;
  onClose: () => void;
  onSaved: () => void;
  messageApi: MessageInstance;
};

type FormShape = {
  standingCode: string;
  standingName: string;
  standingOssId: string;
  startNum: number | null;
  endNum: number | null;
};

const StandingFormDrawer = ({
  open,
  mode,
  editingId,
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
  const [standingCode, setStandingCode] = useState<string>('PLAINTIFF_LICENSE');

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
            const code = detail.standingCode ?? 'PLAINTIFF_LICENSE';
            const next: FormShape = {
              standingCode: code,
              standingName: detail.standingName ?? '',
              standingOssId:
                detail.standingOssId == null
                  ? ''
                  : String(detail.standingOssId),
              startNum: detail.startNum ?? null,
              endNum: detail.endNum ?? null,
            };
            setStandingCode(code);
            form.setFieldsValue(next);
            setRangeValues({
              startNum: next.startNum,
              endNum: next.endNum,
            });
            const rangeRes = await getStandingRange(code, editingId);
            if (cancelled) return;
            setRangeInfo({
              usedRanges: rangeRes.data?.usedRanges ?? [],
              wildcardUsed: rangeRes.data?.wildcardUsed ?? false,
              minAvailable: rangeRes.data?.minAvailable ?? 1,
              maxAvailable: rangeRes.data?.maxAvailable ?? 10000,
            });
          }
        } else {
          form.resetFields();
          const empty = defaultStandingForm();
          const next: FormShape = {
            standingCode: empty.standingCode,
            standingName: empty.standingName,
            standingOssId: String(empty.standingOssId ?? ''),
            startNum: empty.startNum ?? null,
            endNum: empty.endNum ?? null,
          };
          setStandingCode(next.standingCode);
          form.setFieldsValue(next);
          setRangeValues({ startNum: null, endNum: null });
          const rangeRes = await getStandingRange(next.standingCode);
          if (cancelled) return;
          setRangeInfo({
            usedRanges: rangeRes.data?.usedRanges ?? [],
            wildcardUsed: rangeRes.data?.wildcardUsed ?? false,
            minAvailable: rangeRes.data?.minAvailable ?? 1,
            maxAvailable: rangeRes.data?.maxAvailable ?? 10000,
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
  }, [open, mode, editingId, form]);

  const usedRanges = useMemo(
    () =>
      allUsedRanges.length > 0
        ? allUsedRanges
        : (rangeInfo.usedRanges ?? []).map((range) => ({
            ...range,
            standingName: getStandingTypeName(standingCode),
          })),
    [allUsedRanges, rangeInfo.usedRanges, standingCode],
  );

  const issues = useMemo(
    () =>
      computeRangeIssues({
        startNum: rangeValues.startNum,
        endNum: rangeValues.endNum,
        rangeInfo,
        usedRanges,
        wildcardUsed: wildcardUsed ?? rangeInfo.wildcardUsed,
      }),
    [rangeValues, rangeInfo, usedRanges, wildcardUsed],
  );

  const loadRangeInfo = async (code: string) => {
    try {
      const rangeRes = await getStandingRange(
        code,
        mode === 'edit' ? editingId : undefined,
      );
      setRangeInfo({
        usedRanges: rangeRes.data?.usedRanges ?? [],
        wildcardUsed: rangeRes.data?.wildcardUsed ?? false,
        minAvailable: rangeRes.data?.minAvailable ?? 1,
        maxAvailable: rangeRes.data?.maxAvailable ?? 10000,
      });
    } catch {
      setRangeInfo(DEFAULT_STANDING_RANGE);
    }
  };

  const handleValuesChange = (
    changed: Partial<FormShape>,
    all: Partial<FormShape>,
  ) => {
    setRangeValues({
      startNum: all.startNum ?? null,
      endNum: all.endNum ?? null,
    });
    if (changed.standingCode) {
      setStandingCode(changed.standingCode);
      void loadRangeInfo(changed.standingCode);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (issues.partialRange) {
        messageApi.warning('资产编号范围必须同时填写起始和结束编号');
        return;
      }
      if (issues.wildcardConflict) {
        messageApi.warning('同一材料类型下只能启用一个全量适用材料');
        return;
      }
      if (issues.rangeOrderInvalid) {
        messageApi.warning('结束编号不能小于起始编号');
        return;
      }
      if (issues.rangeOutOfBounds) {
        messageApi.warning(
          `资产编号范围需在 ${rangeInfo.minAvailable ?? 1} - ${
            rangeInfo.maxAvailable ?? 10000
          } 之间`,
        );
        return;
      }
      if (issues.rangeConflict) {
        messageApi.warning(issues.conflictDetail || '资产编号范围冲突');
        return;
      }

      const payload: StandingForm = {
        id: mode === 'edit' ? editingId : undefined,
        standingCode: values.standingCode,
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

  const confirmDisabled =
    loading ||
    issues.partialRange ||
    issues.wildcardConflict ||
    issues.rangeOrderInvalid ||
    issues.rangeOutOfBounds ||
    issues.rangeConflict;

  return (
    <Modal
      open={open}
      title={
        <span className="text-base font-semibold text-zinc-900">
          {mode === 'edit' ? '编辑主体资格材料' : '新增主体资格材料'}
        </span>
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
          onValuesChange={handleValuesChange}
          preserve={false}
          className="[&_.ant-form-item-label>label]:!font-medium [&_.ant-form-item-label>label]:!text-zinc-800"
        >
          <Form.Item
            label="材料类型"
            name="standingCode"
            rules={[{ required: true, message: '请选择材料类型' }]}
          >
            <Select
              placeholder="请选择材料类型"
              options={STANDING_TYPES.map((item) => ({
                label: item.label,
                value: item.code,
              }))}
            />
          </Form.Item>

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
                  min={rangeInfo.minAvailable ?? 1}
                  max={rangeInfo.maxAvailable ?? 10000}
                  controls={false}
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <span className="text-gray-500">至</span>
              <Form.Item name="endNum" noStyle>
                <InputNumber
                  placeholder="结束编号"
                  precision={0}
                  min={rangeInfo.minAvailable ?? 1}
                  max={rangeInfo.maxAvailable ?? 10000}
                  controls={false}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              留空表示全部资产；可选范围：{rangeInfo.minAvailable ?? 1} -{' '}
              {rangeInfo.maxAvailable ?? 10000}
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
            {issues.partialRange ? (
              <div className="mt-2 flex items-center gap-1 text-xs text-red-500">
                <WarningOutlined />
                资产编号范围必须同时填写起始和结束编号
              </div>
            ) : null}
            {issues.wildcardConflict ? (
              <div className="mt-2 flex items-center gap-1 text-xs text-red-500">
                <WarningOutlined />
                同一材料类型下已存在全量适用材料
              </div>
            ) : null}
            {issues.rangeOrderInvalid ? (
              <div className="mt-2 flex items-center gap-1 text-xs text-red-500">
                <WarningOutlined />
                结束编号不能小于起始编号
              </div>
            ) : null}
            {issues.rangeOutOfBounds ? (
              <div className="mt-2 flex items-center gap-1 text-xs text-red-500">
                <WarningOutlined />
                输入编号需在可选范围内
              </div>
            ) : null}
            {issues.rangeConflict ? (
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
