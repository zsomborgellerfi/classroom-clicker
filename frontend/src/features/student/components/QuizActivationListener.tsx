import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { UserRole } from "@/enums/userRole";
import { useTranslation } from "@/hooks/useTranslation";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import { useAppSelector } from "@/store/hooks";
import { fetchStudentDashboard } from "@/features/student/api/dashboard";

const DISMISSED_STORAGE_KEY = "student_quiz_notifications:dismissed";

const loadDismissedIds = (): Set<string> => {
  if (typeof window === "undefined") {
    return new Set();
  }
  try {
    const raw = window.localStorage.getItem(DISMISSED_STORAGE_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed);
  } catch {
    return new Set();
  }
};

const persistDismissedIds = (ids: Set<string>) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(
    DISMISSED_STORAGE_KEY,
    JSON.stringify(Array.from(ids)),
  );
};

type QuizActivationPayload = {
  quizId: string;
  quizTitle: string;
  activatedAt?: string | null;
  availableUntil?: string | null;
  timeLimitSeconds?: number | null;
  lessonId: string;
  lessonTitle: string;
  classId: string;
  className: string;
};

export function QuizActivationListener() {
  const { user, token } = useAppSelector((state) => state.auth);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [notification, setNotification] = useState<QuizActivationPayload | null>(null);
  const lastShownQuizIdRef = useRef<string | null>(null);
  const dismissedQuizIdsRef = useRef<Set<string>>(loadDismissedIds());

  useEffect(() => {
    if (!token || user?.role !== UserRole.STUDENT) {
      disconnectSocket();
      setNotification(null);
      lastShownQuizIdRef.current = null;
      return;
    }

    const presentNotification = (payload: QuizActivationPayload) => {
      if (
        lastShownQuizIdRef.current === payload.quizId ||
        dismissedQuizIdsRef.current.has(payload.quizId)
      ) {
        return;
      }
      lastShownQuizIdRef.current = payload.quizId;
      setNotification(payload);
    };

    const preloadActiveQuiz = async () => {
      try {
        const data = await queryClient.fetchQuery({
          queryKey: ["student-dashboard"],
          queryFn: fetchStudentDashboard,
        });
        const firstActive = data.activeQuizzes?.[0];
        if (firstActive) {
          presentNotification({
            quizId: firstActive.id,
            quizTitle: firstActive.title,
            lessonId: firstActive.lesson.id,
            lessonTitle: firstActive.lesson.title,
            classId: firstActive.lesson.class.id,
            className: firstActive.lesson.class.name,
          });
        }
      } catch (error) {
        console.error("Error loading student dashboard for notifications", error);
      }
    };

    preloadActiveQuiz();

    const socket = connectSocket(token);

    if (!socket) {
      return;
    }

    const handleQuizActivated = (payload: QuizActivationPayload) => {
      presentNotification(payload);
      queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });
    };

    socket.on("quiz:activated", handleQuizActivated);

    return () => {
      socket.off("quiz:activated", handleQuizActivated);
    };
  }, [token, user?.role, queryClient]);

  const markDismissed = (quizId: string) => {
    if (dismissedQuizIdsRef.current.has(quizId)) {
      return;
    }
    dismissedQuizIdsRef.current.add(quizId);
    persistDismissedIds(dismissedQuizIdsRef.current);
  };

  if (!notification) {
    return null;
  }

  const handleClose = () => {
    markDismissed(notification.quizId);
    setNotification(null);
  };

  const handleNavigate = () => {
    if (!notification) {
      return;
    }

    markDismissed(notification.quizId);
    navigate(
      `/student/classes/${notification.classId}/lessons/${notification.lessonId}/quizzes/${notification.quizId}`,
    );
    setNotification(null);
  };

  return (
    <Dialog open={Boolean(notification)} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <NotificationsActiveIcon color="primary" />
        {t("student.notifications.quizActivated.title")}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography variant="h6">{notification.quizTitle}</Typography>
          <Typography color="text.secondary">
            {notification.className} · {notification.lessonTitle}
          </Typography>
          <Typography>
            {t("student.notifications.quizActivated.message", {
              className: notification.className,
              lessonTitle: notification.lessonTitle,
            })}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>{t("student.notifications.quizActivated.dismiss")}</Button>
        <Button variant="contained" onClick={handleNavigate}>
          {t("student.notifications.quizActivated.cta")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
