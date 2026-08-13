const reportMap = {
  performance: '/internal/complaints/reports/performance',
  complaints: '/internal/complaints/reports/complaints',
  assessment: '/internal/complaints/reports/assessment',
  'general-submitted': '/internal/complaints/reports/general-submitted',
  responded: '/internal/complaints/reports/responded',
  'in-progress': '/internal/complaints/reports/in-progress',
  frequent: '/internal/complaints/reports/frequent-complaints',
  'assigned-detail': '/internal/complaints/reports/assigned-detail',
  unassigned: '/internal/complaints/reports/unassigned',
  rejected: '/internal/complaints/reports/rejected',
  'assigned-tracking': '/internal/complaints/reports/assigned-tracking',
  'officer-performance': '/internal/complaints/reports/officer-performance',
};

export function getReportApiPath(type) {
  return reportMap[type] || '/internal/complaints';
}
