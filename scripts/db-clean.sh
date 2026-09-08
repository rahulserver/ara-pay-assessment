#!/bin/sh
# Clears all collections: events, notifications, rules
# Usage: npm run db:clean

MONGO_URI="${MONGO_URI:-mongodb://root:root@localhost:27018/webhookpulse?authSource=admin}"

mongosh "$MONGO_URI" --quiet << 'EOF'
db.events.deleteMany({});
db.notifications.deleteMany({});
db.rules.deleteMany({});
print("✓ Cleared: events, notifications, rules");
EOF
