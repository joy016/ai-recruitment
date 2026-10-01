import { ChangeEvent } from "react";

type PageHandlerOptions = {
  /** Runs before the page state updates, e.g. to flip on a loading flag. */
  onBeforeChange?: () => void;
};

/**
 * onPageChange handler for a component that already reports a 1-indexed
 * page number, such as CommonTable.
 */
export const createPageChangeHandler = (
  setPageNumber: (pageNumber: number) => void,
  options: PageHandlerOptions = {},
) => {
  return (pageNumber: number) => {
    options.onBeforeChange?.();
    setPageNumber(pageNumber);
  };
};

/**
 * onPageSizeChange handler for a component that already reports a plain
 * page-size number, such as CommonTable. Resets to page 1, since the
 * current page can fall out of range once the page size changes.
 */
export const createPageSizeChangeHandler = (
  setPageNumber: (pageNumber: number) => void,
  setPageSize: (pageSize: number) => void,
  options: PageHandlerOptions = {},
) => {
  return (pageSize: number) => {
    options.onBeforeChange?.();
    setPageNumber(1);
    setPageSize(pageSize);
  };
};

/**
 * onPageChange handler for MUI's TablePagination, which reports a
 * 0-indexed page and passes the triggering event as the first argument.
 */
export const createMuiPageChangeHandler = (
  setPageNumber: (pageNumber: number) => void,
  options: PageHandlerOptions = {},
) => {
  return (_event: unknown, newPage: number) => {
    options.onBeforeChange?.();
    setPageNumber(newPage + 1);
  };
};

/**
 * onRowsPerPageChange handler for MUI's TablePagination, which passes the
 * new size via a change event's target value. Resets to page 1.
 */
export const createMuiPageSizeChangeHandler = (
  setPageNumber: (pageNumber: number) => void,
  setPageSize: (pageSize: number) => void,
  options: PageHandlerOptions = {},
) => {
  return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    options.onBeforeChange?.();
    setPageNumber(1);
    setPageSize(Number(event.target.value));
  };
};
