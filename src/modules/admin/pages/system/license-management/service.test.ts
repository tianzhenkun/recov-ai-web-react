import { ruoyiRequest } from '@/api/main';
import {
  createLicenseDeployment,
  createLicenseProduct,
  createLicenseProductRoute,
  downloadDeploymentIdFile,
  downloadLicenseFile,
  issueLicense,
  listLicenseIssues,
  listLicenseProductRoutes,
  updateLicenseDeployment,
  updateLicenseProduct,
  updateLicenseProductRoute,
} from '@/modules/admin/services/license';

jest.mock('@/api/main', () => ({
  ruoyiRequest: jest.fn(),
}));

const mockedRequest = ruoyiRequest as jest.Mock;

describe('license management service contract', () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue({ code: 200, data: {} });
  });

  it('uses the product and signed route binding endpoints', async () => {
    await createLicenseProduct({
      productCode: 'sales',
      productName: '智能销售',
      status: '0',
    });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      '/system/license-management/products',
      expect.objectContaining({ method: 'post' }),
    );

    await updateLicenseProduct('101', {
      productName: '智能销售',
      status: '0',
    });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      '/system/license-management/products/101',
      expect.objectContaining({ method: 'put' }),
    );

    await listLicenseProductRoutes('sales');
    expect(mockedRequest).toHaveBeenLastCalledWith(
      '/system/license-management/products/sales/routes',
      { method: 'get' },
    );

    await createLicenseProductRoute('101', {
      routeId: 'lingchen-sales-app',
      serviceId: 'lingchen-sales-app',
      pathPatterns: '/system/sales/**',
      status: '0',
    });
    expect(mockedRequest.mock.calls.at(-1)?.[0]).toBe(
      '/system/license-management/products/101/routes',
    );

    await updateLicenseProductRoute('201', {
      pathPatterns: '/system/sales/**',
      status: '0',
    });
    expect(mockedRequest.mock.calls.at(-1)?.[0]).toBe(
      '/system/license-management/routes/201',
    );
  });

  it('keeps deploymentId and revision server generated', async () => {
    await createLicenseDeployment({ customerName: '客户A' });
    const createDeploymentOptions = mockedRequest.mock.calls.at(-1)?.[1];
    expect(createDeploymentOptions.data).toEqual({ customerName: '客户A' });
    expect(createDeploymentOptions.data).not.toHaveProperty('deploymentId');

    await updateLicenseDeployment('301', {
      customerName: '客户A',
      status: '0',
    });
    expect(mockedRequest.mock.calls.at(-1)?.[0]).toBe(
      '/system/license-management/deployments/301',
    );

    const issuePayload = {
      issueType: 'INITIAL' as const,
      issueReason: '首次签发',
      products: [
        {
          productCode: 'recov',
          permanent: true,
          validFrom: '2026-07-13T00:00:00.000Z',
        },
      ],
    };
    await issueLicense('301', issuePayload);
    expect(mockedRequest).toHaveBeenLastCalledWith(
      '/system/license-management/deployments/301/issues',
      expect.objectContaining({
        method: 'post',
        data: issuePayload,
      }),
    );
    expect(mockedRequest.mock.calls.at(-1)?.[1].data).not.toHaveProperty(
      'licenseRevision',
    );

    await listLicenseIssues({ deploymentId: 'deployment-uuid' });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      '/system/license-management/issues',
      expect.objectContaining({
        method: 'get',
        params: { deploymentId: 'deployment-uuid' },
      }),
    );
  });

  it('downloads the fixed customer replacement files from GET endpoints', async () => {
    const createObjectURL = jest.fn(() => 'blob:license-file');
    const revokeObjectURL = jest.fn();
    jest
      .spyOn(window.URL, 'createObjectURL')
      .mockImplementation(createObjectURL);
    window.URL.revokeObjectURL = revokeObjectURL;
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation();
    mockedRequest.mockResolvedValue(
      new Blob(
        [
          JSON.stringify({
            format: 'LC-LICENSE',
            version: 1,
            keyId: 'LC-ED25519-2026-01',
            payload: 'signed-payload',
            signature: 'signed-value',
          }),
        ],
        { type: 'application/octet-stream' },
      ),
    );

    await downloadLicenseFile('401');
    expect(mockedRequest).toHaveBeenLastCalledWith(
      '/system/license-management/issues/401/download',
      { method: 'get', responseType: 'blob' },
    );

    mockedRequest.mockResolvedValue(
      new Blob(['123e4567-e89b-12d3-a456-426614174000\n'], {
        type: 'application/octet-stream',
      }),
    );
    await downloadDeploymentIdFile('301');
    expect(mockedRequest).toHaveBeenLastCalledWith(
      '/system/license-management/deployments/301/deployment-id-file',
      { method: 'get', responseType: 'blob' },
    );
    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);

    mockedRequest.mockResolvedValue({
      type: 'application/json',
      text: async () => JSON.stringify({ code: 403, msg: '无下载权限' }),
    } as Blob);
    await expect(downloadLicenseFile('forbidden')).rejects.toThrow(
      '无下载权限',
    );
    expect(createObjectURL).toHaveBeenCalledTimes(2);
  });

  it('does not save malformed license or deployment files', async () => {
    const createObjectURL = jest.fn(() => 'blob:invalid-file');
    jest
      .spyOn(window.URL, 'createObjectURL')
      .mockImplementation(createObjectURL);

    mockedRequest.mockResolvedValue(
      new Blob([JSON.stringify({ format: 'LC-LICENSE', version: 1 })], {
        type: 'application/octet-stream',
      }),
    );
    await expect(downloadLicenseFile('invalid-license')).rejects.toThrow(
      '下载内容不是有效的license.lic',
    );

    mockedRequest.mockResolvedValue(
      new Blob(['not-a-uuid'], { type: 'application/octet-stream' }),
    );
    await expect(
      downloadDeploymentIdFile('invalid-deployment'),
    ).rejects.toThrow('下载内容不是有效的deployment.id');
    expect(createObjectURL).not.toHaveBeenCalled();
  });
});
