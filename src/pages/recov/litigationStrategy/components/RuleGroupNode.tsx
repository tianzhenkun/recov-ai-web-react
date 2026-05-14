import {
  DeleteOutlined,
  FolderAddOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Button, Radio } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import clsx from 'clsx';
import type {
  RuleGroupNode as RuleGroupNodeType,
  RuleLogic,
  RuleNode,
} from '@/services/ruoyi/litigation';
import type { PersonaSimple } from '@/services/ruoyi/persona';
import { createEmptyConditionNode } from '../_shared';
import RuleConditionNode, {
  type CustomerGroupOption,
} from './RuleConditionNode';

export type RuleGroupNodeProps = {
  node: RuleGroupNodeType;
  personaOptions: PersonaSimple[];
  customerGroupOptions: CustomerGroupOption[];
  depth: number;
  onUpdate: (node: RuleGroupNodeType) => void;
  onDelete?: () => void;
  messageApi: MessageInstance;
};

const RuleGroupNode = ({
  node,
  personaOptions,
  customerGroupOptions,
  depth,
  onUpdate,
  onDelete,
  messageApi,
}: RuleGroupNodeProps) => {
  const isRoot = depth === 0;

  const handleLogicChange = (logic: RuleLogic) => {
    onUpdate({ ...node, logic });
  };

  const updateChild = (index: number, next: RuleNode) => {
    const children = node.children.map((child, i) =>
      i === index ? next : child,
    );
    onUpdate({ ...node, children });
  };

  const deleteChild = (index: number) => {
    const children = node.children.filter((_, i) => i !== index);
    onUpdate({ ...node, children });
  };

  const addCondition = () => {
    onUpdate({
      ...node,
      children: [...node.children, createEmptyConditionNode()],
    });
  };

  const addGroup = () => {
    onUpdate({
      ...node,
      children: [
        ...node.children,
        {
          type: 'GROUP',
          logic: 'AND',
          children: [createEmptyConditionNode()],
        },
      ],
    });
  };

  return (
    <div
      className={clsx(
        'rounded-xl border-2 transition-all',
        isRoot
          ? 'border-indigo-200 bg-indigo-50/30'
          : 'border-gray-200 bg-gray-50/50',
      )}
    >
      <div
        className={clsx(
          'flex items-center justify-between border-b px-4 py-2',
          isRoot
            ? 'border-indigo-100 bg-indigo-50/50'
            : 'border-gray-100 bg-white/50',
        )}
      >
        <div className="flex items-center gap-3">
          <Radio.Group
            value={node.logic}
            size="small"
            optionType="button"
            buttonStyle="solid"
            onChange={(e) => handleLogicChange(e.target.value as RuleLogic)}
            options={[
              { label: 'AND', value: 'AND' },
              { label: 'OR', value: 'OR' },
            ]}
          />
          <span className="text-xs text-gray-400">
            {node.logic === 'AND' ? '所有条件都满足' : '任一条件满足'}
          </span>
        </div>
        {!isRoot && onDelete ? (
          <Button
            type="primary"
            danger
            size="small"
            shape="circle"
            aria-label="删除条件组"
            icon={<DeleteOutlined />}
            onClick={onDelete}
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-3 p-4">
        {node.children.map((child, index) => {
          const childKey = `${index}-${child.type}`;
          return (
            <div key={childKey} className="flex flex-col gap-3">
              {index > 0 ? (
                <div className="flex items-center justify-center">
                  <span
                    className={clsx(
                      'rounded-full px-3 py-0.5 text-xs font-bold',
                      node.logic === 'AND'
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-emerald-100 text-emerald-600',
                    )}
                  >
                    {node.logic}
                  </span>
                </div>
              ) : null}

              {child.type === 'COND' ? (
                <RuleConditionNode
                  node={child}
                  personaOptions={personaOptions}
                  customerGroupOptions={customerGroupOptions}
                  onUpdate={(next) => updateChild(index, next)}
                  onDelete={() => deleteChild(index)}
                  messageApi={messageApi}
                />
              ) : (
                <RuleGroupNode
                  node={child}
                  personaOptions={personaOptions}
                  customerGroupOptions={customerGroupOptions}
                  depth={depth + 1}
                  onUpdate={(next) => updateChild(index, next)}
                  onDelete={() => deleteChild(index)}
                  messageApi={messageApi}
                />
              )}
            </div>
          );
        })}

        <div className="flex items-center gap-2 pt-2">
          <Button size="small" icon={<PlusOutlined />} onClick={addCondition}>
            添加条件
          </Button>
          <Button size="small" icon={<FolderAddOutlined />} onClick={addGroup}>
            添加条件组
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RuleGroupNode;
