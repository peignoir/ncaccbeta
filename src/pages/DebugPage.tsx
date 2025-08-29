import { useState, useEffect } from 'react';
import ApiConfigManager from '../lib/apiConfig';
import socapApi from '../lib/socapApi';
import unifiedApi from '../lib/unifiedApi';

interface UserData {
  npid?: number;
  name?: string;
  username?: string;
  telegram_id?: string | number;
  email?: string;
  startup_name?: string;
  event_name?: string;
  [key: string]: any;
}

export default function DebugPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiMode] = useState(ApiConfigManager.getMode());
  const [rawApiResponse, setRawApiResponse] = useState<any>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (apiMode === 'real') {
        // Get raw data from Socap API
        const [profile, events] = await Promise.all([
          socapApi.getProfile().catch(err => ({ error: err.message })),
          socapApi.getEventList().catch(err => [])
        ]);
        
        setRawApiResponse({
          profile,
          events,
          timestamp: new Date().toISOString()
        });
        
        // Transform for display
        const transformedUsers = events.map((event: any, idx: number) => ({
          npid: 1000 + idx,
          name: event.contact?.name || 'Unknown',
          username: event.contact?.name || 'Unknown',
          telegram_id: event.contact?.telegram_id || event.contact?.telegram_username || '',
          email: event.contact?.email || `user${1000 + idx}@example.com`,
          startup_name: event.data?.details?.startup_name || event.data?.event_name || 'Unknown',
          event_name: event.data?.event_name || 'Unknown',
          website: event.data?.details?.website || '',
          linkedin: event.data?.details?.founder_linkedin_url || '',
          progress: event.data?.percent || 0,
          graduated: event.data?.is_graduated || false,
          raw: event
        }));
        
        setUsers(transformedUsers);
      } else {
        // Get data from mock API
        const response = await unifiedApi.getStartups();
        const data = response.data || [];
        setRawApiResponse({
          source: 'mock',
          data,
          timestamp: new Date().toISOString()
        });
        setUsers(data);
      }
    } catch (err) {
      console.error('[DebugPage] Error loading users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const getUserDisplayName = (user: UserData): string => {
    return user.name || user.username || `User ${user.npid || 'Unknown'}`;
  };

  const getUserIdentifier = (user: UserData): string => {
    if (user.telegram_id) {
      return `Telegram: ${user.telegram_id}`;
    }
    if (user.npid) {
      return `NPID: ${user.npid}`;
    }
    return 'No ID';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Debug Panel</h1>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="px-2 py-1 bg-gray-100 rounded">
            API Mode: <span className="font-mono">{apiMode}</span>
          </span>
          <span className="px-2 py-1 bg-gray-100 rounded">
            Users: {users.length}
          </span>
          {apiMode === 'real' && (
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
              Connected to Socap.dev
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Loading users...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Users List */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Users List</h2>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {users.map((user, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedUser(user)}
                  className={`w-full p-3 text-left hover:bg-gray-50 border-b transition ${
                    selectedUser === user ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="font-medium">{getUserDisplayName(user)}</div>
                  <div className="text-sm text-gray-500">{getUserIdentifier(user)}</div>
                  {user.startup_name && (
                    <div className="text-xs text-gray-400 mt-1">
                      {user.startup_name}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* User Details / Raw JSON */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b">
              <h2 className="font-semibold">
                {selectedUser ? `Details: ${getUserDisplayName(selectedUser)}` : 'Select a user'}
              </h2>
            </div>
            <div className="p-4">
              {selectedUser ? (
                <div>
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">Parsed Data</h3>
                    <div className="space-y-1 text-sm">
                      {Object.entries(selectedUser).map(([key, value]) => {
                        if (key === 'raw') return null;
                        return (
                          <div key={key} className="flex">
                            <span className="font-mono text-gray-500 w-32">{key}:</span>
                            <span className="font-mono">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">Raw JSON</h3>
                    <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                      {JSON.stringify(selectedUser.raw || selectedUser, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-center py-8">
                  Select a user to view details
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Raw API Response */}
      {rawApiResponse && (
        <div className="mt-6 bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Raw API Response</h2>
          </div>
          <div className="p-4">
            <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto max-h-96">
              {JSON.stringify(rawApiResponse, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}