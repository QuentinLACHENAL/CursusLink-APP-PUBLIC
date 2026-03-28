import UsersTab from '../components/UsersTab';

interface UsersViewProps {
  users: any[];
  loading: boolean;
}

export default function UsersView({ users, loading }: UsersViewProps) {
  if (loading && !users.length) return <div>Chargement...</div>;
  return <UsersTab users={users} />;
}
