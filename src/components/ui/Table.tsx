import type { ReactNode, HTMLAttributes } from 'react';

interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

interface TableProps<T> extends HTMLAttributes<HTMLDivElement> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  className?: string;
}

export function Table<T>({ columns, data, keyExtractor, className = '' }: TableProps<T>) {
  return (
    <div className={`overflow-hidden rounded-[18px] border border-white/10 ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-full border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`sticky top-0 whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold text-white/70 md:px-4 md:py-3 md:text-sm ${col.headerClassName ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr
                key={keyExtractor(item)}
                className={`border-b border-white/5 transition-colors last:border-b-0 hover:bg-white/5 ${index % 2 === 1 ? 'bg-white/[0.02]' : ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-3 py-2.5 text-sm text-white/90 md:px-4 md:py-3 ${col.className ?? ''}`}>
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
