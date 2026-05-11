import { type AntdTreeNode, getTreeSubmitKeys } from './ruoyiTree';

const treeData: AntdTreeNode[] = [
  {
    title: '系统管理',
    value: 1,
    key: 1,
    children: [
      { title: '用户管理', value: 2, key: 2 },
      { title: '角色管理', value: 3, key: 3 },
    ],
  },
];

describe('getTreeSubmitKeys', () => {
  it('keeps only checked keys when parent-child linkage is disabled', () => {
    expect(getTreeSubmitKeys(treeData, [2], [], false)).toEqual(['2']);
  });

  it('includes half checked parent keys when parent-child linkage is enabled', () => {
    expect(getTreeSubmitKeys(treeData, [2], [], true)).toEqual(['1', '2']);
  });

  it('includes fully checked parent keys when all children are checked', () => {
    expect(getTreeSubmitKeys(treeData, [2, 3], [], true).sort()).toEqual([
      '1',
      '2',
      '3',
    ]);
  });
});
