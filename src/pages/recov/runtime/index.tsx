import { PageContainer, ProCard } from '@ant-design/pro-components';
import {
  Button,
  Form,
  message,
  Radio,
  Spin,
  Switch,
  TimePicker,
  Typography,
  theme,
} from 'antd';
import { createStyles } from 'antd-style';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getTimeConfig,
  type SaveTimeConfigDTO,
  saveTimeConfig,
  type TimeConfigVo,
} from '@/services/ruoyi/runtime';
import {
  DEFAULT_TIME_FORM,
  getTimeConfigSnapshot,
  HOLIDAY_POLICY_OPTIONS,
  isTimeConfigDirty,
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

const useStyles = createStyles(({ token, css }) => ({
  pageContent: css`
    max-width: 920px;
  `,
  card: css`
    border-color: ${token.colorBorderSecondary};
  `,
  cardBody: css`
    padding: 18px 20px 20px;
  `,
  cardHeader: css`
    min-height: 46px;
    padding: 0 20px;
  `,
  status: css`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 24px;
    padding: 2px 9px 2px 8px;
    color: var(--runtime-status-color);
    background: var(--runtime-status-bg);
    border: 1px solid var(--runtime-status-border);
    border-radius: ${token.borderRadiusLG}px;
    font-size: ${token.fontSizeSM}px;
    font-weight: 600;
    line-height: 20px;
    white-space: nowrap;
  `,
  statusDot: css`
    position: relative;
    width: 7px;
    height: 7px;
    flex: 0 0 7px;
    border-radius: 999px;
    background: currentColor;

    &::after {
      position: absolute;
      inset: -5px;
      border: 1px solid currentColor;
      border-radius: inherit;
      opacity: 0;
      animation: runtime-status-pulse 1.8s ease-out infinite;
      content: '';
    }

    @keyframes runtime-status-pulse {
      0% {
        transform: scale(0.45);
        opacity: 0.5;
      }
      70% {
        transform: scale(1.2);
        opacity: 0;
      }
      100% {
        transform: scale(1.2);
        opacity: 0;
      }
    }
  `,
  compactForm: css`
    max-width: 690px;

    .ant-form-item {
      margin-bottom: 12px;
    }

    .ant-form-item-label {
      padding-bottom: 4px;
    }

    .ant-form-item-label > label {
      color: ${token.colorTextSecondary};
      font-size: ${token.fontSizeSM}px;
      font-weight: 500;
    }
  `,
  formGrid: css`
    display: grid;
    grid-template-columns: minmax(168px, 0.75fr) minmax(280px, 1fr);
    column-gap: 28px;
    row-gap: 4px;

    @media (max-width: ${token.screenMD}px) {
      grid-template-columns: 1fr;
    }
  `,
  timeRange: css`
    display: flex;
    align-items: center;
    gap: 10px;
  `,
  timeDivider: css`
    color: ${token.colorTextTertiary};
    font-size: ${token.fontSizeSM}px;
  `,
}));

const getRuntimeStatusTone = (
  status: string,
  token: ReturnType<typeof theme.useToken>['token'],
) => {
  if (status === '正常运行') {
    return {
      color: token.colorPrimary,
      bg: token.colorPrimaryBg,
      border: token.colorPrimaryBorder,
    };
  }
  if (status === '停止所有') {
    return {
      color: token.colorError,
      bg: token.colorErrorBg,
      border: token.colorErrorBorder,
    };
  }
  if (status === '仅停止外呼' || status === '非运营时间') {
    return {
      color: token.colorWarning,
      bg: token.colorWarningBg,
      border: token.colorWarningBorder,
    };
  }
  return {
    color: token.colorTextTertiary,
    bg: token.colorFillQuaternary,
    border: token.colorBorderSecondary,
  };
};

const RuntimeStatusIndicator = ({ status }: { status: string }) => {
  const { styles } = useStyles();
  const { token } = theme.useToken();
  const tone = getRuntimeStatusTone(status, token);

  return (
    <div
      className={styles.status}
      style={
        {
          '--runtime-status-color': tone.color,
          '--runtime-status-bg': tone.bg,
          '--runtime-status-border': tone.border,
        } as CSSProperties
      }
    >
      <span className={styles.statusDot} />
      <span>{status}</span>
    </div>
  );
};

const RuntimeSettingsPage = () => {
  const { styles } = useStyles();
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
      messageApi.warning('开启时段限制时，请填写完整的外呼时间段');
      return;
    }
    if (values.timeEnabled === '1') {
      const startTime = parseTimeValue(values.startTime);
      const endTime = parseTimeValue(values.endTime);
      if (!startTime || !endTime) {
        messageApi.warning('外呼时间段格式不正确');
        return;
      }
      if (!endTime.isAfter(startTime)) {
        messageApi.warning('结束时间必须晚于开始时间');
        return;
      }
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
      messageApi.success('运营时间配置保存成功');
      await fetchTimeConfig();
    } catch {
      messageApi.error('保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer breadcrumbRender={false} title={PAGE_TITLE}>
      {messageContextHolder}

      <ProCard
        className={styles.pageContent}
        size="small"
        styles={{
          body: { padding: 0 },
          header: { padding: 0 },
        }}
        classNames={{
          body: styles.cardBody,
          header: styles.cardHeader,
          root: styles.card,
        }}
        title={
          <Typography.Text strong style={{ fontSize: 15 }}>
            AI 外呼运营时间
          </Typography.Text>
        }
        extra={
          <div className="flex items-center gap-3">
            {runningStatus ? (
              <RuntimeStatusIndicator status={runningStatus} />
            ) : null}
            {dirty ? (
              <Button
                type="primary"
                size="small"
                loading={saving}
                onClick={handleSave}
              >
                保存配置
              </Button>
            ) : null}
          </div>
        }
      >
        <Spin spinning={loading}>
          <Form
            form={form}
            layout="vertical"
            initialValues={DEFAULT_TIME_FORM}
            requiredMark={false}
            size="small"
            className={styles.compactForm}
          >
            <div className={styles.formGrid}>
              <Form.Item
                label="外呼运营时段"
                name="timeEnabled"
                valuePropName="checked"
                getValueProps={(value) => ({ checked: value === '1' })}
                getValueFromEvent={(checked: boolean) => (checked ? '1' : '0')}
              >
                <Switch size="small" />
              </Form.Item>

              {timeEnabled ? (
                <Form.Item label="外呼时间段" required>
                  <div className={styles.timeRange}>
                    <Form.Item
                      name="startTime"
                      noStyle
                      {...timeFieldProps}
                      rules={[{ required: true, message: '请选择开始时间' }]}
                    >
                      <TimePicker
                        format="HH:mm"
                        className="!w-[112px]"
                        placeholder="开始时间"
                      />
                    </Form.Item>
                    <span className={styles.timeDivider}>至</span>
                    <Form.Item
                      name="endTime"
                      noStyle
                      {...timeFieldProps}
                      rules={[{ required: true, message: '请选择结束时间' }]}
                    >
                      <TimePicker
                        format="HH:mm"
                        className="!w-[112px]"
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
        </Spin>
      </ProCard>
    </PageContainer>
  );
};

export default RuntimeSettingsPage;
