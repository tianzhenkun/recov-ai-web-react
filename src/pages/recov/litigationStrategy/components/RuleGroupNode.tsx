import {
  DeleteOutlined,
  FolderAddOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Button, Segmented } from 'antd';
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
        'rounded-lg border border-solid border-zinc-200 bg-white',
        !isRoot && 'ml-4',
      )}
    >
      <div className="flex items-center justify-between border-b border-solid border-zinc-100 px-3 py-2">
        <div className="flex items-center gap-3">
          <Segmented
            value={node.logic}
            size="small"
            onChange={(value) => handleLogicChange(value as RuleLogic)}
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
            type="text"
            danger
            size="small"
            shape="circle"
            aria-label="删除条件组"
            icon={<DeleteOutlined />}
            onClick={onDelete}
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-3 p-3">
        {node.children.map((child, index) => {
          const childKey = `${index}-${child.type}`;
          return (
            <div key={childKey} className="flex flex-col gap-3">
              {index > 0 ? (
                <div className="flex items-center justify-center">
                  <span className="text-xs font-medium text-zinc-400">
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

        <div className="flex items-center gap-2">
          <Button icon={<PlusOutlined />} onClick={addCondition}>
            添加条件
          </Button>
          <Button icon={<FolderAddOutlined />} onClick={addGroup}>
            添加条件组
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RuleGroupNode;
