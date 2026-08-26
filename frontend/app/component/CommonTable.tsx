"use client";

import React from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from "@mui/material";
import { JOBS_PAGE_SIZE_OPTIONS } from "../(constants)/job";

export interface CommonTableColumn<T> {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
  /** Optional muted sub-line, rendered only under the first column. */
  secondary?: (row: T) => React.ReactNode;
}

interface CommonTableProps<T> {
  columns: CommonTableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string | number;
  emptyMessage?: string;
  pageSize: number;
  pageNumber: number;
  totalCount: number;
  onPageChange: (pageNumber: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

function CommonTable<T>({
  columns,
  data,
  getRowKey,
  emptyMessage = "No records found.",
  pageSize,
  pageNumber,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: Readonly<CommonTableProps<T>>) {
  return (
    <Box>
      <TableContainer sx={{ overflowX: "auto" }}>
        <Table sx={{ minWidth: 760 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: "#f7fbfe" }}>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  sx={{ fontWeight: 700, color: "#264a66" }}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <Typography
                    variant="body2"
                    sx={{ color: "#6b879c", py: 1.5, textAlign: "center" }}
                  >
                    {emptyMessage}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={getRowKey(row)} hover>
                  {columns.map((column, index) =>
                    index === 0 ? (
                      <TableCell key={column.key}>
                        <Typography sx={{ fontWeight: 700, color: "#244964" }}>
                          {column.render(row)}
                        </Typography>
                        {column.secondary && (
                          <Typography variant="body2" sx={{ color: "#6b879c" }}>
                            {column.secondary(row)}
                          </Typography>
                        )}
                      </TableCell>
                    ) : (
                      <TableCell key={column.key}>
                        {column.render(row)}
                      </TableCell>
                    ),
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {data.length > 0 && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2.5 }}>
          <TablePagination
            component="div"
            count={totalCount}
            page={pageNumber - 1}
            onPageChange={(_event, newPage) => onPageChange(newPage + 1)}
            rowsPerPage={pageSize}
            onRowsPerPageChange={(event) =>
              onPageSizeChange(Number(event.target.value))
            }
            rowsPerPageOptions={JOBS_PAGE_SIZE_OPTIONS}
            sx={{ color: "#567792" }}
          />
        </Box>
      )}
    </Box>
  );
}

export default CommonTable;
