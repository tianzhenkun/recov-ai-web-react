import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Input, Modal, Select, Steps, Switch } from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createEmptyCustomDims,
  createInitialEnabled,
  DOMESTIC_REGIONS,
  FOREIGN_REGIONS,
  INITIAL_FORM_STATE,
  REGION_TYPE_OPTIONS,
  SECTION_CONFIGS,
} from '../constants';
import type {
  CustomDimension,
  FixedFieldConfig,
  IcpFormState,
  IcpModelResult,
  IcpRegionType,
  SectionKey,
} from '../data.d';
import DimensionField from './DimensionField';

export type IcpModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (result: IcpModelResult) => void;
};

const createId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const countFilledFields = (
  sectionKey: SectionKey,
  formState: IcpFormState,
  customDims: CustomDimension[],
) => {
  const section = SECTION_CONFIGS.find((item) => item.key === sectionKey);
  if (!section) return { filled: 0, total: 0 };

  const fixedFilled = section.fields.filter((field) => {
    if (field.kind === 'regionType') return true;
    if (field.kind === 'regionValues') {
      return formState.regionValues.length > 0;
    }
    if (!field.formKey) return false;
    return String(formState[field.formKey] ?? '').trim().length > 0;
  }).length;

  const customFilled = customDims.filter(
    (dim) => dim.name.trim() && dim.value.trim(),
  ).length;

  return {
    filled: fixedFilled + customFilled,
    total: section.fields.length + customDims.length,
  };
};

