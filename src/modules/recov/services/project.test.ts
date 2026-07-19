import { ruoyiRequest } from '@/api/main';
import {
  addProject,
  batchAddProjects,
  deleteProject,
  getProject,
  getProjectList,
  getProjectPage,
  PROJECT_API_PREFIX,
  updateProject,
} from './project';

jest.mock('@/api/main', () => ({
  ruoyiRequest: jest.fn(),
}));

const mockedRequest = ruoyiRequest as jest.Mock;

describe('project service', () => {
  beforeEach(() => {
    mockedRequest.mockResolvedValue({ code: 200, data: null });
  });

  it('uses the system-prefixed project api', async () => {
    expect(PROJECT_API_PREFIX).toBe('/system/recov/project');

    await getProjectPage({ pageNum: 1, pageSize: 10 });
    await getProjectList({ status: 1 });
    await getProject(123);
    await addProject({ projectName: '阳光花园一期', feeTier: 'TIER_1' });
    await batchAddProjects({
      items: [{ projectName: '阳光花园二期', feeTier: 'TIER_2' }],
    });
    await updateProject({
      id: 123,
      projectName: '阳光花园一期',
      feeTier: 'TIER_1',
    });
    await deleteProject(123);

    expect(mockedRequest.mock.calls.map(([url]) => url)).toEqual([
      '/system/recov/project/page',
      '/system/recov/project/list',
      '/system/recov/project/123',
      '/system/recov/project',
      '/system/recov/project/batch',
      '/system/recov/project',
      '/system/recov/project/123',
    ]);
  });
});
