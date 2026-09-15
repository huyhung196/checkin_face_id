import { request } from './client';

export const systemApi = {
  getMyIp: () => request('/my-ip'),
  getHealth: () => request('/health'),
  getExportUrl: (date = '', attendanceFilter = '') => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (attendanceFilter && attendanceFilter !== 'all') params.append('attendance_filter', attendanceFilter);
    const qs = params.toString();
    return qs ? `/api/export?${qs}` : '/api/export';
  },
  getMonthlyReportUrl: ({ month = '', fromDate = '', toDate = '', employeeId = '' } = {}) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (fromDate) params.append('from_date', fromDate);
    if (toDate) params.append('to_date', toDate);
    if (employeeId) params.append('employee_id', employeeId);
    const qs = params.toString();
    return qs ? `/api/export/monthly-report?${qs}` : '/api/export/monthly-report';
  },
  getMonthlyData: ({ month = '', fromDate = '', toDate = '', employeeId = '' } = {}) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (fromDate) params.append('from_date', fromDate);
    if (toDate) params.append('to_date', toDate);
    if (employeeId) params.append('employee_id', employeeId);
    const qs = params.toString();
    return request(qs ? `/export/monthly-data?${qs}` : '/export/monthly-data');
  }
};
