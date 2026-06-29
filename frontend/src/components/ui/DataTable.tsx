import type { ReactNode } from 'react'

export interface Column<T> {
  key: keyof T & string
  label: ReactNode
  render?: (val: T[keyof T], row: T) => ReactNode
}

interface DataTableProps<T extends { id: string }> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
}

export default function DataTable<T extends { id: string }>({ data, columns, loading }: DataTableProps<T>) {
  if (loading) {
    return <div className="flex justify-center py-12 text-gray-400">Loading...</div>
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 text-left font-medium text-gray-600">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row) => (
            <tr key={row.id} className="bg-white hover:bg-gray-50">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-gray-700">
                  {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-400">
                No records found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
