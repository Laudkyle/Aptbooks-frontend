import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle, Circle, RefreshCw, Mail, MailOpen, ChevronDown } from 'lucide-react';
import { useApi } from '../../../shared/hooks/useApi.js';
import { makeNotificationsApi } from '../api/notifications.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Table, THead, TBody, TH, TD } from '../../../shared/components/ui/Table.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Pagination } from '../../../shared/components/ui/Pagination.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

function toRows(payload) {
  if (!payload) return { rows: [], paging: null };
  if (Array.isArray(payload)) return { rows: payload, paging: null };
  if (Array.isArray(payload.data)) return { rows: payload.data, paging: payload.paging ?? null };
  if (Array.isArray(payload.notifications)) return { rows: payload.notifications, paging: payload.paging ?? null };
  // Unknown service-defined shape; show raw as a single row
  return { rows: [{ id: 'payload', raw: payload }], paging: null };
}

export default function NotificationCenter() {
  const { http } = useApi();
  const api = useMemo(() => makeNotificationsApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(() => new Set());

  const listQuery = useQuery({
    queryKey: ['notifications', limit, offset],
    queryFn: () => api.list({ limit, offset }),
    staleTime: 5_000
  });

  const { rows, paging } = toRows(listQuery.data);
  const unreadCount = rows.filter(n => {
    const status = n.read_at ? 'read' : n.status ?? (n.is_read ? 'read' : 'unread');
    return status === 'unread';
  }).length;

  const markOne = useMutation({
    mutationFn: (id) => api.markRead(id),
    onSuccess: () => {
      toast.success('Notification marked as read.');
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (e) => toast.error(e.message ?? 'Failed to mark read')
  });

  const bulk = useMutation({
    mutationFn: (ids) => api.bulkMarkRead(ids),
    onSuccess: () => {
      toast.success('Notifications marked as read.');
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (e) => toast.error(e.message ?? 'Failed to bulk mark read')
  });

  const toggleAll = () => {
    if (selected.size === rows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map(n => n.id ?? n.notification_id ?? n.uuid ?? 'unknown')));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Bell className="h-7 w-7 text-gray-700" />
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-600">
            Stay updated with important messages and alerts
          </p>
        </div>

        {/* Action Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                size="sm"
                disabled={selected.size === 0 || bulk.isLoading}
                onClick={() => bulk.mutate(Array.from(selected))}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <MailOpen className="h-4 w-4 mr-2" />
                Mark {selected.size > 0 ? `${selected.size}` : ''} as Read
              </Button>
              
              {selected.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelected(new Set())}
                  className="text-gray-600"
                >
                  Clear selection
                </Button>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => qc.invalidateQueries({ queryKey: ['notifications'] })}
              className="border-gray-300"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {listQuery.isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin h-8 w-8 border-3 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-sm text-gray-600">Loading notifications...</p>
            </div>
          ) : listQuery.isError ? (
            <div className="p-12 text-center">
              <div className="bg-red-50 rounded-lg p-6 max-w-md mx-auto">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-red-800 mb-1">Failed to load</h3>
                    <p className="text-sm text-red-700">{listQuery.error?.message ?? 'Unable to load notifications.'}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
              <p className="text-sm text-gray-500">You don't have any notifications</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selected.size === rows.length && rows.length > 0}
                          onChange={toggleAll}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Message
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {rows.map((n) => {
                      const id = n.id ?? n.notification_id ?? n.uuid ?? 'unknown';
                      const isSelected = selected.has(id);
                      const status = n.read_at ? 'read' : n.status ?? (n.is_read ? 'read' : 'unread');
                      const isUnread = status === 'unread';
                      
                      return (
                        <tr 
                          key={id}
                          className={`hover:bg-gray-50 transition-colors ${isUnread ? 'bg-blue-50/30' : ''}`}
                        >
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                setSelected((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(id);
                                  else next.delete(id);
                                  return next;
                                });
                              }}
                              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {isUnread ? (
                                <Circle className="h-4 w-4 text-blue-600 fill-blue-600" />
                              ) : (
                                <CheckCircle className="h-4 w-4 text-gray-400" />
                              )}
                              <span className={`text-xs font-medium ${isUnread ? 'text-blue-700' : 'text-gray-500'}`}>
                                {isUnread ? 'New' : 'Read'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {n.type ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {n.type}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className={`text-sm ${isUnread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                              {n.title ?? n.message ?? n.subject ?? 'No message'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs text-gray-500">
                              {id.length > 12 ? `${id.substring(0, 12)}...` : id}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={id === 'payload' || markOne.isLoading || !isUnread}
                              onClick={() => markOne.mutate(id)}
                              className="text-green-700 hover:text-green-800 hover:bg-green-50"
                            >
                              <MailOpen className="h-4 w-4 mr-1" />
                              Mark read
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <Pagination
                  limit={paging?.limit ?? limit}
                  offset={paging?.offset ?? offset}
                  total={paging?.total ?? null}
                  onChange={({ limit: l, offset: o }) => {
                    if (l !== limit) setLimit(l);
                    setOffset(o);
                  }}
                />
              </div>

              {/* Raw Payload Debug */}
              <details className="border-t border-gray-200">
                <summary className="px-6 py-4 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ChevronDown className="h-4 w-4" />
                    Developer: View Raw Payload
                  </span>
                </summary>
                <div className="px-6 py-4 bg-gray-900 border-t border-gray-200">
                  <pre className="text-xs text-green-400 overflow-auto max-h-96 font-mono">
                    {JSON.stringify(listQuery.data, null, 2)}
                  </pre>
                </div>
              </details>
            </>
          )}
        </div>
      </div>
    </div>
  );
}