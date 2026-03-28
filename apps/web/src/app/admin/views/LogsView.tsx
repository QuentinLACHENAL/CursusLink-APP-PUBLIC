interface LogsViewProps {
  loading: boolean;
}

export default function LogsView({ loading }: LogsViewProps) {
  if (loading) return <div className="text-center p-10 text-slate-500">Chargement des logs...</div>;
  return <div className="text-center p-10 text-slate-500">Logs chargés... (Composant à implémenter)</div>;
}
