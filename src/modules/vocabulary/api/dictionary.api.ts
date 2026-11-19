import { httpClient } from "@/services/http";

import type { SelectionLookupDto, SelectionLookupRequest } from "../types/dictionary.types";

const BASE = "/content/api/v1/dictionary";

export const dictionaryApi = {
  /**
   * POST lookup — anonymous. Words and 2–5 word phrases go through the vocabulary enrichment tiers,
   * longer selections are translated. AI runs only when `allowAi` is set and the caller is signed in.
   */
  lookupSelection: async (body: SelectionLookupRequest): Promise<SelectionLookupDto> =>
    (await httpClient.post<SelectionLookupDto>(`${BASE}/lookup`, body)).data,
};
