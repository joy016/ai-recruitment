"use client";

import CardContainer from "@/app/component/CardContainer";
import CommonTable from "@/app/component/CommonTable";
import { Box, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import { NewCandidates } from "../../candidates/(types)/candidates.types";
import { useApplicantsColumns } from "../(hooks)/useDashboardColumns";
import { getNewCandidates } from "@/lib/api/candidate";

interface NewApplicantsProps {
  isVisible: boolean;
  setNewApplicantCount: React.Dispatch<React.SetStateAction<number>>;
  newApplicantCount: number;
}

const NewApplicants = ({
  isVisible,
  setNewApplicantCount,
  newApplicantCount,
}: NewApplicantsProps) => {
  const applicantsColumns = useApplicantsColumns();
  const [localApplicants, setLocalApplicants] = useState<NewCandidates[]>([]);
  const [pageSize, setPageSize] = useState(10);
  const [pageNumber, setPageNumber] = useState(1);

  const fetchNewCandidates = async () => {
    try {
      const response = await getNewCandidates(pageNumber, pageSize);
      setLocalApplicants(response.data);
      setNewApplicantCount(response.totalCount);
    } catch (error) {
      console.error("Failed to fetch new candidates:", error);
    }
  };

  const handleJobPageChange = (nextPageNumber: number) => {
    setPageNumber(nextPageNumber);
  };

  useEffect(() => {
    fetchNewCandidates();
  }, [pageNumber, pageSize]);

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
          New Applicants
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5, color: "#5f8199" }}>
          Review the latest candidates entering the hiring pipeline today.
        </Typography>
      </Box>

      <CommonTable
        columns={applicantsColumns}
        data={localApplicants}
        getRowKey={(a) => a.candidateId}
        pageSize={pageSize}
        pageNumber={pageNumber}
        totalCount={newApplicantCount}
        onPageChange={handleJobPageChange}
        onPageSizeChange={(newPageSize) => setPageSize(newPageSize)}
      />
    </CardContainer>
  );
};

export default NewApplicants;
