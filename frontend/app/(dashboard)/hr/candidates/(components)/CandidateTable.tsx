"use client";

import Link from "next/link";
import {
  Box,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { Cancel, Edit, Save, Visibility } from "@mui/icons-material";
import { COLUMN_NAMES } from "../(constants)/constants";
import { Candidate } from "../(types)/candidates.types";
import { ApplicantStatusItem } from "@/lib/api/applicant-status";

const TABLE_HEIGHT = { xs: "62vh", md: "68vh" };
const DEFAULT_STATUS_COLOR = "#9bb7c9";

type CandidateTableProps = {
  isMobile: boolean;
  isLoading: boolean;
  candidates: Candidate[];
  editingApplicantId: string | null;
  draftStatusByApplicantId: Record<string, number>;
  savedStatusByApplicantId: Record<string, number>;
  savedScheduleByApplicantId: Record<string, string>;
  applicantStatuses: ApplicantStatusItem[];
  formatScheduleForDisplay: (value: string) => string;
  savingApplicantId: string | null;
  onStatusChange: (
    applicantId: string,
    event: SelectChangeEvent<number | "">,
  ) => void;
  onEditStatus: (applicantId: string) => void;
  onSaveStatus: (applicantId: string) => void;
  onCancelStatus: (applicantId: string) => void;
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onPageSizeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function CandidateTable({
  isMobile,
  isLoading,
  candidates,
  editingApplicantId,
  draftStatusByApplicantId,
  savedStatusByApplicantId,
  savedScheduleByApplicantId,
  applicantStatuses,
  formatScheduleForDisplay,
  savingApplicantId,
  onStatusChange,
  onEditStatus,
  onSaveStatus,
  onCancelStatus,
  pageNumber,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: Readonly<CandidateTableProps>) {
  const theme = useTheme();

  const getStatusById = (statusId: number) =>
    applicantStatuses.find((status) => status.statusId === statusId);

  const renderStatusChip = (statusId: number) => {
    const status = getStatusById(statusId);
    const color = status?.color || DEFAULT_STATUS_COLOR;

    return (
      <Chip
        label={status?.statusName ?? "Unknown"}
        size="small"
        sx={{
          bgcolor: color,
          color: theme.palette.getContrastText(color),
          fontWeight: 600,
        }}
      />
    );
  };

  const pagination = (
    <TablePagination
      component="div"
      count={totalCount}
      page={pageNumber - 1}
      onPageChange={onPageChange}
      rowsPerPage={pageSize}
      onRowsPerPageChange={onPageSizeChange}
      rowsPerPageOptions={[10, 25, 50]}
      sx={{ color: "#264a66" }}
    />
  );

  if (isMobile) {
    return (
      <>
        <Box
          sx={{
            height: TABLE_HEIGHT,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            pr: 0.5,
          }}
        >
          {isLoading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
              }}
            >
              <CircularProgress size={28} sx={{ color: "#1f80b6" }} />
            </Box>
          ) : (
            <Stack spacing={1.2}>
              {candidates.map((candidate) => {
                const isEditing = editingApplicantId === candidate.id;
                const hasPendingStatusChange =
                  draftStatusByApplicantId[candidate.id] !==
                  savedStatusByApplicantId[candidate.id];
                const isSaving = savingApplicantId === candidate.id;

                return (
                  <Paper
                    key={candidate.id}
                    elevation={0}
                    sx={{
                      p: 1.3,
                      borderRadius: 2,
                      border: "1px solid #dfedf7",
                      bgcolor: "#fcfeff",
                    }}
                  >
                    <Stack spacing={0.8}>
                      <Typography sx={{ fontWeight: 700, color: "#1d4f72" }}>
                        {candidate.firstName} {candidate.lastName}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#52718c" }}>
                        {candidate.emailAddress}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#52718c" }}>
                        Application Date:{" "}
                        {formatScheduleForDisplay(
                          candidate.applicationDate ?? "",
                        )}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#52718c" }}>
                        Experience: {candidate.yearsOfExperience} years
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#52718c" }}>
                        Interview Sched:{" "}
                        {formatScheduleForDisplay(
                          savedScheduleByApplicantId[candidate.id],
                        )}
                      </Typography>

                      <Stack direction="row" spacing={1} sx={{ pt: 0.5 }}>
                        <Tooltip title="View resume">
                          <IconButton
                            component={Link}
                            href={`/hr/candidates/profile/${candidate.id}`}
                            aria-label={`View resume for ${candidate.firstName} ${candidate.lastName}`}
                            sx={{ color: "#1f80b6" }}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>

                        {isEditing ? (
                          <FormControl
                            size="small"
                            sx={{ flex: 1, minWidth: 0 }}
                          >
                            <Select
                              value={
                                draftStatusByApplicantId[candidate.id] ?? ""
                              }
                              onChange={(event) =>
                                onStatusChange(candidate.id, event)
                              }
                            >
                              {applicantStatuses.map((status) => (
                                <MenuItem
                                  key={status.statusId}
                                  value={status.statusId}
                                >
                                  {status.statusName}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ) : (
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            {renderStatusChip(
                              savedStatusByApplicantId[candidate.id],
                            )}
                          </Box>
                        )}

                        {!isEditing ? (
                          <Tooltip title="Edit status">
                            <IconButton
                              aria-label={`Edit status for ${candidate.firstName} ${candidate.lastName}`}
                              onClick={() => onEditStatus(candidate.id)}
                              sx={{ color: "#1f80b6" }}
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Stack direction="row" spacing={0.3}>
                            <IconButton
                              aria-label={`Save status for ${candidate.firstName} ${candidate.lastName}`}
                              onClick={() => onSaveStatus(candidate.id)}
                              disabled={!hasPendingStatusChange || isSaving}
                              sx={{
                                color: "#2f90c5",
                                "&.Mui-disabled": { color: "#9bb7c9" },
                              }}
                            >
                              {isSaving ? (
                                <CircularProgress size={18} color="inherit" />
                              ) : (
                                <Save />
                              )}
                            </IconButton>
                            <IconButton
                              aria-label={`Cancel status edit for ${candidate.firstName} ${candidate.lastName}`}
                              onClick={() => onCancelStatus(candidate.id)}
                              disabled={isSaving}
                              sx={{ color: "#7b94a8" }}
                            >
                              <Cancel />
                            </IconButton>
                          </Stack>
                        )}
                      </Stack>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Box>
        {pagination}
      </>
    );
  }

  return (
    <>
      <TableContainer
        sx={{
          width: "100%",
          maxWidth: "100%",
          height: TABLE_HEIGHT,
          overflow: "auto",
          overflowX: "auto",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorX: "contain",
          border: "1px solid #e1eef7",
          borderRadius: 2,
          bgcolor: "#ffffff",
        }}
      >
        <Table
          stickyHeader
          sx={{
            width: "100%",
            minWidth: 1100,
            "& th, & td": {
              whiteSpace: "nowrap",
            },
          }}
        >
          <TableHead>
            <TableRow sx={{ bgcolor: "#f2f9ff" }}>
              {COLUMN_NAMES.map((column) => (
                <TableCell
                  key={column.key}
                  sx={{
                    fontWeight: 700,
                    color: "#264a66",
                    bgcolor: "#f2f9ff",
                  }}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={COLUMN_NAMES.length}
                  align="center"
                  sx={{ py: 6 }}
                >
                  <CircularProgress size={28} sx={{ color: "#1f80b6" }} />
                </TableCell>
              </TableRow>
            ) : (
              candidates.map((candidate) => {
                const isEditing = editingApplicantId === candidate.id;
                const hasPendingStatusChange =
                  draftStatusByApplicantId[candidate.id] !==
                  savedStatusByApplicantId[candidate.id];
                const isSaving = savingApplicantId === candidate.id;

                return (
                  <TableRow key={candidate.id} hover>
                    <TableCell>
                      <Tooltip title="View resume">
                        <IconButton
                          component={Link}
                          href={`/hr/candidates/profile/${candidate.id}`}
                          aria-label={`View resume for ${candidate.firstName} ${candidate.lastName}`}
                          sx={{ color: "#1f80b6" }}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {formatScheduleForDisplay(
                        candidate.applicationDate ?? "",
                      )}
                    </TableCell>
                    <TableCell>{candidate.emailAddress}</TableCell>
                    <TableCell>{candidate.firstName}</TableCell>
                    <TableCell>{candidate.lastName}</TableCell>
                    <TableCell>{candidate.yearsOfExperience}</TableCell>
                    <TableCell>
                      {formatScheduleForDisplay(
                        savedScheduleByApplicantId[candidate.id],
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <FormControl size="small" sx={{ minWidth: 170 }}>
                          <Select
                            value={
                              draftStatusByApplicantId[candidate.id] ?? ""
                            }
                            onChange={(event) =>
                              onStatusChange(candidate.id, event)
                            }
                          >
                            {applicantStatuses.map((status) => (
                              <MenuItem
                                key={status.statusId}
                                value={status.statusId}
                              >
                                {status.statusName}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      ) : (
                        renderStatusChip(savedStatusByApplicantId[candidate.id])
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.6}>
                        {!isEditing ? (
                          <Tooltip title="Edit status">
                            <IconButton
                              aria-label={`Edit status for ${candidate.firstName} ${candidate.lastName}`}
                              onClick={() => onEditStatus(candidate.id)}
                              sx={{ color: "#1f80b6" }}
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <>
                            <Tooltip title="Save status">
                              <Box component="span">
                                <IconButton
                                  aria-label={`Save status for ${candidate.firstName} ${candidate.lastName}`}
                                  onClick={() => onSaveStatus(candidate.id)}
                                  disabled={!hasPendingStatusChange || isSaving}
                                  sx={{
                                    color: "#2f90c5",
                                    "&.Mui-disabled": { color: "#9bb7c9" },
                                  }}
                                >
                                  {isSaving ? (
                                    <CircularProgress
                                      size={18}
                                      color="inherit"
                                    />
                                  ) : (
                                    <Save />
                                  )}
                                </IconButton>
                              </Box>
                            </Tooltip>
                            <Tooltip title="Cancel edit">
                              <Box component="span">
                                <IconButton
                                  aria-label={`Cancel status edit for ${candidate.firstName} ${candidate.lastName}`}
                                  onClick={() => onCancelStatus(candidate.id)}
                                  disabled={isSaving}
                                  sx={{ color: "#7b94a8" }}
                                >
                                  <Cancel />
                                </IconButton>
                              </Box>
                            </Tooltip>
                          </>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {pagination}
    </>
  );
}
