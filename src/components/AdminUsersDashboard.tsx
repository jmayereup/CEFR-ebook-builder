import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Database,
  Flag,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
  Unlock,
  Users,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import {
  fetchCopyrightFlaggedStories,
  fetchPendingDeletionFlags,
  resolveDeletionFlag,
  setStoryCopyrightFlag,
} from '../services/db';
import { pb } from '../services/pocketbase';
import type { DeletionFlag, Story } from '../types';

interface DashboardUser {
  userId: string;
  email: string;
  displayName: string;
  photoURL: string;
  canGenerate: boolean;
  isPaid?: boolean;
  isAdmin?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

interface AdminUsersDashboardProps {
  isAdmin: boolean;
  onShowAlert?: (
    title: string,
    message: string,
    type?: 'info' | 'error' | 'warning',
  ) => void;
  onRefreshCache?: () => void;
}

export default function AdminUsersDashboard({
  isAdmin,
  onShowAlert,
  onRefreshCache,
}: AdminUsersDashboardProps) {
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isResettingCache, setIsResettingCache] = useState(false);

  // Tab and Logs / Flags state
  const [activeTab, setActiveTab] = useState<
    'users' | 'logs' | 'flags' | 'copyright'
  >('users');
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [logsSearchQuery, setLogsSearchQuery] = useState('');
  const [selectedActionFilter, setSelectedActionFilter] = useState('All');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Deletion Flags State
  const [deletionFlags, setDeletionFlags] = useState<DeletionFlag[]>([]);
  const [loadingFlags, setLoadingFlags] = useState(false);

  // Copyright Flagged Stories State
  const [copyrightStories, setCopyrightStories] = useState<Story[]>([]);
  const [loadingCopyright, setLoadingCopyright] = useState(false);
  const [updatingCopyrightId, setUpdatingCopyrightId] = useState<string | null>(
    null,
  );

