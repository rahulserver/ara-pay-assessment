#!/bin/sh
# Clears only events and notifications — leaves rules intact
# Usage: npm run db:clean:feed

MONGO_URI="${MONGO_URI:-mongodb://root:root@localhost:27018/webhookpulse?authSource=admin}"

mongosh "$MONGO_URI" --quiet << 'EOF'
db.events.deleteMany({});
db.notifications.deleteMany({});
print("✓ Cleared: events, notifications");
EOF
