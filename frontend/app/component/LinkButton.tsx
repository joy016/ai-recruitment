"use client";

import Link from "next/link";
import { Button, ButtonProps } from "@mui/material";

type LinkButtonProps = Omit<ButtonProps, "href"> & { href: string };

/**
 * MUI Button that navigates client-side via next/link. A plain
 * `<Button href>` renders an <a> that triggers a full page reload. Server
 * Components can't pass `component={Link}` themselves (functions aren't
 * serializable across the server/client boundary), so they use this instead.
 */
export default function LinkButton(props: Readonly<LinkButtonProps>) {
  return <Button component={Link} {...props} />;
}
