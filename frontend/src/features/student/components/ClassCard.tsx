import {
  Card,
  CardActions,
  CardContent,
  Button,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

import type { Class, User } from "@shared/types";

import { useTranslation } from "@/hooks/useTranslation";

type StudentClass = Class & {
  teacher?: Pick<User, "id" | "firstName" | "lastName">;
  _count?: {
    students: number;
    lessons: number;
  };
};

interface ClassCardProps {
  classItem: StudentClass;
}

export function ClassCard({ classItem }: ClassCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Card
      variant="outlined"
      sx={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" gutterBottom>
          {classItem.name}
        </Typography>
        {classItem.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {classItem.description}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary">
          {t("student.classes.card.teacher")}: {classItem.teacher?.firstName} {classItem.teacher?.lastName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("student.classes.card.lessons")}:{" "}
          {classItem._count?.lessons ?? 0}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("student.classes.card.students")}:{" "}
          {classItem._count?.students ?? 0}
        </Typography>
      </CardContent>
      <CardActions>
        <Button
          size="small"
          onClick={() => navigate(`/student/classes/${classItem.id}`)}
        >
          {t("student.classes.actions.viewDetails")}
        </Button>
      </CardActions>
    </Card>
  );
}
