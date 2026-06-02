import { parseStringPromise } from 'xml2js';

export async function parseXml(xml: string): Promise<unknown> {
  return parseStringPromise(xml, {
    explicitArray: false,
    trim: true,
  });
}
