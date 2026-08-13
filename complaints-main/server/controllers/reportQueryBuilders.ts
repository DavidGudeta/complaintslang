export const buildRespondedStatusFilter = (columnName = "r.RESPONSE_STATUS") => ({
  clause: `${columnName} IN ('RESPONSE', 'RESPONDED')`,
  binds: {},
});
