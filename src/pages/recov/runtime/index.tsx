import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Button, Form, message, Radio, Spin, Switch, TimePicker } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getTimeConfig,
  type SaveTimeConfigDTO,
  saveTimeConfig,
  type TimeConfigVo,
} from '@/services/ruoyi/runtime';
import {
  DEFAULT_TIME_FORM,
  getRunningStatusColor,
  getTimeConfigSnapshot,
  HOLIDAY_POLICY_OPTIONS,
  isTimeConfigDirty,
  PAGE_SUB_TITLE,
  PAGE_TITLE,
  type TimeConfigSnapshot,
} from './_shared';

dayjs.extend(customParseFormat);

const parseTimeValue = (value?: string): Dayjs | null => {
  if (!value) return null;
  const parsed = dayjs(value, 'HH:mm', true);
  return parsed.isValid() ? parsed : null;
};

const timeFieldProps = {
  getValueProps: (value?: string) => ({
    value: parseTimeValue(value),
  }),
  getValueFromEvent: (_time: Dayjs | null, timeString: string) =>
    timeString || '',
};

const RuntimeSettingsPage = () => {
  const [messageApi, messageContextHolder] = message.useMessage();
  const [form] = Form.useForm<TimeConfigVo>();

  const [savedSnapshot, setSavedSnapshot] = useState<TimeConfigSnapshot | null>(
    null,
  );
  const [runningStatus, setRunningStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const timeEnabled = Form.useWatch('timeEnabled', form) === '1';
  const watchedForm = Form.useWatch([], form) as TimeConfigVo | undefined;

  const currentSnapshot = useMemo(
    () => getTimeConfigSnapshot(watchedForm ?? DEFAULT_TIME_FORM),
    [watchedForm],
  );

  const dirty = useMemo(
    () => isTimeConfigDirty(savedSnapshot, currentSnapshot),
    [savedSnapshot, currentSnapshot],
  );

  const fetchTimeConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTimeConfig();
      const data = res.data;
      const next: TimeConfigVo = data
        ? {
            timeEnabled: data.timeEnabled === '0' ? '0' : '1',
            startTime: data.startTime || DEFAULT_TIME_FORM.startTime,
            endTime: data.endTime || DEFAULT_TIME_FORM.endTime,
            holidayPolicy:
              data.holidayPolicy ?? DEFAULT_TIME_FORM.holidayPolicy,
          }
        : DEFAULT_TIME_FORM;
      form.setFieldsValue(next);
      setRunningStatus(data?.runningStatus || '');
      setSavedSnapshot(getTimeConfigSnapshot(next));
    } catch {
      form.setFieldsValue(DEFAULT_TIME_FORM);
      setSavedSnapshot(
        (prev) => prev ?? getTimeConfigSnapshot(DEFAULT_TIME_FORM),
      );
      messageApi.error('运营时间配置加载失败');
    } finally {
      setLoading(false);
    }
  }, [form, messageApi]);

  useEffect(() => {
    void fetchTimeConfig();
  }, [fetchTimeConfig]);

  const handleSave = async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }

    const values = form.getFieldsValue();
    if (values.timeEnabled === '1' && (!values.startTime || !values.endTime)) {
      messageApi.warning('开启时段限制时，请填写完整的工作时间段');
      return;
    }

    setSaving(true);
    try {
      const payload: SaveTimeConfigDTO = {
        timeEnabled: values.timeEnabled,
        startTime: values.startTime,
        endTime: values.endTime,
        holidayPolicy: values.holidayPolicy,
      };
      await saveTimeConfig(payload);
      messageApi.success('工作时间配置保存成功');
      await fetchTimeConfig();
    } catch {
      messageApi.error('保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer
      title={PAGE_TITLE}
      subTitle={PAGE_SUB_TITLE}
      extra={
        runningStatus ? (
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2">
            <span className="text-sm text-gray-500">运行状态：</span>
            <span
              className="text-sm font-medium"
              style={{ color: getRunningStatusColor(runningStatus) }}
            >
              {runningStatus}
            </span>
          </div>
        ) : undefined
      }
    >
      {messageContextHolder}

      <ProCard className="!rounded-2xl">
        <Spin spinning={loading}>
          <div className="mb-5 flex items-center gap-2">
            <span className="h-4 w-1.5 rounded-full bg-indigo-500" />
            <h3 className="text-base font-bold text-gray-800">
              AI 智能体工作时间
            </h3>
          </div>

          <Form form={form} layout="vertical" initialValues={DEFAULT_TIME_FORM}>
            <div className="grid max-w-3xl grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-2">
              <Form.Item
                label="外呼运营时段"
                name="timeEnabled"
                valuePropName="checked"
                getValueProps={(value) => ({ checked: value === '1' })}
                getValueFromEvent={(checked: boolean) => (checked ? '1' : '0')}
              >
                <Switch checkedChildren="开启" unCheckedChildren="关闭" />
              </Form.Item>

              {timeEnabled ? (
                <Form.Item label="工作时间段" required>
                  <div className="flex flex-wrap items-center gap-3">
                    <Form.Item
                      name="startTime"
                      noStyle
                      {...timeFieldProps}
                      rules={[{ required: true, message: '请选择开始时间' }]}
                    >
                      <TimePicker
                        format="HH:mm"
                        className="!w-36"
                        placeholder="开始时间"
                      />
                    </Form.Item>
                    <span className="font-medium text-gray-400">至</span>
                    <Form.Item
                      name="endTime"
                      noStyle
                      {...timeFieldProps}
                      rules={[{ required: true, message: '请选择结束时间' }]}
                    >
                      <TimePicker
                        format="HH:mm"
                        className="!w-36"
                        placeholder="结束时间"
                      />
                    </Form.Item>
                  </div>
                </Form.Item>
              ) : null}

              <Form.Item
                label="节假日运行策略"
                name="holidayPolicy"
                className={timeEnabled ? '' : 'md:col-span-2'}
              >
                <Radio.Group options={[...HOLIDAY_POLICY_OPTIONS]} />
              </Form.Item>
            </div>
          </Form>

          {dirty ? (
            <div className="mt-6 flex justify-end">
              <Button
                type="primary"
                size="large"
                className="!rounded-xl !px-8 shadow-md shadow-indigo-200/50"
                loading={saving}
                onClick={handleSave}
              >
                保存配置
              </Button>
            </div>
          ) : null}
        </Spin>
      </ProCard>
    </PageContainer>
  );
};

export default RuntimeSettingsPage;
