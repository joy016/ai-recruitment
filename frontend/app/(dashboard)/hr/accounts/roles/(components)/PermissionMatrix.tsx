"use client";

import {
  Box,
  Checkbox,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  PermissionMatrix as PermissionMatrixData,
  getActionLabel,
} from "@/lib/utils/permissions";

type PermissionMatrixProps = {
  matrix: PermissionMatrixData;
  assignedIds: Set<number>;
  changedIds: Set<number>;
  disabled?: boolean;
  onToggle: (permissionId: number) => void;
  onToggleModule: (permissionIds: number[], grant: boolean) => void;
};

const CHANGED_BG = "#fff6e5";

export default function PermissionMatrix({
  matrix,
  assignedIds,
  changedIds,
  disabled = false,
  onToggle,
  onToggleModule,
}: Readonly<PermissionMatrixProps>) {
  return (
    <TableContainer
      sx={{ border: "1px solid #d7e8f5", borderRadius: 2.5, overflowX: "auto" }}
    >
      <Table size="small" sx={{ minWidth: 560 }}>
        <TableHead>
          <TableRow sx={{ bgcolor: "#f3f9fe" }}>
            <TableCell sx={{ fontWeight: 700, color: "#17456a", py: 1.4 }}>
              Module
            </TableCell>
            {matrix.actions.map((action) => (
              <TableCell
                key={action}
                align="center"
                sx={{ fontWeight: 700, color: "#17456a", width: 96 }}
              >
                {getActionLabel(action)}
              </TableCell>
            ))}
            <TableCell
              align="center"
              sx={{ fontWeight: 700, color: "#17456a", width: 96 }}
            >
              All
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {matrix.rows.map((row) => {
            const rowIds = Object.values(row.cells)
              .filter((cell) => cell !== undefined)
              .map((cell) => cell.permissionId);
            const grantedCount = rowIds.filter((id) => assignedIds.has(id)).length;
            const allGranted = rowIds.length > 0 && grantedCount === rowIds.length;
            const rowChanged = rowIds.some((id) => changedIds.has(id));

            return (
              <TableRow
                key={row.module}
                hover
                sx={{ "&:last-child td": { borderBottom: 0 } }}
              >
                <TableCell
                  sx={{
                    borderLeft: rowChanged
                      ? "3px solid #f0a020"
                      : "3px solid transparent",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography sx={{ fontWeight: 600, color: "#264a66" }}>
                      {row.label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#7d9ab0" }}>
                      {grantedCount}/{rowIds.length}
                    </Typography>
                    {rowChanged && (
                      <Chip
                        label="Edited"
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          color: "#9a5b00",
                          bgcolor: CHANGED_BG,
                        }}
                      />
                    )}
                  </Box>
                </TableCell>

                {matrix.actions.map((action) => {
                  const permission = row.cells[action];
                  if (!permission) {
                    return (
                      <TableCell
                        key={action}
                        align="center"
                        sx={{ color: "#b6c6d3" }}
                        aria-label="Not applicable"
                      >
                        —
                      </TableCell>
                    );
                  }

                  const changed = changedIds.has(permission.permissionId);
                  return (
                    <TableCell
                      key={action}
                      align="center"
                      sx={{ bgcolor: changed ? CHANGED_BG : undefined }}
                    >
                      <Checkbox
                        checked={assignedIds.has(permission.permissionId)}
                        onChange={() => onToggle(permission.permissionId)}
                        disabled={disabled}
                        slotProps={{
                          input: {
                            "aria-label": `${row.label} ${getActionLabel(action)}`,
                          },
                        }}
                        sx={{
                          color: "#9cbcd3",
                          "&.Mui-checked": {
                            color: changed ? "#e08a00" : "#1f80b6",
                          },
                        }}
                      />
                    </TableCell>
                  );
                })}

                <TableCell align="center">
                  <Checkbox
                    checked={allGranted}
                    indeterminate={grantedCount > 0 && !allGranted}
                    onChange={() => onToggleModule(rowIds, !allGranted)}
                    disabled={disabled || rowIds.length === 0}
                    slotProps={{
                      input: { "aria-label": `All ${row.label} permissions` },
                    }}
                    sx={{
                      color: "#9cbcd3",
                      "&.Mui-checked, &.MuiCheckbox-indeterminate": {
                        color: "#3bb8a4",
                      },
                    }}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
