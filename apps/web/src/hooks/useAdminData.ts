import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function useAdminData(token: string | null, activeTab: 'users' | 'cursus' | 'logs', refreshKey: number) {
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  
  const [structure, setStructure] = useState<any>(null);

  const loadUsers = useCallback(() => {
    if (!token) return;
    setLoadingUsers(true);
    api.get<any[]>('admin/users', token)
      .then(data => { setUsers(data); setLoadingUsers(false); })
      .catch(err => { console.error(err); setLoadingUsers(false); });
  }, [token]);

  const loadLogs = useCallback(() => {
    if (!token) return;
    setLoadingLogs(true);
    api.get<any[]>('admin/corrections', token)
      .then(data => { setLogs(data); setLoadingLogs(false); })
      .catch(err => { console.error(err); setLoadingLogs(false); });
  }, [token]);

  const loadStructure = useCallback(() => {
    if (!token) return;
    api.get<any>('graph/structure', token)
        .then(setStructure)
        .catch(console.error);
  }, [token]);

  // Effects to load data based on active tab
  useEffect(() => {
    if (activeTab === 'users') loadUsers();
  }, [activeTab, loadUsers]);

  useEffect(() => {
    if (activeTab === 'logs') loadLogs();
  }, [activeTab, loadLogs]);

  useEffect(() => {
    if (activeTab === 'cursus') loadStructure();
  }, [activeTab, loadStructure, refreshKey]);

  return {
    users,
    loadingUsers,
    logs,
    loadingLogs,
    structure,
    setStructure // Exposed in case we need optimistic updates, though refreshKey usually handles it
  };
}
