import { useState, useMemo } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

// Pagination Hook (unchanged)
const usePagination = (data, initialPageSize = 10) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(initialPageSize);

    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedData = data.slice(startIndex, startIndex + pageSize);

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

// Updated Multi-column Sorting Hook with type inference
const useMultiSort = (data) => {
    const [sortConfig, setSortConfig] = useState([]);

    const sortedData = useMemo(() => {
        let sortableData = [...data];

        if (sortConfig.length > 0 && data.length > 0) {
            // Infer types from first row
            const firstRow = data[0];
            const inferredTypes = Object.keys(firstRow).reduce((acc, key) => {
                acc[key] = typeof firstRow[key] === 'number' ? 'number' : 'string';
                return acc;
            }, {});

            sortableData.sort((a, b) => {
                let result = 0;

                // Process sort conditions in original order (first click = highest priority)
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
        return sortableData;
    }, [data, sortConfig]);

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
        sortConfig // For debugging
    };
};

// Table Component
const Table = ({ data, columns }) => {
    const { sortedData, handleSort, getSortIndicator, sortConfig } = useMultiSort(data);
    const {
        paginatedData,
        currentPage,
        setCurrentPage,
        pageSize,
        setPageSize,
        totalPages
    } = usePagination(sortedData);

    const PaginationControls = () => (
        <div className="pagination">
            <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
            >
                Previous
            </button>

            <span>
        Page {currentPage} of {totalPages}
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
                    <tr key={index}>
                        {columns.map((column) => (
                            <td key={column.accessor}>
                                {column.cell ? column.cell(row) : row[column.accessor]}
                            </td>
                        ))}
                    </tr>
                ))}
                </tbody>
            </table>
            <PaginationControls />
            {/* Debug display */}
            <pre>Sort Config: {JSON.stringify(sortConfig, null, 2)}</pre>
        </div>
    );
};

// Example usage with more data
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
        { id: 2, name: 'Alice', age: 30, status: 'inactive' },
        { id: 3, name: 'Bob', age: 22, status: 'active' },
        { id: 4, name: 'Emma', age: 28, status: 'pending' },
        { id: 5, name: 'David', age: 35, status: 'inactive' },
        { id: 6, name: 'Charlie', age: 25, status: 'active' }
    ];

    return <Table data={data} columns={columns} />;
};

export default App;