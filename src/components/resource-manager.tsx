// Server-safe entry point. This file is NOT a client module, so server pages can call
// toOptions() and enumOptions() directly while the table itself runs in the browser.
import ResourceManagerClient from './resource-manager-client';
import { label } from '@/lib/format';

export type { Field, Option } from './resource-manager-client';

type Row = Record<string, any>;

export const toOptions = (rows: Row[] | null | undefined, valueKey = 'id', labelKey = 'name') =>
  (rows ?? []).map((r) => ({ value: r[valueKey] as string, label: r[labelKey] as string }));

export const enumOptions = (values: string[]) => values.map((v) => ({ value: v, label: label(v) }));

export default ResourceManagerClient;
