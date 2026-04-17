/*
This file keeps the shared frontend types for auth, review, and API payloads.
Edit this file when backend JSON shapes shared with the frontend change.
Copy a type pattern here when you add another shared API type.
*/

export type User = {
  id: number;
  username: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateUserResponse = {
  user: User;
};

export type ApiOk<T> = {
  ok: true;
  data: T;
};

export type ApiFail = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

export type ApiResponse<T> = ApiOk<T> | ApiFail;

export type ReviewRating = 1 | 2 | 3 | 4;

export type CardPhase = "new" | "learning" | "review" | "relearning";
export type CardTemplateType = "term_definition" | "directional" | "trim" | "manoeuvre" | "right_of_way" | "concept";

export type FsrsState = {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: string | null;
};

export type ReviewCardState = {
  phase: CardPhase;
  due_at: string;
  last_reviewed_at: string | null;
  fsrs_state: FsrsState;
};

export type ReviewCard = {
  id: number;
  deck_slug: string;
  template_type: CardTemplateType;
  prompt: string;
  answer: string;
  explanation: string;
  diagram_spec: Record<string, unknown>;
  tags: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
  state?: ReviewCardState | null;
};

export type ReviewQueueItem = ReviewCard;

export type UserSettings = {
  desired_retention: number;
  new_cards_per_day: number;
  reviews_per_day: number | null;
};

export type TodayStats = {
  review_count: number;
  average_rating: number | null;
};

export type DailyReviewPoint = {
  day: string;
  review_count: number;
};

export type RatingDistributionPoint = {
  rating: ReviewRating;
  count: number;
};

export type HardestCardStat = {
  card_id: number;
  deck_slug: string;
  deck_title: string;
  prompt: string;
  again_count: number;
  review_count: number;
};

export type OverallProgress = {
  review_cards: number;
  total_cards: number;
  percent_review: number;
};

export type ReviewQueueSummary = {
  due_count: number;
  new_count: number;
  deck_slug: string | null;
};

export type DeckProgress = {
  deck_slug: string;
  title: string;
  total_cards: number;
  new_cards: number;
  learning_cards: number;
  review_cards: number;
};

export type ReviewSummary = {
  due_count: number;
  new_count: number;
  studied_cards_count: number;
  streak_days: number;
  deck_progress: DeckProgress[];
};

export type StatsResponse = {
  today: TodayStats;
  activity_30d: DailyReviewPoint[];
  rating_distribution_30d: RatingDistributionPoint[];
  deck_progress: DeckProgress[];
  hardest_cards: HardestCardStat[];
  overall_progress: OverallProgress;
  streak_days: number;
  studied_cards_count: number;
};

export type DeckListProgress = {
  total_cards: number;
  new_cards: number;
  learning_cards: number;
  review_cards: number;
};

export type DeckListItem = {
  slug: string;
  title: string;
  description: string;
  builtin: boolean;
  card_count: number;
  progress?: DeckListProgress;
};

export type DeckDetail = DeckListItem;

export type CardsListResponse = {
  deck: DeckDetail;
  cards: ReviewCard[];
  total_count: number;
  limit: number;
  offset: number;
};
