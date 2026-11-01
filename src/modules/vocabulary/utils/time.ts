/** Minutes east of UTC, the `tzOffset` convention of the Content API. Call in handlers/queryFns. */
export const getTzOffset = (): number => -new Date().getTimezoneOffset();
