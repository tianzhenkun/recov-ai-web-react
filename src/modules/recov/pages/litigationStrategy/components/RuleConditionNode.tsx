import { DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { Button, InputNumber, Select, Upload } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import { useEffect, useMemo, useState } from 'react';
import {
  FIELD_CONFIGS,
  OPERATOR_LABELS,
  type RuleConditionNode as RuleConditionNodeType,
  type RuleField,
  type RuleOperator,
  uploadCustomerGroups,
} from '@/modules/recov/services/litigation';
import type { PersonaSimple } from '@/modules/recov/services/persona';

export type CustomerGroupOption = { value: string; label: string };

export type RuleConditionNodeProps = {
  node: RuleConditionNodeType;
  personaOptions: PersonaSimple[];
  customerGroupOptions: CustomerGroupOption[];
  onUpdate: (node: RuleConditionNodeType) => void;
  onDelete: () => void;
  messageApi: MessageInstance;
};

const fieldConfigOf = (field: RuleField) =>
  FIELD_CONFIGS.find((item) => item.field === field) ?? FIELD_CONFIGS[0];

const RuleConditionNode = ({
  node,
  personaOptions,
  customerGroupOptions,
  onUpdate,
  onDelete,
  messageApi,
}: RuleConditionNodeProps) => {
  const [uploadedOptions, setUploadedOptions] = useState<CustomerGroupOption[]>(
    [],
  );
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (node.field !== 'customerGroups') {
      setUploadedOptions([]);
    }
  }, [node.field]);

  const currentFieldConfig = useMemo(
    () => fieldConfigOf(node.field),
    [node.field],
  );

  const numberValue: number = typeof node.value === 'number' ? node.value : 0;
  const arrayValue: string[] = Array.isArray(node.value) ? node.value : [];

  const handleFieldChange = (next: RuleField) => {
    const config = fieldConfigOf(next);
    onUpdate({
      type: 'COND',
      field: next,
      op: config.ops[0],
      value: config.valueType === 'number' ? 0 : [],
    });
    if (next !== 'customerGroups') {
      setUploadedOptions([]);
    }
  };

  const handleOpChange = (next: RuleOperator) => {
    onUpdate({ ...node, op: next });
  };

  const handleNumberChange = (value: number | null) => {
    onUpdate({
      ...node,
      value: typeof value === 'number' ? value : 0,
    });
  };

  const handleArrayChange = (value: string[]) => {
    onUpdate({ ...node, value });
  };

  const selectOptions = useMemo<CustomerGroupOption[]>(() => {
    if (node.field === 'personaIds') {
      return personaOptions.map((p) => ({
        value: String(p.id),
        label: p.personaName,
      }));
    }
    if (node.field === 'customerGroups') {
      const merged = [...customerGroupOptions, ...uploadedOptions];
      const seen = new Set<string>();
      return merged.filter((item) => {
        if (seen.has(item.value)) return false;
        seen.add(item.value);
        return true;
      });
    }
    return [];
  }, [node.field, personaOptions, customerGroupOptions, uploadedOptions]);

  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      messageApi.error('请选择 Excel 文件（.xlsx 或 .xls）');
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const customRequest: UploadProps['customRequest'] = async ({
    file,
    onSuccess,
    onError,
  }) => {
    setUploading(true);
    try {
      const res = await uploadCustomerGroups(file as File);
      const codes = res.data;
      if (!codes || codes.length === 0) {
        messageApi.warning('未找到匹配的资产编号');
        onSuccess?.({}, new XMLHttpRequest());
        return;
      }

      const newOptions = codes.map((code) => ({
        value: String(code),
        label: String(code),
      }));

      const mergedOptions = (() => {
        const seen = new Set<string>();
        const list: CustomerGroupOption[] = [];
        for (const item of [...uploadedOptions, ...newOptions]) {
          if (seen.has(item.value)) continue;
          seen.add(item.value);
          list.push(item);
        }
        return list;
      })();
      setUploadedOptions(mergedOptions);

      const mergedSelected = (() => {
        const seen = new Set<string>();
        const list: string[] = [];
        for (const v of [...arrayValue, ...codes.map(String)]) {
          if (seen.has(v)) continue;
          seen.add(v);
          list.push(v);
        }
        return list;
      })();
      onUpdate({ ...node, value: mergedSelected });

      messageApi.success(res.msg || '导入成功');
      onSuccess?.({}, new XMLHttpRequest());
    } catch (error) {
      messageApi.error('上传失败，请稍后重试');
      onError?.(error as Error);
    } finally {
      setUploading(false);
    }
  };

  const isCustomerGroups = node.field === 'customerGroups';
  const renderValueControl = () => {
    if (currentFieldConfig.valueType === 'number') {
      return (
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          precision={node.field === 'overdueAmount' ? 2 : 0}
          value={numberValue}
          onChange={handleNumberChange}
        />
      );
    }

    if (isCustomerGroups) {
      return (
        <div className="flex flex-col gap-2">
          <Select
            mode="multiple"
            maxTagCount="responsive"
            placeholder="请先上传 Excel 获取客户群体编号"
            className="w-full"
            value={arrayValue}
            onChange={handleArrayChange}
            options={selectOptions}
            disabled={selectOptions.length === 0}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-400">
              *必须上传 Excel 获取客户群体编号
            </span>
            <Upload
              accept=".xlsx,.xls"
              showUploadList={false}
              beforeUpload={beforeUpload}
              customRequest={customRequest}
              disabled={uploading}
            >
              <Button
                size="small"
                icon={<UploadOutlined />}
                loading={uploading}
              >
                上传Excel
              </Button>
            </Upload>
          </div>
        </div>
      );
    }

    return (
      <Select
        mode="multiple"
        maxTagCount="responsive"
        placeholder="选择值"
        className="w-full"
        value={arrayValue}
        onChange={handleArrayChange}
        options={selectOptions}
      />
    );
  };

  return (
    <div className="grid grid-cols-1 gap-2 rounded-lg border border-solid border-zinc-200 bg-white p-3 md:grid-cols-[160px_160px_minmax(0,1fr)_32px] md:items-start">
      <Select
        className="w-full"
        placeholder="选择字段"
        value={node.field}
        onChange={handleFieldChange}
        options={FIELD_CONFIGS.map((f) => ({
          value: f.field,
          label: f.label,
        }))}
      />
      <Select
        className="w-full"
        placeholder="选择操作"
        value={node.op}
        onChange={handleOpChange}
        options={currentFieldConfig.ops.map((op) => ({
          value: op,
          label: OPERATOR_LABELS[op],
        }))}
      />
      <div className="min-w-0">{renderValueControl()}</div>
      <Button
        type="text"
        danger
        shape="circle"
        aria-label="删除条件"
        icon={<DeleteOutlined />}
        className="justify-self-end"
        onClick={onDelete}
      />
    </div>
  );
};

export default RuleConditionNode;
