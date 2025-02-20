import { useState, useMemo } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

// Updated Pagination Hook
const usePagination = (data, initialPageSize = 10) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(initialPageSize);

    const { totalItems, paginatedData } = useMemo(() => {
        // Filter out group headers for counting actual data rows
        const dataRows = data.filter(row => !row.isGroupHeader);
        const total = dataRows.length;
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;

        // Preserve the original order from sorted data, including group headers
        let paginated = [];
        let dataCount = 0;

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (row.isGroupHeader) {
                // Include group header if it precedes any data row in the range
                if (dataCount < endIndex) {
                    paginated.push(row);
                }
            } else {
                if (dataCount >= startIndex && dataCount < endIndex) {
                    paginated.push(row);
                }
                dataCount++;
            }
        }

        return { totalItems: total, paginatedData: paginated };
    }, [data, currentPage, pageSize]);

    const totalPages = Math.ceil(totalItems / pageSize);

    return {
        paginatedData,
        currentPage,
        setCurrentPage,
        pageSize,
        setPageSize,
        totalPages,
        totalItems
    };
};

// Multi-column Sorting Hook
const useMultiSort = (data, groupByColumn = null) => {
    const [sortConfig, setSortConfig] = useState([]);

    const sortedData = useMemo(() => {
        let sortableData = [...data];

        if (sortConfig.length > 0 && data.length > 0) {
            const firstRow = data[0];
            const inferredTypes = Object.keys(firstRow).reduce((acc, key) => {
                acc[key] = typeof firstRow[key] === 'number' ? 'number' : 'string';
                return acc;
            }, {});

            if (groupByColumn) {
                const grouped = sortableData.reduce((acc, item) => {
                    const groupKey = item[groupByColumn];
                    if (!acc[groupKey]) acc[groupKey] = [];
                    acc[groupKey].push(item);
                    return acc;
                }, {});

                const sortedGroups = Object.keys(grouped).sort((a, b) => {
                    const config = sortConfig.find(c => c.key === groupByColumn);
                    if (config) {
                        const type = inferredTypes[groupByColumn];
                        const comparison = type === 'number' ? (a - b) : String(a).localeCompare(String(b));
                        return config.direction === 'ascending' ? comparison : -comparison;
                    }
                    return String(a).localeCompare(String(b));
                });

                sortableData = [];
                sortedGroups.forEach(groupKey => {
                    const groupData = grouped[groupKey];
                    groupData.sort((a, b) => {
                        let result = 0;
                        for (let config of sortConfig) {
                            const { key, direction } = config;
                            const valueA = a[key];
                            const valueB = b[key];
                            const columnType = inferredTypes[key];

                            let comparison;
                            if (columnType === 'number') {
                                comparison = valueA - valueB;
                            } else {
                                comparison = String(valueA).localeCompare(String(valueB));
                            }

                            if (comparison !== 0 && result === 0) {
                                result = direction === 'ascending' ? comparison : -comparison;
                            }
                        }
                        return result;
                    });
                    sortableData.push(...groupData);
                });
            } else {
                sortableData.sort((a, b) => {
                    let result = 0;
                    for (let config of sortConfig) {
                        const { key, direction } = config;
                        const valueA = a[key];
                        const valueB = b[key];
                        const columnType = inferredTypes[key];

                        let comparison;
                        if (columnType === 'number') {
                            comparison = valueA - valueB;
                        } else {
                            comparison = String(valueA).localeCompare(String(valueB));
                        }

                        if (comparison !== 0 && result === 0) {
                            result = direction === 'ascending' ? comparison : -comparison;
                        }
                    }
                    return result;
                });
            }
        }
        return sortableData;
    }, [data, sortConfig, groupByColumn]);

    const handleSort = (key) => {
        setSortConfig((prevConfig) => {
            const existingSortIndex = prevConfig.findIndex(c => c.key === key);
            let newConfig = [...prevConfig];

            if (existingSortIndex >= 0) {
                const existingSort = newConfig[existingSortIndex];
                if (existingSort.direction === 'ascending') {
                    newConfig[existingSortIndex] = { key, direction: 'descending' };
                } else {
                    newConfig.splice(existingSortIndex, 1);
                }
            } else {
                newConfig.push({ key, direction: 'ascending' });
            }

            return newConfig;
        });
    };

    const getSortIndicator = (key) => {
        const sort = sortConfig.find(c => c.key === key);
        if (!sort) return '↕';
        return sort.direction === 'ascending' ? '↑' : '↓';
    };

    return {
        sortedData,
        handleSort,
        getSortIndicator,
        sortConfig
    };
};

