import { Box, Divider, Skeleton, Stack } from "@mui/material";
import { INBOX_COLORS } from "../(constants)/inbox.constants";

export function MessageListSkeleton({ rows = 7 }: Readonly<{ rows?: number }>) {
  return (
    <Box aria-busy="true" aria-label="Loading messages">
      {Array.from({ length: rows }, (_, index) => (
        <Box key={index}>
          <Stack direction="row" spacing={1.5} sx={{ px: 2, py: 1.5 }}>
            <Skeleton variant="circular" width={38} height={38} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Skeleton width="40%" />
                <Skeleton width={42} />
              </Stack>
              <Skeleton width="70%" />
              <Skeleton width="90%" />
            </Box>
          </Stack>
          <Divider sx={{ borderColor: INBOX_COLORS.divider }} />
        </Box>
      ))}
    </Box>
  );
}

export function MessageViewerSkeleton() {
  return (
    <Box aria-busy="true" aria-label="Loading message" sx={{ p: { xs: 2, md: 3 } }}>
      <Skeleton width="60%" height={36} />
      <Stack direction="row" spacing={1} sx={{ my: 1.5 }}>
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} variant="circular" width={32} height={32} />
        ))}
      </Stack>
      <Skeleton variant="rounded" height={96} sx={{ borderRadius: 2, mb: 2.5 }} />
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <Skeleton variant="circular" width={40} height={40} />
        <Box sx={{ flex: 1 }}>
          <Skeleton width="35%" />
          <Skeleton width="50%" />
        </Box>
      </Stack>
      {[95, 88, 92, 60, 80, 40].map((width) => (
        <Skeleton key={width} width={`${width}%`} />
      ))}
      <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
        <Skeleton variant="rounded" width={200} height={56} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rounded" width={200} height={56} sx={{ borderRadius: 2 }} />
      </Stack>
    </Box>
  );
}
