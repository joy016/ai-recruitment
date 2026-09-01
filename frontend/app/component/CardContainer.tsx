"use client";

import React from "react";
import Paper from "@mui/material/Paper";

const CardContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, sm: 2.2, md: 3 },
        mt: 2.4,
        borderRadius: 3,
        border: "1px solid #d7e8f5",
        backgroundColor: "#ffffff",
        overflow: "hidden",
      }}
    >
      {children}
    </Paper>
  );
};

export default CardContainer;
