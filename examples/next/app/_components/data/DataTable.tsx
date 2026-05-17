/**
 * DataTable — 4-column table with row action buttons (edit / delete).
 *
 * Token consumption (via frozen nx-* vocabulary):
 *   .nx-table     → w-full, collapsed borders, helper font-size
 *   th/td         → padding from --nx-hsp-xs/sm, border-muted
 *   th background → --nx-code-bg (via .nx-table th rule)
 *   row hover     → .nx-table tr:hover td → bg-surface
 */

const rows = [
  { name: 'Alice Martin',  email: 'alice@example.com',  role: 'Admin',   status: 'Active'   },
  { name: 'Bob Chen',      email: 'bob@example.com',    role: 'Editor',  status: 'Active'   },
  { name: 'Carol Davis',   email: 'carol@example.com',  role: 'Viewer',  status: 'Inactive' },
  { name: 'Diana Prince',  email: 'diana@example.com',  role: 'Editor',  status: 'Active'   },
  { name: 'Evan Torres',   email: 'evan@example.com',   role: 'Viewer',  status: 'Pending'  },
];

export default function DataTable() {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="nx-table">
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
                <span style={{ display: 'inline-flex', gap: 'var(--nx-hsp-xs)' }}>
                  <button
                    type="button"
                    aria-label={`Edit ${row.name}`}
                    style={{
                      width: 'var(--nx-size-icon-md)',
                      height: 'var(--nx-size-icon-md)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--nx-color-muted)',
                      borderRadius: 'var(--nx-radius)',
                    }}
                  >
                    {/* pencil icon */}
                    <svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11.013 2.513a1.75 1.75 0 0 1 2.475 2.474L5.53 12.945l-3.189.354.353-3.19 8.319-8.596Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${row.name}`}
                    style={{
                      width: 'var(--nx-size-icon-md)',
                      height: 'var(--nx-size-icon-md)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--nx-color-muted)',
                      borderRadius: 'var(--nx-radius)',
                    }}
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
