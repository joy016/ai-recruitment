"use client";

import CardContainer from "@/app/component/CardContainer";
import { getAllJobs } from "@/lib/api/job";
import React, { useState, useEffect } from "react";
import { useJobColumns } from "../(hooks)/useDashboardColumns";
import { JobItem } from "@/lib/types/job";
import { JOBS_PAGE_SIZE } from "@/app/(constants)/job";
import { Box, Typography } from "@mui/material";
import CommonTable from "@/app/component/CommonTable";

interface OpenJobsProps {
  setTotalJobCount: React.Dispatch<React.SetStateAction<number>>;
  totalJobCount: number;
  isVisible: boolean;
}

const OpenJobs = ({
  setTotalJobCount,
  totalJobCount,
  isVisible,
}: OpenJobsProps) => {
  const [jobPosts, setJobPosts] = useState<JobItem[]>([]);
  const [jobPageNumber, setJobPageNumber] = useState(1);
  const [jobPageSize, setJobPageSize] = useState(JOBS_PAGE_SIZE);

  const jobColumns = useJobColumns();

  const fetchInitialOpenJobs = async () => {
    try {
      const response = await getAllJobs("Open", jobPageNumber, jobPageSize);
      setJobPosts(response.data);
      setTotalJobCount(response.totalCount || 0);
    } catch (error) {
      console.error("Failed to fetch open jobs:", error);
    }
  };

  const handleJobPageChange = (nextPageNumber: number) => {
    setJobPageNumber(nextPageNumber);
  };

  useEffect(() => {
    fetchInitialOpenJobs();
  }, [jobPageNumber, jobPageSize]);

  if (!isVisible) {
    return null;
  }

  return (
    <CardContainer>
      <Box
        sx={{
          px: { xs: 1.5, sm: 2.5 },
          py: 2,
          borderBottom: "1px solid #e5f0f7",
          background: "linear-gradient(180deg, #f9fcff 0%, #f3faff 100%)",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#17456a" }}>
          Open Job Posts
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5, color: "#5f8199" }}>
          Monitor active openings, department demand, and applicant volume.
        </Typography>
      </Box>

      <CommonTable
        columns={jobColumns}
        data={jobPosts}
        getRowKey={(a) => a.jobId}
        pageSize={jobPageSize}
        pageNumber={jobPageNumber}
        totalCount={totalJobCount}
        onPageChange={handleJobPageChange}
        onPageSizeChange={(newPageSize) => setJobPageSize(newPageSize)}
      />
    </CardContainer>
  );
};

export default OpenJobs;
