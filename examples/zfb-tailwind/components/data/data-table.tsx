/**
 * DataTable — 4-column table with row action buttons (edit / delete).
 *
 * Token consumption (§134.1):
 *   table:  w-full text-helper text-fg border border-muted rounded-md
 *   th:     text-subsection-title text-fg border-b border-muted text-left px-hsp-sm py-vsp-sm
 *   tr:     hover:bg-surface
 *   td:     px-hsp-sm py-vsp-sm border-b border-muted
 *   action: w-size-icon-md h-size-icon-md text-muted hover:text-accent
 *           inline-flex items-center justify-center rounded-md
 */

const rows = [
  { name: 'Alice Martin',   email: 'alice@example.com',  role: 'Admin',    status: 'Active' },
  { name: 'Bob Chen',       email: 'bob@example.com',    role: 'Editor',   status: 'Active' },
  { name: 'Carol Davis',    email: 'carol@example.com',  role: 'Viewer',   status: 'Inactive' },
  { name: 'Diana Prince',   email: 'diana@example.com',  role: 'Editor',   status: 'Active' },
  { name: 'Evan Torres',    email: 'evan@example.com',   role: 'Viewer',   status: 'Pending' },
];

export function DataTable() {
  return (
    <div class="overflow-x-auto">
      <table class="w-full text-helper text-fg border border-muted rounded-md border-collapse">
        <thead>
          <tr>
            <th class="text-subsection-title text-fg border-b border-muted text-left px-hsp-sm py-vsp-sm">Name</th>
            <th class="text-subsection-title text-fg border-b border-muted text-left px-hsp-sm py-vsp-sm">Email</th>
            <th class="text-subsection-title text-fg border-b border-muted text-left px-hsp-sm py-vsp-sm">Role</th>
            <th class="text-subsection-title text-fg border-b border-muted text-left px-hsp-sm py-vsp-sm">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.email} class="hover:bg-surface">
              <td class="px-hsp-sm py-vsp-sm border-b border-muted">{row.name}</td>
              <td class="px-hsp-sm py-vsp-sm border-b border-muted">{row.email}</td>
              <td class="px-hsp-sm py-vsp-sm border-b border-muted">{row.role}</td>
              <td class="px-hsp-sm py-vsp-sm border-b border-muted">
                <span class="inline-flex gap-hsp-xs">
                  <button
                    type="button"
                    aria-label={`Edit ${row.name}`}
                    class="w-size-icon-md h-size-icon-md text-muted hover:text-accent inline-flex items-center justify-center rounded-md"
                  >
                    {/* pencil icon */}
                    <svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11.013 2.513a1.75 1.75 0 0 1 2.475 2.474L5.53 12.945l-3.189.354.353-3.19 8.319-8.596Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${row.name}`}
                    class="w-size-icon-md h-size-icon-md text-muted hover:text-accent inline-flex items-center justify-center rounded-md"
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
