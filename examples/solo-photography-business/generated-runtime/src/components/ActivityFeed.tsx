
import { ActivityLog } from '../../types/runtime-types';
import { formatDistanceToNow } from 'date-fns';

interface ActivityFeedProps {
  activities: ActivityLog[];
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">
        No recent activity
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full mt-2" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900">
              {activity.action}
            </p>
            <p className="text-xs text-gray-500">
              {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
