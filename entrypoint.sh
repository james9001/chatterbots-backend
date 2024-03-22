#!/bin/sh

if ls /data/app.db
then
    echo "Database detected!"
    npx prisma migrate deploy
else
    npx prisma migrate dev --name init
fi

npm start
