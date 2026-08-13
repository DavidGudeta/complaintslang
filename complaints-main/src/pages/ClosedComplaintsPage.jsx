import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, CheckCircle2, Search } from 'lucide-react';
import api from '../lib/axios';
import { formatDate } from '../lib/utils';

export function ClosedComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const pickDate = (item) => {
    return (
      item?.CREATED_AT ||
      item?.created_at ||
      item?.APPLIED_DATE ||
      item?.applied_date ||
      item?.CREATED_ON ||
      item?.CREATED_DATE ||
      item?.SENT_DATE ||
      item?.submitted_at ||
      null
    );
  };

  useEffect(() => {
    fetchClosedComplaints();
  }, []);

  const fetchClosedComplaints = async () => {
    try {
      const res = await api.get('/internal/complaints/closed');

      const data = res.data?.data || res.data || [];

      setComplaints(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch closed complaints:', error);
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredComplaints = complaints.filter((item) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;

    const values = [
      item.COMPLAINTS_CODE,
      item.COMPLAINTS_TITLE,
      item.COMPLAINTS_SUB_CATEGORY,
      item.COMPLAINTS_CATEGORY,
      item.TAX_CENTER,
      item.subject,
      item.COMPLAINTS_STATUS,
      item.STATUS_NAME,
      item.COMPLAINTS_DESCRIPTION,
      item.DESCRIPTION,
    ];

    return values
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term));
  });

  if (loading) {
    return (
      <div className="p-8 text-zinc-500">
        Loading closed complaints...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold text-zinc-900">
          Closed Complaints
        </h1>

        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by complaint code, subject, category, or tax center"
            className="w-full rounded-2xl border border-zinc-200 bg-white py-3 pl-11 pr-4 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-sky-500"
          />
        </div>
      </div>

      {/* Empty state */}
      {filteredComplaints.length === 0 ? (
        <div className="p-8 text-center text-zinc-500 bg-white rounded-2xl">
          <CheckCircle2 className="mx-auto mb-3 text-green-600" size={40} />
          No closed complaints found
        </div>
      ) : (
        <div className="space-y-4">
          {filteredComplaints.map((item) => (
            <Link
              key={item.COMPLAINTS_ID}
              to={`/cases/detail/${item.COMPLAINTS_CODE}`}
              className="block p-6 bg-white rounded-2xl hover:shadow transition-all"
            >
              <div className="flex items-center gap-3">
                <FileText className="text-blue-600" />

                <div>
                  <p className="font-bold text-zinc-900">
                    {item.COMPLAINTS_CODE}
                  </p>

                  <p className="text-sm text-zinc-500">
                    {formatDate(pickDate(item))}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}