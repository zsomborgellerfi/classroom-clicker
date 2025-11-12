export interface ClassInvite {
  id: string;
  code: string;
  classId: string;
  createdBy?: string | null;
  maxUses?: number | null;
  uses: number;
  expiresAt?: string | null;
  createdAt: string;
}
