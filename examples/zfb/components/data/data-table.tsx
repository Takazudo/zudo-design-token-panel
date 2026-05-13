/**
 * DataTable — 4-column table with row action buttons (edit / delete).
 *
 * Plain CSS mirror of zfb-tailwind/components/data/data-table.tsx.
 *
 * Token consumption (via .zfbexample-table* classes in global.css):
 *   .zfbexample-table    → text-small, fg, color-muted (border), radius
 *   .zfbexample-table th → text-h4, fg, color-muted (bottom border), spacing-sm
 *   .zfbexample-table td → spacing-sm, color-muted (bottom border)
 *   .zfbexample-table tr:hover td → color-surface (bg)
 *   .zfbexample-table__action → size-icon-md (w/h), color-muted resting, color-accent hover
 */

const rows = [
  { name: 'Alice Martin',  email: 'alice@example.com', role: 'Admin',  status: 'Active'   },
  { name: 'Bob Chen',      email: 'bob@example.com',   role: 'Editor', status: 'Active'   },
  { name: 'Carol Davis',   email: 'carol@example.com', role: 'Viewer', status: 'Inactive' },
  { name: 'Diana Prince',  email: 'diana@example.com', role: 'Editor', status: 'Active'   },
  { name: 'Evan Torres',   email: 'evan@example.com',  role: 'Viewer', status: 'Pending'  },
];

export function DataTable() {
  return (
    <div class="zfbexample-table-wrap">
      <table class="zfbexample-table">
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
                <span class="zfbexample-table__actions">
                  <button
                    type="button"
                    aria-label={`Edit ${row.name}`}
                    class="zfbexample-table__action"
                  >
                    {/* pencil icon */}
                    <svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11.013 2.513a1.75 1.75 0 0 1 2.475 2.474L5.53 12.945l-3.189.354.353-3.19 8.319-8.596Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${row.name}`}
                    class="zfbexample-table__action"
                  >
                    {/* trash icon */}
                    <svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
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
