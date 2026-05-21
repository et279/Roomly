export interface AppContext {
  user: { id: string; email: string };
  home: { id: string; name: string };
  membership: { id: string; role: string | null };
  permissions: string[];
}
