import { useEffect, useState } from "react";
import { api } from "../api/client";
import { EmptyState, ErrorState, Loading } from "./Feedback";

// One reusable list screen with search, filters, sorting and pagination.
// Each page only says which endpoint to load and which columns and filters to show.
function ListPage({
  title,
  subtitle,
  endpoint,
  columns,
  filters = [],
  searchParam = "q",
  searchPlaceholder,
  defaultSort,
  actions,
  emptyTitle = "Nothing here yet",
  emptyText,
  emptyAction,
  reloadKey = 0,
}) {
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState({});
  const [sort, setSort] = useState(defaultSort);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [retry, setRetry] = useState(0);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const hasFilters = search !== "" || Object.values(filterValues).some(Boolean);

  // Load the list again whenever the search, a filter, the sort or the page changes.
  useEffect(() => {
    const params = { page, limit, sort, ...filterValues };
    if (search) params[searchParam] = search;

    setLoading(true);
    setError("");
    api(endpoint, { params })
      .then((data) => {
        setResult(data);
        // Deleting the only row on the last page would leave an empty page.
        if (data.items.length === 0 && page > 1) setPage(page - 1);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [endpoint, search, searchParam, filterValues, sort, page, limit, reloadKey, retry]);

  function handleSearch(event) {
    event.preventDefault();
    setSearch(searchText.trim());
    setPage(1);
  }

  function handleFilter(name, value) {
    setFilterValues({ ...filterValues, [name]: value });
    setPage(1);
  }

  // First click sorts A to Z, the next click sorts Z to A.
  function handleSort(field) {
    setSort(sort === field ? `-${field}` : field);
    setPage(1);
  }

  function clearFilters() {
    setSearchText("");
    setSearch("");
    setFilterValues({});
    setPage(1);
  }

  function renderBody() {
    if (error) return <ErrorState message={error} onRetry={() => setRetry(retry + 1)} />;
    if (!result) return <Loading />;

    if (result.items.length === 0) {
      if (hasFilters) {
        return (
          <EmptyState
            title="No matches"
            action={
              <button type="button" className="btn" onClick={clearFilters}>
                Clear search and filters
              </button>
            }
          >
            Nothing fits this search. Try different terms or fewer filters.
          </EmptyState>
        );
      }
      return (
        <EmptyState title={emptyTitle} action={emptyAction}>
          {emptyText}
        </EmptyState>
      );
    }

    return (
      <>
        <div className={loading ? "table-wrap is-refreshing" : "table-wrap"}>
          <table className="table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key}>
                    {column.sortField ? (
                      <button type="button" className="sort-btn" onClick={() => handleSort(column.sortField)}>
                        {column.label}
                        <span aria-hidden="true" className="sort-arrow">
                          {sort === column.sortField ? "↑" : sort === `-${column.sortField}` ? "↓" : "↕"}
                        </span>
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.items.map((item) => (
                <tr key={item._id}>
                  {columns.map((column) => (
                    <td key={column.key} data-label={column.label} className={column.className}>
                      {column.render ? column.render(item) : item[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <p className="muted">{result.total} total</p>
          <div className="pagination-controls">
            <label htmlFor="page-size">Rows</label>
            <select
              id="page-size"
              value={limit}
              onChange={(event) => {
                setLimit(Number(event.target.value));
                setPage(1);
              }}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
            <button type="button" className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <span className="muted">
              Page {result.page} of {result.totalPages}
            </span>
            <button type="button" className="btn" disabled={page >= result.totalPages} onClick={() => setPage(page + 1)}>
              Next
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <section>
      <header className="page-head">
        <div>
          <h1>{title}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </header>

      <form className="toolbar" onSubmit={handleSearch} role="search">
        <div className="toolbar-search">
          <label htmlFor="list-search" className="visually-hidden">
            Search
          </label>
          <input
            id="list-search"
            type="search"
            value={searchText}
            placeholder={searchPlaceholder}
            onChange={(event) => setSearchText(event.target.value)}
          />
          <button type="submit" className="btn">
            Search
          </button>
        </div>

        {filters.map((filter) => (
          <div className="toolbar-filter" key={filter.name}>
            <label htmlFor={`filter-${filter.name}`}>{filter.label}</label>
            {filter.options ? (
              <select
                id={`filter-${filter.name}`}
                value={filterValues[filter.name] || ""}
                onChange={(event) => handleFilter(filter.name, event.target.value)}
              >
                <option value="">All</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={`filter-${filter.name}`}
                type={filter.type || "text"}
                value={filterValues[filter.name] || ""}
                onChange={(event) => handleFilter(filter.name, event.target.value)}
              />
            )}
          </div>
        ))}

        {hasFilters && (
          <button type="button" className="btn btn-ghost" onClick={clearFilters}>
            Clear
          </button>
        )}
      </form>

      <div className="card table-card">{renderBody()}</div>
    </section>
  );
}

export default ListPage;