  const fetchCopyrightStories = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingCopyright(true);
    try {
      const list = await fetchCopyrightFlaggedStories();
      setCopyrightStories(list);
    } catch (err) {
      console.error('Failed to load copyright-flagged stories:', err);
    } finally {
      setLoadingCopyright(false);
    }
  }, [isAdmin]);

  const handleUnflagStory = async (story: Story) => {
    if (
      !confirm(
        `Clear the copyright flag on "${story.title}"? The story will remain private until its owner publishes it again.`,
      )
    ) {
      return;
    }
    setUpdatingCopyrightId(story.id);
    try {
      await setStoryCopyrightFlag(story.id, false);
      if (onRefreshCache) onRefreshCache();
      await fetchCopyrightStories();
      if (onShowAlert) {
        onShowAlert(
          'Copyright Flag Cleared',
          `Story "${story.title}" is no longer restricted.`,
          'info',
        );
      }
    } catch (err: any) {
      console.error('Error unflagging story:', err);
      if (onShowAlert) {
        onShowAlert(
          'Unflag Failed',
          'Failed to clear the copyright flag. Check server logs.',
          'error',
        );
      }
    } finally {
      setUpdatingCopyrightId(null);
    }
  };

  const fetchFlags = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingFlags(true);
    try {
      const pending = await fetchPendingDeletionFlags();
      setDeletionFlags(pending);
    } catch (err) {
      console.error('Failed to load pending deletion flags:', err);
    } finally {
      setLoadingFlags(false);
    }
  }, [isAdmin]);

  const handleResolveFlag = async (
    flag: DeletionFlag,
    action: 'approved' | 'dismissed',
  ) => {
    if (
      action === 'approved' &&
      !confirm(
        `Are you sure you want to approve deletion for story "${flag.storyTitle}"? This will permanently delete the story from the database.`,
      )
    ) {
      return;
    }

    try {
      await resolveDeletionFlag(flag.id || '', action, flag.storyId);
      if (onShowAlert) {
        onShowAlert(
          action === 'approved' ? 'Story Deleted' : 'Flag Dismissed',
          action === 'approved'
            ? `Story "${flag.storyTitle}" has been deleted.`
            : `Flag for "${flag.storyTitle}" has been dismissed.`,
          'info',
        );
      }
      fetchFlags();
    } catch (err: any) {
      console.error('Error resolving flag:', err);
      if (onShowAlert) {
        onShowAlert('Action Failed', 'Failed to update story flag.', 'error');
      }
    }
  };

  const fetchLogs = useCallback(async () => {
    if (!isAdmin) {
      return;
    }
    setLoadingLogs(true);
    setLogsError(null);
    try {
      const records = await pb.collection('generation_logs').getList(1, 100, {
        sort: '-timestamp',
      });
      setLogs(records.items.map((r: any) => ({ id: r.id, ...r })));
    } catch (err: any) {
      console.error('Failed to load generation logs:', err);
      setLogsError(
        'Failed to load error logs. Ensure you are signed in as an admin.',
      );
    } finally {
      setLoadingLogs(false);
    }
  }, [isAdmin]);

  const handleResetCache = async () => {
    if (
      !confirm(
        'Are you sure you want to force reload the metadata cache? This will re-fetch all public stories from PocketBase.',
      )
    ) {
      return;
    }
    setIsResettingCache(true);
    try {
      const response = await fetch(
        '/api/stories/metadata?refresh=true&forceAll=true',
      );
      if (!response.ok) {
        throw new Error('Failed to reset metadata cache');
      }
      if (onRefreshCache) {
        onRefreshCache();
      }
      if (onShowAlert) {
        onShowAlert(
          'Cache Reset Successful',
          'Successfully re-fetched all public stories and rebuilt the server cache.',
          'info',
        );
      } else {
        alert(
          'Successfully re-fetched all public stories and rebuilt the server cache.',
        );
      }
    } catch (err) {
      console.error('Failed to reset metadata cache:', err);
      if (onShowAlert) {
        onShowAlert(
          'Cache Reset Failed',
          'Failed to reload server metadata cache. Check server logs.',
          'error',
        );
      } else {
        alert('Failed to reload server metadata cache.');
      }
    } finally {
      setIsResettingCache(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    } else if (activeTab === 'flags') {
      fetchFlags();
    } else if (activeTab === 'copyright') {
      fetchCopyrightStories();
    }
  }, [activeTab, fetchLogs, fetchFlags, fetchCopyrightStories]);

  const filteredLogs = logs.filter((log) => {
    const search = logsSearchQuery.toLowerCase();
    const matchesSearch =
      (log.userEmail || '').toLowerCase().includes(search) ||
      (log.model || '').toLowerCase().includes(search) ||
      (log.action || '').toLowerCase().includes(search) ||
      (log.errorMessage || '').toLowerCase().includes(search);

    const matchesAction =
      selectedActionFilter === 'All' || log.action === selectedActionFilter;

    return matchesSearch && matchesAction;
  });

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case 'generate-outline':
        return 'bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-950/30';
      case 'generate-batch':
      case 'generate-chapter':
        return 'bg-purple-50 dark:bg-purple-955/20 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-955/30';
      case 'generate-glossary':
        return 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-950/30';
      case 'update-bible':
      case 'run-audit':
      case 'analyze-tone':
        return 'bg-amber-50 dark:bg-amber-955/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-955/30';
      case 'translate':
      case 'translate-fallback':
        return 'bg-blue-50 dark:bg-blue-955/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-955/30';
      default:
        return 'bg-slate-50 dark:bg-slate-900/20 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-900/30';
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      setErrorMsg(
        'Permission denied or failed to load users. Ensure you are signed in as an admin.',
      );
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const fetchAllUsers = async () => {
      try {
        const records = await pb.collection('users').getFullList({
          sort: 'email',
        });
        const usersList = records.map((r: any) => ({
          userId: r.id,
          email: r.email,
          displayName: r.name || '',
          photoURL: r.photoUrl || '',
          isPaid: r.isPaid === true,
          isAdmin: r.isAdmin === true,
          canGenerate: r.canGenerate !== false,
          createdAt: r.created,
          updatedAt: r.updated,
        }));
        // Sort users: admins first, then by email
        usersList.sort((a, b) => {
          if (a.isAdmin && !b.isAdmin) return -1;
          if (!a.isAdmin && b.isAdmin) return 1;
          return (a.email || '').localeCompare(b.email || '');
        });
        setUsers(usersList);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load user profiles from PocketBase:', error);
        setErrorMsg(
          'Permission denied or failed to load users from PocketBase.',
        );
        setLoading(false);
      }
    };

    fetchAllUsers();

    // Subscribe to real-time updates
    try {
      pb.collection('users')
        .subscribe('*', () => {
          fetchAllUsers();
        })
        .catch(() => {});
    } catch {}

    return () => {
      try {
        pb.collection('users')
          .unsubscribe('*')
          .catch(() => {});
      } catch {}
    };
  }, [isAdmin]);

  const handleTogglePaidStatus = async (targetUser: DashboardUser) => {
    if (targetUser.isAdmin) return;

    setUpdatingId(targetUser.userId);
    try {
      await pb.collection('users').update(targetUser.userId, {
        isPaid: !targetUser.isPaid,
      });
    } catch (error) {
      console.error('Failed to update paid tier status:', error);
      if (onShowAlert) {
        onShowAlert(
          'Paid Status Update Failed',
          'Could not update paid status. Write operation failed.',
          'error',
        );
      } else {
        alert('Could not update paid status. Write operation failed.');
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = searchQuery.toLowerCase();
    return (
      (u.email || '').toLowerCase().includes(term) ||
      (u.displayName || '').toLowerCase().includes(term)
    );
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-tj-bg-card p-6 rounded-2xl shadow-xl border border-tj-border-main"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-tj-primary-light dark:bg-tj-primary-light/10 text-tj-primary dark:text-tj-primary-hover rounded-xl">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 font-sans tracking-tight">
              Admin Users Dashboard
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Only super-admins have access to toggle Paid status on users and
              view failed AI diagnostics logs.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isResettingCache}
            onClick={handleResetCache}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-tj-primary hover:bg-tj-primary-hover disabled:opacity-50 text-tj-bg-main dark:text-tj-bg-main rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isResettingCache ? 'animate-spin' : ''}`}
            />
            <span>Reset Metadata Cache</span>
          </button>
        </div>
      </div>

      {/* Tab bar for switching between user accounts and failed AI logs */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 mb-6 font-sans text-xs select-none">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 border-b-2 font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'users'
              ? 'border-tj-primary text-tj-primary font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Learner Accounts</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('flags')}
          className={`px-4 py-2.5 border-b-2 font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'flags'
              ? 'border-tj-primary text-tj-primary font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          <Flag className="w-4 h-4" />
          <span>Flagged Stories</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('copyright')}
          className={`px-4 py-2.5 border-b-2 font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'copyright'
              ? 'border-tj-primary text-tj-primary font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Copyright Guard ({copyrightStories.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('flags')}
          className={`px-4 py-2.5 border-b-2 font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'flags'
              ? 'border-tj-primary text-tj-primary font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          <Flag className="w-4 h-4" />
          <span>Flagged Stories</span>
          {deletionFlags.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full">
              {deletionFlags.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'users' ? (
        <>
          {/* User Accounts Search input bar */}
          <div className="flex justify-end mb-4">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search learners by name/email"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-tj-primary transition-colors"
              />
            </div>
          </div>

          {errorMsg ? (
            <div className="bg-rose-50 dark:bg-rose-955/10 border border-rose-100 dark:border-rose-955/20 p-4 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-tj-primary" />
              <span className="text-xs font-medium">
                Syncing register roster...
              </span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-50/50 dark:bg-slate-900/10 rounded-xl border border-dashed border-slate-100 dark:border-slate-800">
              <p className="text-sm font-medium">No learners found</p>
              <p className="text-xs text-slate-400 mt-1">
                Users appear here on their very first secure Google login.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-800">
                    <th className="p-4">User</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Tier Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.map((user) => {
                    const isAdminUser = user.isAdmin === true;
                    const isUpdating = updatingId === user.userId;

                    return (
                      <tr
                        key={user.userId}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-900/5 transition-colors text-slate-700 dark:text-slate-300"
                      >
                        <td className="p-4 font-semibold flex items-center gap-2.5">
                          <img
                            src={
                              user.photoURL ||
                              `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName}`
                            }
                            alt={user.displayName}
                            referrerPolicy="no-referrer"
                            className="w-7 h-7 rounded-full bg-slate-100 shrink-0"
                          />
                          <span>{user.displayName || 'Unnamed Learner'}</span>
                        </td>
                        <td className="p-4 font-mono select-all text-slate-500 dark:text-slate-400">
                          {user.email}
                        </td>
                        <td className="p-4">
                          {isAdminUser ? (
                            <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-955/20 text-amber-700 dark:text-amber-400 font-bold px-2 py-0.5 rounded text-[10px]">
                              Super Admin
                            </span>
                          ) : (
                            <span className="inline-block text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400 font-medium">
                              Learner
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {user.isPaid ? (
                            <span className="inline-flex items-center gap-1 text-tj-primary dark:text-tj-primary-hover font-bold">
                              <Check className="w-3.5 h-3.5" />
                              <span>Paid Tier</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500 font-medium">
                              <X className="w-3.5 h-3.5" />
                              <span>Free Tier</span>
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {isAdminUser ? (
                            <span className="text-[10px] text-slate-400 italic">
                              Unmutable
                            </span>
                          ) : (
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleTogglePaidStatus(user)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                                  user.isPaid
                                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-955/10 dark:text-rose-455'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-955/10 dark:text-emerald-455'
                                }`}
                              >
                                {isUpdating
                                  ? '...'
                                  : user.isPaid
                                    ? 'Make Free'
                                    : 'Make Paid'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : activeTab === 'logs' ? (
        <>
          {/* Logs Tab: search & filter controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 font-sans text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Action Dropdown Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Action:
                </span>
                <select
                  value={selectedActionFilter}
                  onChange={(e) => setSelectedActionFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-tj-primary transition-colors cursor-pointer"
                >
                  <option value="All">All Actions</option>
                  <option value="generate-outline">generate-outline</option>
                  <option value="generate-batch">generate-batch</option>
                  <option value="generate-chapter">generate-chapter</option>
                  <option value="generate-glossary">generate-glossary</option>
                  <option value="update-bible">update-bible</option>
                  <option value="run-audit">run-audit</option>
                  <option value="analyze-tone">analyze-tone</option>
                  <option value="translate">translate</option>
                  <option value="translate-fallback">translate-fallback</option>
                </select>
              </div>

              {/* Refresh Logs Button */}
              <button
                type="button"
                onClick={fetchLogs}
                disabled={loadingLogs}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-bold cursor-pointer transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`}
                />
                <span>Refresh Logs</span>
              </button>
            </div>

            {/* Logs Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search logs by email, model, error..."
                value={logsSearchQuery}
                onChange={(e) => setLogsSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-tj-primary transition-colors"
              />
            </div>
          </div>

          {logsError ? (
            <div className="bg-rose-50 dark:bg-rose-955/10 border border-rose-100 dark:border-rose-955/20 p-4 rounded-xl text-rose-600 dark:text-rose-455 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{logsError}</span>
            </div>
          ) : loadingLogs ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-tj-primary" />
              <span className="text-xs font-medium">
                Loading failed AI logs...
              </span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-50/50 dark:bg-slate-900/10 rounded-xl border border-dashed border-slate-100 dark:border-slate-850">
              <p className="text-sm font-medium">
                No failed AI operations found
              </p>
              <p className="text-xs text-slate-400 mt-1">
                All generation parameters are running successfully.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-800">
                    <th className="p-3 w-8"></th>
                    <th className="p-3 w-40">Time</th>
                    <th className="p-3 w-44">User Email</th>
                    <th className="p-3 w-36">Action</th>
                    <th className="p-3 w-48">Model</th>
                    <th className="p-3 w-20">Duration</th>
                    <th className="p-3">Error Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    const dateStr = new Date(log.timestamp).toLocaleString();
                    const shortError =
                      log.errorMessage && log.errorMessage.length > 50
                        ? `${log.errorMessage.substring(0, 50)}...`
                        : log.errorMessage || 'Unknown Error';

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-900/5 transition-colors text-slate-700 dark:text-slate-300"
                      >
                        <td colSpan={7} className="p-0">
                          {/* biome-ignore lint/a11y/useSemanticElements: log row contains complex tables and layout and must be a div */}
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() =>
                              setExpandedLogId(isExpanded ? null : log.id)
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setExpandedLogId(isExpanded ? null : log.id);
                              } else if (e.key === ' ') {
                                e.preventDefault();
                              }
                            }}
                            onKeyUp={(e) => {
                              if (e.key === ' ') {
                                setExpandedLogId(isExpanded ? null : log.id);
                              }
                            }}
                            className="flex items-center w-full cursor-pointer py-3 hover:bg-slate-50/20 dark:hover:bg-slate-900/10 focus-visible:outline-none focus-visible:bg-slate-50/40 dark:focus-visible:bg-slate-900/20 rounded"
                          >
                            <div className="w-8 text-center text-slate-400 shrink-0">
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 inline" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 inline" />
                              )}
                            </div>
                            <div className="w-40 font-mono text-[11px] text-slate-500 dark:text-slate-400 px-3 shrink-0">
                              {dateStr}
                            </div>
                            <div className="w-44 font-mono text-slate-600 dark:text-slate-400 font-semibold select-all px-3 shrink-0 truncate">
                              {log.userEmail || 'anonymous'}
                            </div>
                            <div className="w-36 px-3 shrink-0">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${getActionBadgeClass(log.action)}`}
                              >
                                {log.action}
                              </span>
                            </div>
                            <div
                              className="w-48 text-slate-500 dark:text-slate-400 font-mono text-[10px] truncate px-3 shrink-0"
                              title={log.model}
                            >
                              {log.model}
                            </div>
                            <div className="w-20 font-mono text-slate-500 dark:text-slate-400 px-3 shrink-0">
                              {(log.duration / 1000).toFixed(2)}s
                            </div>
                            <div className="flex-1 text-rose-600 dark:text-rose-400 font-medium font-mono text-[11px] px-3 truncate flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              <span>{shortError}</span>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="bg-slate-50/70 dark:bg-slate-900/20 p-4 border-t border-slate-100 dark:border-slate-800">
                              <div className="space-y-3 font-sans text-xs text-slate-700 dark:text-slate-300 text-left">
                                <div className="p-3 bg-red-500/5 dark:bg-red-500/10 border border-red-500/10 dark:border-red-500/20 rounded-xl">
                                  <h4 className="text-[10px] font-mono uppercase font-bold text-rose-500 dark:text-rose-400 tracking-wider mb-1">
                                    Raw Error Details
                                  </h4>
                                  <pre className="font-mono text-rose-600 dark:text-rose-400 whitespace-pre-wrap break-all text-[11px] leading-relaxed select-text">
                                    {log.errorMessage ||
                                      'No error message specified.'}
                                  </pre>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-100/40 dark:bg-slate-900/40 p-3 rounded-xl">
                                  <div>
                                    <span className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-wider block">
                                      User Identity ID
                                    </span>
                                    <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 select-all">
                                      {log.userId || 'anonymous'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-wider block">
                                      Prompt Character Length
                                    </span>
                                    <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                      {log.promptLength ?? 'N/A'} chars
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-wider block">
                                      Exact Failure Timestamp
                                    </span>
                                    <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 select-all">
                                      {log.timestamp}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : activeTab === 'flags' ? (
        <>
          {/* Flagged Stories Tab View */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-tj-text-main uppercase tracking-wider">
              Pending Story Deletion Flags ({deletionFlags.length})
            </h3>
            <button
              type="button"
              onClick={fetchFlags}
              disabled={loadingFlags}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loadingFlags ? 'animate-spin' : ''}`}
              />
              <span>Refresh Flags</span>
            </button>
          </div>

          {loadingFlags ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-tj-primary" />
              <span className="text-xs font-medium">
                Loading pending story flags...
              </span>
            </div>
          ) : deletionFlags.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-50/50 dark:bg-slate-900/10 rounded-xl border border-dashed border-slate-100 dark:border-slate-800">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
              <p className="text-sm font-medium">No pending story flags</p>
              <p className="text-xs text-slate-400 mt-1">
                All story deletion requests have been reviewed and resolved.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {deletionFlags.map((flag) => (
                <div
                  key={flag.id}
                  className="p-4 bg-tj-bg-recessed border border-tj-border-main rounded-xl space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-tj-border-main/50 pb-2">
                    <div>
                      <span className="text-xs font-mono text-tj-text-muted uppercase block">
                        Story Flagged:
                      </span>
                      <span className="text-sm font-bold text-tj-text-main font-serif">
                        {flag.storyTitle}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                        ID: {flag.storyId}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30">
                        {flag.reason}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(flag.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Comment / Reason Details */}
                  <div className="bg-white/60 dark:bg-black/20 p-3 rounded-lg border border-tj-border-main/40 text-xs">
                    <p className="text-[10px] font-mono font-bold text-tj-text-muted uppercase mb-1">
                      Flagger Comment ({flag.flaggerEmail}):
                    </p>
                    <p className="text-tj-text-main leading-relaxed font-sans">
                      "{flag.comment}"
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleResolveFlag(flag, 'dismissed')}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                    >
                      Dismiss Flag
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResolveFlag(flag, 'approved')}
                      className="px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Approve & Delete Story</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Copyright Guard Tab View */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-tj-text-main uppercase tracking-wider">
              Copyright-Flagged Stories ({copyrightStories.length})
            </h3>
            <button
              type="button"
              onClick={fetchCopyrightStories}
              disabled={loadingCopyright}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loadingCopyright ? 'animate-spin' : ''}`}
              />
              <span>Refresh</span>
            </button>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 mb-4">
            <p className="font-bold mb-1">How Copyright Guard works</p>
            <p className="leading-relaxed">
              These stories were flagged as likely referencing copyrighted
              material (fan fiction, established franchises, etc.). They are
              forced private, excluded from the public library, and have their
              site branding stripped from exports. Unflag only after confirming
              the story does not infringe — the owner will be able to publish it
              again.
            </p>
          </div>

          {loadingCopyright ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-tj-primary" />
              <span className="text-xs font-medium">
                Loading copyright-flagged stories...
              </span>
            </div>
          ) : copyrightStories.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-50/50 dark:bg-slate-900/10 rounded-xl border border-dashed border-slate-100 dark:border-slate-800">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
              <p className="text-sm font-medium">
                No copyright-flagged stories
              </p>
              <p className="text-xs text-slate-400 mt-1">
                All stories are clear. New flags will appear here as they are
                detected.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {copyrightStories.map((story) => (
                <div
                  key={story.id}
                  className="p-4 bg-tj-bg-recessed border border-amber-300/40 dark:border-amber-900/40 rounded-xl space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-tj-border-main/50 pb-2">
                    <div className="min-w-0">
                      <span className="text-xs font-mono text-tj-text-muted uppercase block">
                        Restricted Story
                      </span>
                      <span className="text-sm font-bold text-tj-text-main font-serif truncate block">
                        {story.title}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 block mt-0.5 truncate">
                        ID: {story.id} · Creator: {story.creatorId}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/30">
                        {story.copyrightFlagSource || 'ai'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {story.copyrightFlaggedAt
                          ? new Date(
                              story.copyrightFlaggedAt,
                            ).toLocaleDateString()
                          : ''}
                      </span>
                    </div>
                  </div>

                  {story.copyrightFlagReason && (
                    <div className="bg-white/60 dark:bg-black/20 p-3 rounded-lg border border-tj-border-main/40 text-xs">
                      <p className="text-[10px] font-mono font-bold text-tj-text-muted uppercase mb-1">
                        Reason
                      </p>
                      <p className="text-tj-text-main leading-relaxed font-sans">
                        {story.copyrightFlagReason}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleUnflagStory(story)}
                      disabled={updatingCopyrightId === story.id}
                      className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>
                        {updatingCopyrightId === story.id
                          ? 'Clearing...'
                          : 'Clear Flag (Unblock Public)'}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
