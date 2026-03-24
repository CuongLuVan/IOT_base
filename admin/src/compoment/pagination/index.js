import React, {useState,useEffect } from 'react';

const Pagination = ({ totalPages,handerPages,inputPages }) => {
  const [currentPage, setCurrentPage] = useState(inputPages);

    useEffect(() => {
        goToPage(inputPages)
    }, [inputPages]);
    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            handerPages(page);
        setCurrentPage(page);
        }
    };

    const renderPageNumbers = () => {
        let pages = [];
        let startPage = Math.max(2, currentPage - 2);
        let endPage = Math.min(totalPages - 1, currentPage + 2);
        
        if (totalPages <= 5) {
            startPage = 1;
            endPage = totalPages;
        } else {
            if (currentPage <= 3) {
                endPage = 6;
            }
            if (currentPage >= totalPages - 2) {
                startPage = totalPages - 5;
            }
        }
        
        if (startPage > 2 && totalPages > 5) {
            pages.push(
                <button key="dots-start" className="px-3 py-1 mx-1 border" onClick={() => goToPage(startPage - 1)}>...</button>
            );
        }
        
        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <button
                key={i}
                className={`px-3 py-1 mx-1 border ${currentPage === i ? "div-padding-border div-padding-color" : "bg-white"}`}
                onClick={() => goToPage(i)}
                >
                {i}
                </button>
            );
        }
        
        if (endPage < totalPages - 1 && totalPages > 5) {
            pages.push(
                <button key="dots-end" className="px-3 py-1 mx-1 border" onClick={() => goToPage(endPage + 1)}>...</button>
            );
        }
            

        return pages;
    };

    return (
        <div className="flex items-center space-x-2">
        <button onClick={() => goToPage(1)} disabled={currentPage === 1} className={"px-3 py-1 border " + (currentPage === 1?"div-padding-border div-padding-color":"")}>Trang đầu</button>
        <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1 border">Trước</button>
        {renderPageNumbers()}
        <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-1 border">Tếp</button>
        <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} className="px-3 py-1 border">cuối</button>
        </div>
    );
};

export default Pagination;
