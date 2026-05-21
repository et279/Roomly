export type EventType =
  | "TASK_COMPLETED"
  | "SHOPPING_COMPLETED"
  | "CONTRIBUTION_PAID"
  | "GOAL_REACHED"
  | "MEMBER_JOINED";

export interface TaskCompletedPayload {
  userId: string;
  homeId: string;
  taskId: string;
  dueDate: string | null;
  completedAt: string;
}

export interface ShoppingCompletedPayload {
  userId: string;
  homeId: string;
  itemId: string;
}

export interface ContributionPaidPayload {
  userId: string;
  homeId: string;
  contributionId: string;
  amount: number;
}

export interface GoalReachedPayload {
  homeId: string;
  goalId: string;
  goalName: string;
  targetAmount: number;
}

export interface MemberJoinedPayload {
  userId: string;
  homeId: string;
}

export type AppEventPayloadMap = {
  TASK_COMPLETED: TaskCompletedPayload;
  SHOPPING_COMPLETED: ShoppingCompletedPayload;
  CONTRIBUTION_PAID: ContributionPaidPayload;
  GOAL_REACHED: GoalReachedPayload;
  MEMBER_JOINED: MemberJoinedPayload;
};

export interface AppEvent<T extends EventType = EventType> {
  type: T;
  payload: AppEventPayloadMap[T];
  timestamp: string;
}
