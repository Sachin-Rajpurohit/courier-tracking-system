// A simple bar chart made with plain HTML and CSS. Each bar's width is its share of the biggest value.
export function BarList({ title, rows }) {
  const max = Math.max(1, ...rows.map((row) => row.value));

  return (
    <figure className="card chart">
      <figcaption className="chart-title">{title}</figcaption>
      <ul className="bars">
        {rows.map((row) => (
          <li key={row.label} className="bar-row">
            <span className="bar-label">{row.label}</span>
            <span className="bar-track">
              {row.value > 0 && <span className="bar-fill" style={{ width: `${(row.value / max) * 100}%` }}></span>}
              <span className="bar-value">{row.value}</span>
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
