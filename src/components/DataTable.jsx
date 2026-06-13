import React from 'react';
import { niceDate } from '../utils/date';

function displayValue(value) {
  if (value === null || value === undefined || value === '') return '';

  // Firestore Timestamp objects cannot be rendered directly by React.
  if (typeof value === 'object') {
    if (typeof value.toDate === 'function') return niceDate(value);
    if ('seconds' in value && 'nanoseconds' in value) return niceDate(value);
    if (value instanceof Date) return niceDate(value);
    return JSON.stringify(value);
  }

  return String(value);
}

export default function DataTable({ columns, rows, empty = 'No records yet.' }) {
  if (!rows?.length) return <div className="card"><p className="small">{empty}</p></div>;
  return (
    <div className="table-wrap card" style={{ padding: 0 }}>
      <table>
        <thead>
          <tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id}>
              {columns.map(c => <td key={c.key}>{c.render ? c.render(row) : displayValue(row[c.key])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
