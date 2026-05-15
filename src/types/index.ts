export type User = {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
};

export type House = {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
};

export type HouseMember = {
  id: string;
  house_id: string;
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
};
