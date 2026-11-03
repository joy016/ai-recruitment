"use client";

import { Box, Button, Skeleton, Typography } from "@mui/material";

interface AnalyticsChartFrameProps {
  title: string;
  height: number;
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  onRetry: () => void;
  children: React.ReactNode;
}

const AnalyticsChartFrame = ({
  title,
  height,
  isLoading,
  isError,
  isEmpty,
  onRetry,
  children,
}: AnalyticsChartFrameProps) => {
  return (
    <Box>
      <Typography
        variant="subtitle2"
        sx={{ fontWeight: 700, color: "#264a66", mb: 1 }}
      >
        {title}
      </Typography>

      {isLoading ? (
        <Skeleton variant="rounded" height={height} />
      ) : isError ? (
        <Box
          sx={{
            height,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
          }}
        >
          <Typography variant="body2" sx={{ color: "#a84b4b" }}>
            Couldn&apos;t load this chart.
          </Typography>
          <Button size="small" variant="outlined" onClick={onRetry}>
            Retry
          </Button>
        </Box>
      ) : isEmpty ? (
        <Box
          sx={{
            height,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="body2" sx={{ color: "#5f8199" }}>
            No data yet
          </Typography>
        </Box>
      ) : (
        children
      )}
    </Box>
  );
};

export default AnalyticsChartFrame;
