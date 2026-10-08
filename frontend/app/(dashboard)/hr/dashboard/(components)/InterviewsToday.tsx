import React, { useEffect, useState } from "react";
import CardContainer from "@/app/component/CardContainer";
import { Box, Typography } from "@mui/material";
import { CandidatesInterviewToday } from "../../candidates/(types)/candidates.types";
import { getCandidatesForInterviewToday } from "@/lib/api/candidate";
import CommonTable from "@/app/component/CommonTable";
import { useForInterviewColumns } from "../(hooks)/useDashboardColumns";

interface InterviewsTodayProps {
  isVisible: boolean;
  setInterviewsTodayCount: React.Dispatch<React.SetStateAction<number>>;
  interviewsTodayCount: number;
}

const InterviewsToday = ({
  isVisible,
  setInterviewsTodayCount,
  interviewsTodayCount,
}: InterviewsTodayProps) => {
  const columns = useForInterviewColumns();
  const [data, setData] = useState<CandidatesInterviewToday[]>([]);
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    pageNumber: 1,
  });

  useEffect(() => {
    const fetchCandidates = async () => {
      const candidate = await getCandidatesForInterviewToday(
        paginationModel.pageNumber,
        paginationModel.pageSize,
      );

      console.log(candidate);
      setInterviewsTodayCount(candidate.totalCount);
      setData(candidate.data);
    };

    fetchCandidates();
  }, []);

  if (!isVisible) {
    return null;
  }

  const handleJobPageSizeChange = (newPageSize: number) => {
    setPaginationModel({
      pageSize: newPageSize,
      pageNumber: 1,
    });
  };

  const handleJobPageChange = (newPage: number) => {
    setPaginationModel((prev) => ({
      ...prev,
      pageNumber: newPage,
    }));
  };

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
          Interview Schedule Today
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5, color: "#5f8199" }}>
          Review today&apos;s candidates, interview stage, assigned interviewer,
          and meeting channel.
        </Typography>
      </Box>

      <CommonTable
        columns={columns}
        data={data}
        getRowKey={(a) => a.candidateId}
        pageSize={paginationModel.pageSize}
        pageNumber={paginationModel.pageNumber}
        totalCount={interviewsTodayCount}
        onPageChange={handleJobPageChange}
        onPageSizeChange={handleJobPageSizeChange}
      />
    </CardContainer>
  );
};

export default InterviewsToday;
