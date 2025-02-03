import {
  Breadcrumbs as MuiBreadcrumbs,
  Link,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <MuiBreadcrumbs sx={{ mb: 2 }}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        if (isLast) {
          return (
            <Typography key={item.label} color="text.primary">
              {item.label}
            </Typography>
          );
        }

        return (
          <Link
            key={item.label}
            component={RouterLink}
            to={item.path || "#"}
            color="inherit"
            underline="hover"
          >
            {item.label}
          </Link>
        );
      })}
    </MuiBreadcrumbs>
  );
} 