// GroupBy Hook
const useGroupBy = (data, groupByColumn = null) => {
    const groupedData = useMemo(() => {
        if (!groupByColumn || !data.length) return { flatData: data, groups: null };

        const groups = data.reduce((acc, item) => {
            const groupKey = item[groupByColumn];
            if (!acc[groupKey]) acc[groupKey] = [];
            acc[groupKey].push(item);
            return acc;
        }, {});

        const flatData = [];
        Object.keys(groups).forEach((groupKey) => {
            flatData.push({ isGroupHeader: true, groupKey, groupSize: groups[groupKey].length });
            flatData.push(...groups[groupKey]);
        });

        return { flatData, groups };
    }, [data, groupByColumn]);

    return groupedData;
};

// Table Component
const Table = ({ data, columns }) => {
    const [groupByColumn, setGroupByColumn] = useState(null);
    const { sortedData, handleSort, getSortIndicator, sortConfig } = useMultiSort(data, groupByColumn);
    const { flatData: groupedData } = useGroupBy(sortedData, groupByColumn);
    const {
        paginatedData,
        currentPage,
        setCurrentPage,
        pageSize,
        setPageSize,
        totalPages,
        totalItems
    } = usePagination(groupedData);

    const getRowKey = (row, index) => {
        if (row.isGroupHeader) return `group-${row.groupKey}`;
        return `${row.id}-${index}`;
    };

    const PaginationControls = () => (
        <div className="pagination">
            <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
            >
                Previous
            </button>

            <span>
        Page {currentPage} of {totalPages} ({totalItems} items)
      </span>

            <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
            >
                Next
            </button>

            <select
                value={pageSize}
                onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                }}
            >
                {[5, 10, 20, 50].map(size => (
                    <option key={size} value={size}>
                        {size} per page
                    </option>
                ))}
            </select>
        </div>
    );

    return (
        <div className="table-container">
            <div className="group-controls">
                <label>Group by: </label>
                <select
                    value={groupByColumn || ''}
                    onChange={(e) => {
                        setGroupByColumn(e.target.value || null);
                        setCurrentPage(1);
                    }}
                >
                    <option value="">None</option>
                    {columns.map((col) => (
                        <option key={col.accessor} value={col.accessor}>
                            {col.header}
                        </option>
                    ))}
                </select>
            </div>

            <table>
                <thead>
                <tr>
                    {columns.map((column) => (
                        <th
                            key={column.accessor}
                            onClick={() => {
                                handleSort(column.accessor);
                                setCurrentPage(1);
                            }}
                            className="sortable"
                        >
                            {column.header}
                            <span className="sort-indicator">
                  {getSortIndicator(column.accessor)}
                </span>
                        </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {paginatedData.map((row, index) => (
                    row.isGroupHeader ? (
                        <tr key={getRowKey(row, index)} className="group-header">
                            <td colSpan={columns.length}>
                                {groupByColumn}: {row.groupKey} ({row.groupSize} items)
                            </td>
                        </tr>
                    ) : (
                        <tr key={getRowKey(row, index)}>
                            {columns.map((column) => (
                                <td key={column.accessor}>
                                    {column.cell ? column.cell(row) : row[column.accessor]}
                                </td>
                            ))}
                        </tr>
                    )
                ))}
                </tbody>
            </table>
            <PaginationControls />
            <pre>Sort Config: {JSON.stringify(sortConfig, null, 2)}</pre>
        </div>
    );
};

// Example usage
const App = () => {
    const columns = [
        { header: 'ID', accessor: 'id' },
        { header: 'Name', accessor: 'name' },
        { header: 'Age', accessor: 'age' },
        {
            header: 'Status',
            accessor: 'status',
            cell: (row) => <span className={`status-${row.status}`}>{row.status}</span>
        }
    ];

    const data = [
        { id: 1, name: 'John', age: 25, status: 'active' },
        { id: 7, name: 'John', age: 22, status: 'inactive' },
        { id: 2, name: 'Alice', age: 30, status: 'inactive' },
        { id: 3, name: 'Bob', age: 22, status: 'active' },
        { id: 4, name: 'Emma', age: 28, status: 'pending' },
        { id: 5, name: 'David', age: 35, status: 'inactive' },
        { id: 6, name: 'Charlie', age: 25, status: 'active' }
    ];

    return <Table data={data} columns={columns} />;
};

export default App;