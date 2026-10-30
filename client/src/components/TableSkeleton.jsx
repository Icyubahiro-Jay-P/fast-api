export default function TableSkeleton({ rows = 5, columns = 5 }) {
  return Array.from({ length: rows }, (_, rowIndex) => (
    <tr className="border-b last:border-0" key={rowIndex}>
      {Array.from({ length: columns }, (_, columnIndex) => (
        <td className="px-3 py-3.5" key={columnIndex}>
          <span
            className="block h-3 animate-pulse rounded bg-muted"
            style={{ width: columnIndex === 0 ? '70%' : `${42 + ((rowIndex + columnIndex) % 4) * 12}%` }}
          />
        </td>
      ))}
    </tr>
  ));
}
