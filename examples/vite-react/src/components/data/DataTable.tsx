/**
 * DataTable — 4-column table with row action buttons (edit / delete).
 *
 * Token consumption:
 *   .vr-table         → width, border-collapse, font-size, color
 *   .vr-table th      → font-weight, border-bottom, padding, font-size
 *   .vr-table td      → padding, border-bottom
 *   .vr-table tr:hover td → bg: --vr-color-surface
 *   .vr-table-actions → inline-flex gap for action button row
 *   .vr-table-action  → icon-sized button, muted color, hover accent
 */

const rows = [
  { name: 'Alice Martin',  email: 'alice@example.com',  role: 'Admin',   status: 'Active'   },
  { name: 'Bob Chen',      email: 'bob@example.com',    role: 'Editor',  status: 'Active'   },
  { name: 'Carol Davis',   email: 'carol@example.com',  role: 'Viewer',  status: 'Inactive' },
  { name: 'Diana Prince',  email: 'diana@example.com',  role: 'Editor',  status: 'Active'   },
  { name: 'Evan Torres',   email: 'evan@example.com',   role: 'Viewer',  status: 'Pending'  },
];

export function DataTable() {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="vr-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.email}>
              <td>{row.name}</td>
              <td>{row.email}</td>
              <td>{row.role}</td>
              <td>
                <span className="vr-table-actions">
                  <button
                    type="button"
                    className="vr-table-action"
                    aria-label={`Edit ${row.name}`}
                  >
                    {/* pencil icon */}
                    <svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11.013 2.513a1.75 1.75 0 0 1 2.475 2.474L5.53 12.945l-3.189.354.353-3.19 8.319-8.596Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="vr-table-action"
                    aria-label={`Delete ${row.name}`}
                  >
                    {/* trash icon */}
                    <svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
