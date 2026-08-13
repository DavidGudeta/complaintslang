import React, { useState } from "react";

import api from "../lib/axios";
export default function UnassignedComplaints() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");

  const fetchUnassigned = async () => {
    try {
      const res = await api.get(
        `/internal/complaints/unassigned?search=${search}`
      );
      setData(res.data?.data || res.data || []);
    } catch (err) {
      console.error("Unassigned error:", err);
      setData([]);
    }
  };

  return (
    <div>
      <h2>Unassigned Complaints</h2>

      {/* SEARCH */}
      <input
        placeholder="Search by complaint code"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <button onClick={fetchUnassigned}>Search</button>

      <table border="1" width="100%">
        <thead>
          <tr>
            <th>Code</th>
            <th>Enterprise</th>
            <th>Complainant</th>
            <th>Status</th>
            <th>Tax Center</th>
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan="5">No data</td>
            </tr>
          ) : (
            data.map((c, i) => (
              <tr key={i}>
                <td>{c.COMPLAINTS_CODE}</td>
                <td>{c.ENTERPISE_NAME}</td>
                <td>{c.COMPLAINANT_NAME}</td>
                <td>{c.STATUS_NAME}</td>
                <td>{c.TAX_CENTER_NAME || c.TAX_CENTER}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}