const IcpModal: FC<IcpModalProps> = ({ open, onClose, onConfirm }) => {
  const [modelName, setModelName] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [formState, setFormState] = useState<IcpFormState>(INITIAL_FORM_STATE);
  const [enabled, setEnabled] =
    useState<Record<string, boolean>>(createInitialEnabled);
  const [customDims, setCustomDims] = useState<
    Record<SectionKey, CustomDimension[]>
  >(createEmptyCustomDims);

  useEffect(() => {
    if (open) {
      setModelName('');
      setCurrentStep(0);
      setFormState({ ...INITIAL_FORM_STATE });
      setEnabled(createInitialEnabled());
      setCustomDims(createEmptyCustomDims());
    }
  }, [open]);

  const currentSection = SECTION_CONFIGS[currentStep];
  const isLastStep = currentStep === SECTION_CONFIGS.length - 1;

  const regionOptions = useMemo(
    () =>
      (formState.regionType === 'domestic'
        ? DOMESTIC_REGIONS
        : FOREIGN_REGIONS
      ).map((value) => ({ label: value, value })),
    [formState.regionType],
  );

  const stepItems = useMemo(
    () =>
      SECTION_CONFIGS.map((section, index) => {
        const { filled, total } = countFilledFields(
          section.key,
          formState,
          customDims[section.key],
        );
        return {
          title: section.title,
          description: `${filled}/${total}`,
          status:
            index < currentStep
              ? ('finish' as const)
              : index === currentStep
                ? ('process' as const)
                : ('wait' as const),
        };
      }),
    [currentStep, formState, customDims],
  );

  const toggleEnabled = useCallback((key: string) => {
    setEnabled((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const updateFormField = useCallback(
    <K extends keyof IcpFormState>(key: K, value: IcpFormState[K]) => {
      setFormState((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleRegionTypeChange = (value: IcpRegionType) => {
    setFormState((prev) => ({
      ...prev,
      regionType: value,
      regionValues: [],
    }));
  };

  const addCustomDimension = (section: SectionKey) => {
    setCustomDims((prev) => ({
      ...prev,
      [section]: [
        ...prev[section],
        {
          id: createId(),
          name: '自定义维度',
          value: '',
          enabled: true,
        },
      ],
    }));
  };

  const updateCustomDimension = (
    section: SectionKey,
    id: string,
    patch: Partial<CustomDimension>,
  ) => {
    setCustomDims((prev) => ({
      ...prev,
      [section]: prev[section].map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
  };

  const removeCustomDimension = (section: SectionKey, id: string) => {
    setCustomDims((prev) => ({
      ...prev,
      [section]: prev[section].filter((item) => item.id !== id),
    }));
  };

  const renderFieldControl = (field: FixedFieldConfig, isEnabled: boolean) => {
    if (field.kind === 'regionType') {
      return (
        <Select
          className="w-full"
          disabled={!isEnabled}
          value={formState.regionType}
          options={REGION_TYPE_OPTIONS}
          onChange={handleRegionTypeChange}
        />
      );
    }

    if (field.kind === 'regionValues') {
      return (
        <Select
          mode="multiple"
          allowClear
          className="w-full"
          disabled={!isEnabled}
          placeholder={field.placeholder}
          value={formState.regionValues}
          options={regionOptions}
          onChange={(values) => updateFormField('regionValues', values)}
        />
      );
    }

    const formKey = field.formKey;
    if (!formKey) {
      return null;
    }

    return (
      <Input
        disabled={!isEnabled}
        placeholder={field.placeholder}
        value={formState[formKey]}
        onChange={(e) => updateFormField(formKey, e.target.value)}
      />
    );
  };

  const handleConfirm = () => {
    onConfirm({
      modelName,
      formState,
      enabled,
      customDims,
    });
    onClose();
  };

  const handleNext = () => {
    if (isLastStep) {
      handleConfirm();
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, SECTION_CONFIGS.length - 1));
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  return (
    <Modal
      title={null}
      open={open}
      width={960}
      destroyOnHidden
      onCancel={onClose}
      footer={
        <div className="flex justify-between gap-3">
          <Button disabled={currentStep === 0} onClick={handlePrev}>
            上一步
          </Button>
          <div className="flex gap-3">
            <Button onClick={onClose}>取消</Button>
            <Button type="primary" onClick={handleNext}>
              {isLastStep ? '完成' : '下一步'}
            </Button>
          </div>
        </div>
      }
      styles={{
        body: { padding: 0, maxHeight: '75vh', overflow: 'hidden' },
      }}
    >
      <div className="flex max-h-[75vh] flex-col">
        <div className="shrink-0 border-b border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-fill-quaternary)] px-6 py-4">
          <div className="mb-4 flex items-center gap-4">
            <span className="text-lg font-semibold whitespace-nowrap">
              ICP 建模
            </span>
            <Input
              className="flex-1"
              placeholder="请输入模型名称"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
            />
          </div>
          <Steps
            size="small"
            current={currentStep}
            items={stepItems}
            onChange={setCurrentStep}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <span
                className="h-6 w-1.5 rounded-full"
                style={{
                  backgroundColor: currentSection.negative
                    ? 'var(--ant-color-error)'
                    : 'var(--ant-color-primary)',
                }}
              />
              <h4
                className="text-sm font-semibold"
                style={{
                  color: currentSection.negative
                    ? 'var(--ant-color-error)'
                    : undefined,
                }}
              >
                {currentSection.title}
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {currentSection.fields.map((field) => {
                const isFieldEnabled = enabled[field.enabledKey] ?? true;
                return (
                  <DimensionField
                    key={field.enabledKey}
                    label={field.label}
                    fieldKey={field.enabledKey}
                    enabled={isFieldEnabled}
                    isNegative={currentSection.negative}
                    onToggle={() => toggleEnabled(field.enabledKey)}
                  >
                    {renderFieldControl(field, isFieldEnabled)}
                  </DimensionField>
                );
              })}

              {customDims[currentSection.key].map((dim) => (
                <div
                  key={dim.id}
                  className="group relative flex flex-col gap-2 rounded-lg border border-dashed border-[var(--ant-color-border)] p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      className="text-xs"
                      disabled={!dim.enabled}
                      placeholder="维度名称"
                      value={dim.name}
                      onChange={(e) =>
                        updateCustomDimension(currentSection.key, dim.id, {
                          name: e.target.value,
                        })
                      }
                    />
                    <div className="flex items-center gap-1">
                      <Switch
                        size="small"
                        checked={dim.enabled}
                        onChange={(checked) =>
                          updateCustomDimension(currentSection.key, dim.id, {
                            enabled: checked,
                          })
                        }
                      />
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() =>
                          removeCustomDimension(currentSection.key, dim.id)
                        }
                      />
                    </div>
                  </div>
                  <Input
                    disabled={!dim.enabled}
                    placeholder="请输入维度值"
                    value={dim.value}
                    onChange={(e) =>
                      updateCustomDimension(currentSection.key, dim.id, {
                        value: e.target.value,
                      })
                    }
                  />
                </div>
              ))}

              <div className="flex items-end">
                <Button
                  block
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => addCustomDimension(currentSection.key)}
                >
                  添加维度
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Modal>
  );
};

export default IcpModal;
