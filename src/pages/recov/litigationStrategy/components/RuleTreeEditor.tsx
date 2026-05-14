import { Button } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import { useEffect, useState } from 'react';
import type { RuleGroupNode as RuleGroupNodeType } from '@/services/ruoyi/litigation';
import type { PersonaSimple } from '@/services/ruoyi/persona';
import {
  createInitialRuleTree,
  parseRuleTree,
  serializeRuleTree,
} from '../_shared';
import type { CustomerGroupOption } from './RuleConditionNode';
import RuleGroupNode from './RuleGroupNode';

export type RuleTreeEditorProps = {
  value: string;
  onChange: (json: string) => void;
  personaOptions: PersonaSimple[];
  customerGroupOptions: CustomerGroupOption[];
  messageApi: MessageInstance;
};

const RuleTreeEditor = ({
  value,
  onChange,
  personaOptions,
  customerGroupOptions,
  messageApi,
}: RuleTreeEditorProps) => {
  const [tree, setTree] = useState<RuleGroupNodeType | null>(() =>
    parseRuleTree(value),
  );

  useEffect(() => {
    const parsed = parseRuleTree(value);
    const currentSerialized = serializeRuleTree(tree);
    if (serializeRuleTree(parsed) !== currentSerialized) {
      setTree(parsed);
    }
    // 仅响应外部 value 变化，内部更新通过 emit -> 父组件 -> value 回流也会进入这里但被等价检测过滤
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = (next: RuleGroupNodeType | null) => {
    setTree(next);
    onChange(serializeRuleTree(next));
  };

  const handleInit = () => {
    emit(createInitialRuleTree());
  };

  if (!tree) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8 text-gray-400">
        <p>暂无规则配置</p>
        <Button type="primary" onClick={handleInit}>
          创建规则
        </Button>
      </div>
    );
  }

  return (
    <div className="rule-tree-editor">
      <RuleGroupNode
        node={tree}
        personaOptions={personaOptions}
        customerGroupOptions={customerGroupOptions}
        depth={0}
        onUpdate={(next) => emit(next)}
        messageApi={messageApi}
      />
    </div>
  );
};

export default RuleTreeEditor;
