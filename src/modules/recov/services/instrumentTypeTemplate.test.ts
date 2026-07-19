import { ruoyiRequest } from '@/api/main';
import {
  getInstrumentTypeTemplate,
  getInstrumentTypeTemplateImpact,
  INSTRUMENT_TYPE_TEMPLATE_API_PREFIX,
  listInstrumentTypeTemplates,
  previewInstrumentTypeTemplate,
  saveInstrumentTypeTemplate,
  validateInstrumentTypeTemplate,
} from './instrumentTypeTemplate';

jest.mock('@/api/main', () => ({
  ruoyiRequest: jest.fn(),
}));

const mockedRequest = ruoyiRequest as jest.Mock;

describe('instrument type template service', () => {
  beforeEach(() => {
    mockedRequest.mockResolvedValue({ code: 200, data: null });
  });

  it('uses system-prefixed template api and only submits template html', async () => {
    expect(INSTRUMENT_TYPE_TEMPLATE_API_PREFIX).toBe('/system/instrument/type');

    await listInstrumentTypeTemplates({ purposeCode: 'FILING', status: 1 });
    await getInstrumentTypeTemplate(123);
    await saveInstrumentTypeTemplate(123, {
      templateHtml: '<h1>{{debtorName}}</h1>',
    });
    await validateInstrumentTypeTemplate({
      templateHtml: '<h1>{{debtorName}}</h1>',
      requireSealPlaceholder: false,
    });
    await previewInstrumentTypeTemplate(123, {
      templateHtml: '<h1>{{debtorName}}</h1>',
    });
    await getInstrumentTypeTemplateImpact(123);

    expect(mockedRequest.mock.calls.map(([url]) => url)).toEqual([
      '/system/instrument/type/templates',
      '/system/instrument/type/123/template',
      '/system/instrument/type/123/template',
      '/system/instrument/type/template/validate',
      '/system/instrument/type/123/template/preview',
      '/system/instrument/type/123/template/impact',
    ]);
    expect(mockedRequest.mock.calls[2][1]).toMatchObject({
      method: 'put',
      data: { templateHtml: '<h1>{{debtorName}}</h1>' },
    });
    expect(mockedRequest.mock.calls[2][1].data).not.toHaveProperty(
      'templateJson',
    );
  });
});
