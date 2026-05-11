export type RuoyiTreeNode = {
  id?: number | string;
  label?: string;
  parentId?: number | string;
  disabled?: boolean;
  children?: RuoyiTreeNode[];
};

export type AntdTreeNode = {
  title: string;
  value: number | string;
  key: number | string;
  disabled?: boolean;
  children?: AntdTreeNode[];
};

export type TreeKey = number | string;

export const toAntdTreeData = (nodes: RuoyiTreeNode[] = []): AntdTreeNode[] =>
  nodes.map((node) => ({
    title: node.label || String(node.id ?? ''),
    value: node.id ?? '',
    key: node.id ?? '',
    disabled: node.disabled,
    children: toAntdTreeData(node.children || []),
  }));

export const withRootTreeNode = (
  nodes: AntdTreeNode[],
  title = '主类目',
  value: number | string = 0,
) => [
  {
    title,
    value,
    key: value,
    children: nodes,
  },
];

const uniqueKeys = (keys: TreeKey[]) => {
  const result = new Map<string, TreeKey>();
  keys.forEach((key) => {
    result.set(String(key), key);
  });
  return Array.from(result.values());
};

const collectLinkedTreeKeys = (
  nodes: AntdTreeNode[] = [],
  checkedKeySet: Set<string>,
) => {
  const checked: TreeKey[] = [];
  const halfChecked: TreeKey[] = [];

  const visit = (node: AntdTreeNode): 'checked' | 'half' | 'none' => {
    const childStates = (node.children || []).map(visit);
    const selfChecked = checkedKeySet.has(String(node.key));
    const allChildrenChecked =
      childStates.length > 0 &&
      childStates.every((state) => state === 'checked');
    const hasSelectedChild = childStates.some((state) => state !== 'none');

    if (selfChecked || allChildrenChecked) {
      checked.push(node.key);
      return 'checked';
    }

    if (hasSelectedChild) {
      halfChecked.push(node.key);
      return 'half';
    }

    return 'none';
  };

  nodes.forEach((node) => {
    visit(node);
  });

  return { checked, halfChecked };
};

export const getTreeSubmitKeys = (
  treeData: AntdTreeNode[],
  checkedKeys: TreeKey[],
  halfCheckedKeys: TreeKey[] = [],
  linked = true,
) => {
  if (!linked) {
    return uniqueKeys(checkedKeys).map(String);
  }

  const derivedKeys = collectLinkedTreeKeys(
    treeData,
    new Set(checkedKeys.map(String)),
  );

  return uniqueKeys([
    ...derivedKeys.halfChecked,
    ...halfCheckedKeys,
    ...derivedKeys.checked,
    ...checkedKeys,
  ]).map(String);
};
